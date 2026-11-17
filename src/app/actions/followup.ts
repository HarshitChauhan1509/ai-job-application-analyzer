"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { generateFollowUpNudge, FollowUpNudgeResult } from "@/lib/ai/followup-generator";
import { sendGmailMessage } from "@/lib/email-sync/gmail-sender";

export interface ScheduledFollowUpItem {
  applicationId: string;
  company: string;
  position: string;
  recipientEmail: string;
  recipientName: string;
  lastPitchSubject: string;
  followUpCount: number;
  followUpDueAt: Date;
  status: "SCHEDULED" | "OVERDUE";
  daysOverdue: number;
}

export async function scheduleFollowUpAction(params: {
  applicationId: string;
  dueInDays: number;
  recipientEmail: string;
  recipientName?: string;
  pitchSubject?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const dueAt = new Date(Date.now() + params.dueInDays * 24 * 60 * 60 * 1000);

    await prisma.application.update({
      where: { id: params.applicationId },
      data: {
        followUpDueAt: dueAt,
        followUpStatus: "SCHEDULED",
        lastOutreachAt: new Date(),
        outreachRecipientEmail: params.recipientEmail.trim(),
        outreachRecipientName: params.recipientName?.trim() || null,
        lastPitchSubject: params.pitchSubject?.trim() || null,
      },
    });

    await prisma.applicationEvent.create({
      data: {
        applicationId: params.applicationId,
        type: "FOLLOW_UP_SCHEDULED",
        description: `Follow-up nudge scheduled for ${dueAt.toLocaleDateString()} (${params.dueInDays} days)`,
      },
    }).catch((e) => console.warn("Failed to create follow-up event:", e));

    revalidatePath("/applications");
    revalidatePath(`/applications/${params.applicationId}`);
    return { success: true };
  } catch (error) {
    console.error("Error scheduling follow-up:", error);
    return { success: false, error: "Failed to schedule follow-up." };
  }
}

export async function getFollowUpNudgesAction(): Promise<{
  success: boolean;
  nudges: ScheduledFollowUpItem[];
  overdueCount: number;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, nudges: [], overdueCount: 0 };

    const applications = await prisma.application.findMany({
      where: {
        userId: user.id,
        followUpStatus: { in: ["SCHEDULED", "OVERDUE"] },
        followUpDueAt: { not: null },
      },
      include: {
        job: true,
      },
      orderBy: { followUpDueAt: "asc" },
    });

    const now = new Date();
    const nudges: ScheduledFollowUpItem[] = [];
    let overdueCount = 0;

    for (const app of applications) {
      if (!app.followUpDueAt) continue;

      const isOverdue = app.followUpDueAt <= now;
      if (isOverdue) overdueCount += 1;

      const diffMs = now.getTime() - app.followUpDueAt.getTime();
      const daysOverdue = isOverdue ? Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24))) : 0;

      // Update status to OVERDUE in DB if not already flagged
      if (isOverdue && app.followUpStatus !== "OVERDUE") {
        await prisma.application.update({
          where: { id: app.id },
          data: { followUpStatus: "OVERDUE" },
        }).catch(() => null);
      }

      nudges.push({
        applicationId: app.id,
        company: app.job.company,
        position: app.job.position,
        recipientEmail: app.outreachRecipientEmail || "lead@startup.com",
        recipientName: app.outreachRecipientName || "Hiring Lead",
        lastPitchSubject: app.lastPitchSubject || `Role: ${app.job.position}`,
        followUpCount: app.followUpCount,
        followUpDueAt: app.followUpDueAt,
        status: isOverdue ? "OVERDUE" : "SCHEDULED",
        daysOverdue,
      });
    }

    return {
      success: true,
      nudges,
      overdueCount,
    };
  } catch (error) {
    console.error("Error fetching follow-up nudges:", error);
    return { success: false, nudges: [], overdueCount: 0, error: "Failed to load follow-ups" };
  }
}

