import { prisma } from "@/lib/db";
import { parseApplicationEmail } from "@/lib/ai/email-parser";
import { refreshGoogleAccessToken } from "@/lib/email-sync/google-oauth";
import {
  DiscoveredRecruiterEmail,
  MailboxSyncResult,
} from "@/lib/email-sync/types";

/**
 * Targeted query string to only retrieve job-related recruiter & ATS messages.
 * Respects user privacy by ignoring personal, banking, or unrelated mail.
 */
const GMAIL_JOB_QUERY =
  'subject:(interview OR offer OR "next steps" OR application OR "coding challenge" OR "technical screen" OR "status update") OR from:(greenhouse.io OR lever.co OR ashbyhq.com OR myworkday.com OR smartrecruiters.com)';

/**
 * Realistic recruiter email presets for development/testing without live Google Cloud OAuth credentials.
 */
const MOCK_RECRUITER_MESSAGES = [
  {
    id: `msg_linear_interview_${Date.now()}`,
    sender: "Sarah Jenkins <sjenkins@recruiting.linear.app>",
    subject: "Technical Interview Invitation — Senior Fullstack Engineer at Linear",
    date: new Date(Date.now() - 3600 * 1000 * 3),
    body: `Hi Harshit,\n\nThanks for your patience while our engineering team reviewed your profile! We were very impressed by your experience and would love to invite you to a 45-minute technical screen for the Senior Fullstack Engineer role.\n\nPlease pick a slot on our hiring team's calendar: https://calendly.com/linear/tech-screen\n\nBest,\nSarah Jenkins\nLinear Recruiting`,
  },
  {
    id: `msg_supabase_offer_${Date.now()}`,
    sender: "Alex Rivers <talent@supabase.io>",
    subject: "Supabase Offer Letter & Next Steps — Fullstack Infrastructure",
    date: new Date(Date.now() - 3600 * 1000 * 12),
    body: `Hi Harshit,\n\nFollowing our team deliberations, we are thrilled to extend an official offer of employment for the Fullstack Infrastructure role at Supabase!\n\nAttached is your formal offer letter detailing compensation, equity options, and benefits. Please review and sign before end of week.\n\nWarm regards,\nAlex Rivers\nSupabase Talent Team`,
  },
  {
    id: `msg_vercel_screen_${Date.now()}`,
    sender: "Elena Vance <careers@vercel.com>",
    subject: "Vercel Application Update — Frontend Systems",
    date: new Date(Date.now() - 3600 * 1000 * 24),
    body: `Hi Harshit,\n\nThank you for applying to Vercel! Your application for the Frontend Systems role has been advanced to our Recruiter Screening stage.\n\nCould you please let us know your availability this Thursday or Friday afternoon for a brief 20-minute chat?\n\nElena Vance\nVercel Engineering Recruiting`,
  },
];

/**
 * Scans candidate's connected mailbox, extracts recruiter emails, and syncs statuses.
 */
