import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exchangeGoogleCodeForTokens } from "@/lib/email-sync/google-oauth";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000";

  if (error || !code) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(
      `${appUrl}/dashboard/applications?sync_error=${encodeURIComponent(
        error || "Authorization declined"
      )}`
    );
  }

  try {
    const user = await getCurrentUser();
    const userId = state || user?.id;

    if (!userId) {
      return NextResponse.redirect(
        `${appUrl}/login?error=Please log in to link your Gmail account.`
      );
    }

    const tokens = await exchangeGoogleCodeForTokens(code);

    const expiresAt = tokens.expiresIn
      ? new Date(Date.now() + tokens.expiresIn * 1000)
      : new Date(Date.now() + 3600 * 1000);

    // Upsert EmailConnection
    await prisma.emailConnection.upsert({
      where: { userId },
      create: {
        userId,
        provider: "GOOGLE",
        email: tokens.email || "candidate@gmail.com",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt,
        syncStatus: "CONNECTED",
        lastSyncedAt: new Date(),
      },
      update: {
        provider: "GOOGLE",
        email: tokens.email || undefined,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || undefined,
        expiresAt,
        syncStatus: "CONNECTED",
        lastSyncedAt: new Date(),
        errorMessage: null,
      },
    });

    // Create in-app notification
    await prisma.notification
      .create({
        data: {
          userId,
          title: "📬 Gmail Account Connected!",
          message: `Your mailbox (${tokens.email}) is connected. CareerPilot can now detect recruiter responses and interview invites.`,
          type: "SYSTEM",
          link: "/dashboard/applications",
        },
      })
      .catch((e) => console.warn("Failed to create notification:", e));

    return NextResponse.redirect(
      `${appUrl}/dashboard/applications?sync=connected&email=${encodeURIComponent(
        tokens.email || ""
      )}`
    );
  } catch (err: any) {
    console.error("Error processing Google OAuth callback:", err);
    return NextResponse.redirect(
      `${appUrl}/dashboard/applications?sync_error=${encodeURIComponent(
        err.message || "Failed to link Gmail account"
      )}`
    );
  }
}
