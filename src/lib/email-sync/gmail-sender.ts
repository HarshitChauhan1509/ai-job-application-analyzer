import { isGoogleOAuthConfigured, refreshGoogleAccessToken } from "./google-oauth";

export interface SendGmailOptions {
  accessToken: string;
  refreshToken?: string;
  fromEmail: string;
  to: string;
  subject: string;
  body: string;
  candidateName?: string;
  replyTo?: string;
}

export interface SendGmailResult {
  success: boolean;
  messageId?: string;
  threadId?: string;
  sentFrom?: string;
  isSimulated?: boolean;
  error?: string;
  refreshedAccessToken?: string;
}

/**
 * Builds an RFC 2822 compliant email message and encodes it to base64url format required by Gmail API.
 */
export function buildRfc2822Raw(options: {
  fromEmail: string;
  to: string;
  subject: string;
  body: string;
  candidateName?: string;
  replyTo?: string;
}): string {
  const fromHeader = options.candidateName
    ? `"${options.candidateName.replace(/"/g, "")}" <${options.fromEmail}>`
    : options.fromEmail;

  // Encode subject in UTF-8 Base64 per RFC 2047
  const encodedSubject = `=?UTF-8?B?${Buffer.from(options.subject, "utf-8").toString("base64")}?=`;

  const headers = [
    `From: ${fromHeader}`,
    `To: ${options.to.trim()}`,
    options.replyTo ? `Reply-To: ${options.replyTo}` : null,
    `Subject: ${encodedSubject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${Date.now()}.${Math.random().toString(36).substring(2)}@careerpilot.mail>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8; format=flowed",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(options.body, "utf-8").toString("base64"),
  ]
    .filter((line) => line !== null)
    .join("\r\n");

  // Gmail API requires base64url encoding (RFC 4648 §5)
  return Buffer.from(headers, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Dispatches an email message directly from the candidate's connected Gmail inbox.
 */
export async function sendGmailMessage(
  options: SendGmailOptions
): Promise<SendGmailResult> {
  const { accessToken, refreshToken, fromEmail, to, subject, body, candidateName, replyTo } = options;

  if (!to || !to.includes("@")) {
    return { success: false, error: "Invalid recipient email address" };
  }

  if (!subject.trim()) {
    return { success: false, error: "Email subject cannot be empty" };
  }

  if (!body.trim()) {
    return { success: false, error: "Email body cannot be empty" };
  }

  // Developer Simulator / Mock Mode
  if (accessToken.startsWith("mock_") || !isGoogleOAuthConfigured()) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return {
      success: true,
      messageId: `mock_msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      threadId: `mock_thread_${Date.now()}`,
      sentFrom: fromEmail || "candidate.demo@gmail.com",
      isSimulated: true,
    };
  }

  const raw = buildRfc2822Raw({
    fromEmail,
    to,
    subject,
    body,
    candidateName,
    replyTo,
  });

  let currentToken = accessToken;
  let refreshedToken: string | undefined;

  let response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${currentToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  // Handle Token Expiry (401) with Auto-Refresh
  if (response.status === 401 && refreshToken) {
    try {
      const refreshed = await refreshGoogleAccessToken(refreshToken);
      currentToken = refreshed.accessToken;
      refreshedToken = refreshed.accessToken;

      response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      });
    } catch (refreshErr) {
      console.error("Token refresh failed during Gmail send:", refreshErr);
      return {
        success: false,
        error: "Gmail authorization expired. Please reconnect your Google account in the Mailbox Sync dialog.",
      };
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gmail send API failed:", response.status, errorText);
    return {
      success: false,
      error: `Gmail delivery failed (${response.status}): ${errorText.substring(0, 150)}`,
    };
  }

  const data = await response.json();
  return {
    success: true,
    messageId: data.id,
    threadId: data.threadId,
    sentFrom: fromEmail,
    refreshedAccessToken: refreshedToken,
    isSimulated: false,
  };
}
