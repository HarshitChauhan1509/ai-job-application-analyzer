/**
 * Google OAuth 2.0 Client for Gmail Read-Only Synchronization
 */

export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  email?: string;
}

export function isGoogleOAuthConfigured(): boolean {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return Boolean(
    clientId &&
      clientSecret &&
      !clientId.startsWith("dummy") &&
      !clientSecret.startsWith("dummy")
  );
}

export function getGoogleOAuthAuthUrl(userId: string): string {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000";

  const redirectUri = `${appUrl}/api/auth/google/callback`;
  const clientId = process.env.GOOGLE_CLIENT_ID || "";

  if (!isGoogleOAuthConfigured()) {
    // Return mock auth callback URL for instant local test mode
    return `${redirectUri}?code=mock_code_for_${userId}&state=${encodeURIComponent(
      userId
    )}`;
  }

  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
    state: userId,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCodeForTokens(
  code: string
): Promise<GoogleTokens> {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000";
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  // Test / Simulator Mode Fallback
  if (code.startsWith("mock_code") || !isGoogleOAuthConfigured()) {
    return {
      accessToken: `mock_access_token_${Date.now()}`,
      refreshToken: `mock_refresh_token_${Date.now()}`,
      expiresIn: 3600,
      email: "candidate.demo@gmail.com",
    };
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Google token exchange failed: ${errorData}`);
  }

  const data = await response.json();

  // Fetch candidate's Gmail address using access token
  let email = "connected-user@gmail.com";
  try {
    const userinfoRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${data.access_token}` },
      }
    );
    if (userinfoRes.ok) {
      const userinfo = await userinfoRes.json();
      if (userinfo.email) email = userinfo.email;
    }
  } catch (e) {
    console.warn("Could not fetch Google userinfo email:", e);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    email,
  };
}

export async function refreshGoogleAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  if (refreshToken.startsWith("mock_") || !isGoogleOAuthConfigured()) {
    return {
      accessToken: `refreshed_mock_access_token_${Date.now()}`,
      expiresIn: 3600,
    };
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh Google access token");
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}