export async function generateFollowUpDraftAction(params: {
  applicationId: string;
}): Promise<{
  success: boolean;
  drafts?: FollowUpNudgeResult;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const app = await prisma.application.findUnique({
      where: { id: params.applicationId },
      include: {
        job: true,
      },
    });

    if (!app) return { success: false, error: "Application not found" };

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    const portfolioUrl = profile?.username
      ? `https://careerpilot.app/p/${profile.username}`
      : null;

    let keyProjects: { name: string; description: string; stars?: number }[] = [];
    if (profile?.githubProjects) {
      try {
        const parsed = JSON.parse(profile.githubProjects);
        if (Array.isArray(parsed)) {
          keyProjects = parsed.map((p: any) => ({
            name: p.name || "Project",
            description: p.description || "",
            stars: typeof p.stars === "number" ? p.stars : 0,
          }));
        }
      } catch {
        keyProjects = [];
      }
    }

    const drafts = await generateFollowUpNudge({
      candidateName: user.name || "Candidate",
      companyName: app.job.company,
      roleTitle: app.job.position,
      recipientName: app.outreachRecipientName || undefined,
      previousSubject: app.lastPitchSubject || undefined,
      followUpSequenceNumber: (app.followUpCount || 0) + 1,
      portfolioUrl,
      keyProjects,
    });

    return { success: true, drafts };
  } catch (error) {
    console.error("Error generating follow-up draft:", error);
    return { success: false, error: "Failed to draft follow-up email." };
  }
}

export async function sendFollowUpNudgeAction(params: {
  applicationId: string;
  recipientEmail: string;
  subject: string;
  body: string;
}): Promise<{
  success: boolean;
  messageId?: string;
  sentFrom?: string;
  isSimulated?: boolean;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const connection = await prisma.emailConnection.findUnique({
      where: { userId: user.id },
    });

    if (!connection || connection.syncStatus === "DISCONNECTED" || !connection.accessToken) {
      return { success: false, error: "NO_GMAIL_CONNECTED" };
    }

    const app = await prisma.application.findUnique({
      where: { id: params.applicationId },
      include: { job: true },
    });

    if (!app) return { success: false, error: "Application not found" };

    // Send via connected Gmail
    const sendRes = await sendGmailMessage({
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken || undefined,
      fromEmail: connection.email,
      to: params.recipientEmail,
      subject: params.subject,
      body: params.body,
      candidateName: user.name || undefined,
    });

    if (!sendRes.success) {
      return { success: false, error: sendRes.error || "Failed to dispatch follow-up via Gmail." };
    }

    // Update application follow-up counters
    const newCount = (app.followUpCount || 0) + 1;
    const updatedNotes = app.notes
      ? `${app.notes}\n\n[${new Date().toLocaleDateString()}] Sent follow-up #${newCount} to ${params.recipientEmail}: "${params.subject}"`
      : `[${new Date().toLocaleDateString()}] Sent follow-up #${newCount} to ${params.recipientEmail}: "${params.subject}"`;

    await prisma.application.update({
      where: { id: app.id },
      data: {
        followUpCount: newCount,
        followUpStatus: "COMPLETED",
        followUpDueAt: null,
        notes: updatedNotes,
      },
    });

    await prisma.applicationEvent.create({
      data: {
        applicationId: app.id,
        type: "OUTREACH_FOLLOW_UP_SENT",
        description: `Dispatched follow-up #${newCount} to ${params.recipientEmail} via connected Gmail (${connection.email})`,
      },
    }).catch(() => null);

    revalidatePath("/applications");
    revalidatePath(`/applications/${app.id}`);
    revalidatePath("/analytics");

    return {
      success: true,
      messageId: sendRes.messageId,
      sentFrom: sendRes.sentFrom,
      isSimulated: sendRes.isSimulated,
    };
  } catch (error) {
    console.error("Error sending follow-up email:", error);
    return { success: false, error: "Failed to dispatch follow-up." };
  }
}

export async function dismissFollowUpAction(params: {
  applicationId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    await prisma.application.update({
      where: { id: params.applicationId },
      data: {
        followUpStatus: "DISMISSED",
        followUpDueAt: null,
      },
    });

    await prisma.applicationEvent.create({
      data: {
        applicationId: params.applicationId,
        type: "FOLLOW_UP_DISMISSED",
        description: "Follow-up nudge dismissed by candidate",
      },
    }).catch(() => null);

    revalidatePath("/applications");
    revalidatePath(`/applications/${params.applicationId}`);
    return { success: true };
  } catch (error) {
    console.error("Error dismissing follow-up:", error);
    return { success: false, error: "Failed to dismiss follow-up." };
  }
}
