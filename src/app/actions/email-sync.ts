"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  getGoogleOAuthAuthUrl,
  isGoogleOAuthConfigured,
} from "@/lib/email-sync/google-oauth";
import { MailboxConnectionInfo } from "@/lib/email-sync/types";

/**
 * Retrieves the current user's email connection status.
 */
export async function getMailboxConnectionStatusAction(): Promise<{
  success: boolean;
  connection?: MailboxConnectionInfo | null;
  isConfigured: boolean;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized. Please log in.", isConfigured: false };
  }

  try {
    const connection = await prisma.emailConnection.findUnique({
      where: { userId: user.id },
      include: {
        _count: {
          select: { logs: true },
        },
      },
    });

    const isConfigured = isGoogleOAuthConfigured();

    if (!connection) {
      return {
        success: true,
        connection: null,
        isConfigured,
      };
    }

    return {
      success: true,
      isConfigured,
      connection: {
        id: connection.id,
        provider: connection.provider as "GOOGLE" | "OUTLOOK",
        email: connection.email,
        syncStatus: connection.syncStatus as any,
        lastSyncedAt: connection.lastSyncedAt,
        errorMessage: connection.errorMessage,
        syncedEmailCount: connection._count.logs,
      },
    };
  } catch (error: any) {
    console.error("Error fetching mailbox connection:", error);
    return {
      success: false,
      error: error.message || "Failed to retrieve mailbox connection status.",
      isConfigured: false,
    };
  }
}

/**
 * Initiates the Google OAuth authorization flow.
 */
export async function initiateGoogleMailboxConnectAction(): Promise<{
  success: boolean;
  authUrl?: string;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  try {
    const authUrl = getGoogleOAuthAuthUrl(user.id);
    return {
      success: true,
      authUrl,
    };
  } catch (error: any) {
    console.error("Error generating Google auth URL:", error);
    return {
      success: false,
      error: error.message || "Could not generate Google authorization URL.",
    };
  }
}

/**
 * Simulates a connected Gmail mailbox for developer testing without external Google Cloud setup.
 */
export async function simulateMockMailboxConnectAction(
  customEmail?: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized." };
  }

  const emailToUse = customEmail || user.email || "candidate.demo@gmail.com";

  try {
    await prisma.emailConnection.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        provider: "GOOGLE",
        email: emailToUse,
        accessToken: `mock_access_token_${Date.now()}`,
        refreshToken: `mock_refresh_token_${Date.now()}`,
        expiresAt: new Date(Date.now() + 86400 * 1000),
        syncStatus: "CONNECTED",
        lastSyncedAt: new Date(),
      },
      update: {
        provider: "GOOGLE",
        email: emailToUse,
        syncStatus: "CONNECTED",
        lastSyncedAt: new Date(),
        errorMessage: null,
      },
    });

    revalidatePath("/applications");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Simulated connection to ${emailToUse} established.`,
    };
  } catch (error: any) {
    console.error("Error in simulateMockMailboxConnectAction:", error);
    return {
      success: false,
      error: error.message || "Failed to simulate mailbox connection.",
    };
  }
}

/**
 * Disconnects the user's connected mailbox.
 */
export async function disconnectMailboxAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    await prisma.emailConnection.deleteMany({
      where: { userId: user.id },
    });

    revalidatePath("/applications");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error: any) {
    console.error("Error disconnecting mailbox:", error);
    return {
      success: false,
      error: error.message || "Failed to disconnect mailbox.",
    };
  }
}