export async function scanConnectedMailbox(
  userId: string
): Promise<MailboxSyncResult> {
  const connection = await prisma.emailConnection.findUnique({
    where: { userId },
  });

  if (!connection) {
    return {
      success: false,
      error: "No connected mailbox found. Please link your Gmail account first.",
      emailsScanned: 0,
      jobEmailsFound: 0,
      autoUpdatedCount: 0,
      discoveredEmails: [],
    };
  }

  // Set status to SYNCING
  await prisma.emailConnection.update({
    where: { id: connection.id },
    data: { syncStatus: "SYNCING" },
  });

  try {
    const isMock =
      !connection.accessToken ||
      connection.accessToken.startsWith("mock_") ||
      !process.env.GOOGLE_CLIENT_ID;

    let rawMessages: Array<{
      id: string;
      sender: string;
      subject: string;
      date: Date;
      body: string;
    }> = [];

    if (isMock) {
      // Use mock messages for test mode
      rawMessages = MOCK_RECRUITER_MESSAGES;
    } else {
      // Live Gmail API Execution
      let accessToken = connection.accessToken!;

      // Check if access token is expired
      if (connection.expiresAt && connection.expiresAt < new Date()) {
        if (connection.refreshToken) {
          const refreshed = await refreshGoogleAccessToken(connection.refreshToken);
          accessToken = refreshed.accessToken;
          await prisma.emailConnection.update({
            where: { id: connection.id },
            data: {
              accessToken: refreshed.accessToken,
              expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
            },
          });
        }
      }

      // Query Gmail messages list
      const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
        GMAIL_JOB_QUERY
      )}&maxResults=10`;

      const listRes = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!listRes.ok) {
        throw new Error(`Gmail API messages query failed: ${listRes.statusText}`);
      }

      const listData = await listRes.json();
      const messages = listData.messages || [];

      // Fetch individual message bodies
      for (const msg of messages.slice(0, 8)) {
        try {
          const msgRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );

          if (msgRes.ok) {
            const msgData = await msgRes.json();
            const headers = msgData.payload?.headers || [];
            const getHeader = (name: string) =>
              headers.find(
                (h: any) => h.name.toLowerCase() === name.toLowerCase()
              )?.value || "";

            const subject = getHeader("Subject") || "No Subject";
            const sender = getHeader("From") || "Unknown Sender";
            const dateStr = getHeader("Date");
            const date = dateStr ? new Date(dateStr) : new Date();

            // Extract body snippet or text
            let body = msgData.snippet || "";
            if (msgData.payload?.parts) {
              const textPart = msgData.payload.parts.find(
                (p: any) => p.mimeType === "text/plain"
              );
              if (textPart?.body?.data) {
                body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
              }
            }

            rawMessages.push({
              id: msg.id,
              sender,
              subject,
              date,
              body,
            });
          }
        } catch (e) {
          console.warn(`Failed to fetch message ${msg.id}:`, e);
        }
      }
    }

    // Retrieve user's existing applications for matching
    const applications = await prisma.application.findMany({
      where: { userId },
      include: {
        job: true,
      },
    });

    const discoveredEmails: DiscoveredRecruiterEmail[] = [];
    let autoUpdatedCount = 0;

    for (const msg of rawMessages) {
      // 1. Idempotency Guard: skip if already logged
      const existingLog = await prisma.syncedEmailLog.findUnique({
        where: { messageId: msg.id },
      });

      if (existingLog) {
        continue;
      }

      // 2. Parse email content with AI or heuristic engine
      const parsed = await parseApplicationEmail(msg.body);

      // 3. Match against existing applications
      const normalizedTargetCompany = parsed.company.toLowerCase().trim();

      const matchedApp = applications.find((app) => {
        const appCompany = app.job.company.toLowerCase().trim();
        return (
          appCompany.includes(normalizedTargetCompany) ||
          normalizedTargetCompany.includes(appCompany)
        );
      });

      const detectedStage =
        parsed.detectedStatus === "SAVED" ? "APPLIED" : parsed.detectedStatus;

      const statusChangeRequired =
        Boolean(matchedApp) && matchedApp!.status !== detectedStage;

      let actionTaken: "AUTO_UPDATED" | "SUGGESTED" | "IGNORED" = "SUGGESTED";

      // 4. If application matches and status changed, auto-update pipeline
      if (matchedApp && statusChangeRequired) {
        await prisma.application.update({
          where: { id: matchedApp.id },
          data: {
            status: detectedStage,
            notes: matchedApp.notes
              ? `${matchedApp.notes}\n\n[Auto-Synced from Email (${parsed.statusLabel})]: ${parsed.summary}`
              : `[Auto-Synced from Email (${parsed.statusLabel})]: ${parsed.summary}`,
          },
        });

        // Record Application Event
        await prisma.applicationEvent.create({
          data: {
            applicationId: matchedApp.id,
            type: "STATUS_CHANGE",
            description: `Pipeline status automatically synced to ${parsed.statusLabel} via connected mailbox (${msg.subject}).`,
          },
        });

        actionTaken = "AUTO_UPDATED";
        autoUpdatedCount++;
      }

      // 5. Record SyncedEmailLog
      await prisma.syncedEmailLog.create({
        data: {
          userId,
          connectionId: connection.id,
          applicationId: matchedApp ? matchedApp.id : null,
          messageId: msg.id,
          sender: msg.sender,
          subject: msg.subject,
          company: parsed.company,
          role: parsed.role,
          detectedStage,
          actionTaken,
          receivedAt: msg.date,
        },
      });

      discoveredEmails.push({
        messageId: msg.id,
        sender: msg.sender,
        subject: msg.subject,
        receivedAt: msg.date,
        snippet: msg.body.substring(0, 160) + "...",
        parsed: {
          company: parsed.company,
          role: parsed.role,
          detectedStage,
          stageLabel: parsed.statusLabel,
          summary: parsed.summary,
          actionRequired: parsed.actionDetails,
          interviewDate: parsed.interviewDate,
        },
        matchingApplicationId: matchedApp ? matchedApp.id : null,
        matchingCompany: matchedApp ? matchedApp.job.company : null,
        statusChangeRequired,
        actionTaken,
      });
    }

    // Update connection status back to CONNECTED with lastSyncedAt
    await prisma.emailConnection.update({
      where: { id: connection.id },
      data: {
        syncStatus: "CONNECTED",
        lastSyncedAt: new Date(),
        errorMessage: null,
      },
    });

    return {
      success: true,
      message: `Mailbox scan finished. Checked ${rawMessages.length} messages, found ${discoveredEmails.length} recruiter updates.`,
      emailsScanned: rawMessages.length,
      jobEmailsFound: discoveredEmails.length,
      autoUpdatedCount,
      discoveredEmails,
    };
  } catch (error: any) {
    console.error("Error scanning mailbox:", error);

    await prisma.emailConnection.update({
      where: { id: connection.id },
      data: {
        syncStatus: "ERROR",
        errorMessage: error.message || "Failed to scan mailbox",
      },
    });

    return {
      success: false,
      error: error.message || "Mailbox scan failed.",
      emailsScanned: 0,
      jobEmailsFound: 0,
      autoUpdatedCount: 0,
      discoveredEmails: [],
    };
  }
}
