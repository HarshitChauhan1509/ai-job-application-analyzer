"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getProfileDataAction } from "./profile";
import { generateOutreachPitches, OutreachPitchResult } from "@/lib/ai/outreach-generator";
import { hasEnoughCredits, deductCredits, CREDIT_COSTS } from "@/lib/credits";
import { sendGmailMessage } from "@/lib/email-sync/gmail-sender";
import { revalidatePath } from "next/cache";

export async function generateOutreachPitchAction(params: {
  applicationId?: string;
  companyName?: string;
  roleTitle?: string;
  jobDescription?: string;
  recipientName?: string;
}): Promise<{
  success: boolean;
  pitches?: OutreachPitchResult;
  company?: string;
  role?: string;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify candidate has sufficient AI credits
    const creditCheck = await hasEnoughCredits(user.id, CREDIT_COSTS.OUTREACH_PITCH);
    if (!creditCheck.hasEnough) {
      return {
        success: false,
        error: `Insufficient AI credits (${creditCheck.currentBalance} left). Generating founder pitches requires ${CREDIT_COSTS.OUTREACH_PITCH} credits. Please upgrade or top up.`,
      };
    }

    let company = params.companyName?.trim() || "";
    let role = params.roleTitle?.trim() || "";
    let jdText = params.jobDescription?.trim() || "";

    // If an applicationId is passed, look up DB application and related job
    if (params.applicationId) {
      const app = await prisma.application.findUnique({
        where: { id: params.applicationId },
        include: {
          job: {
            include: {
              analysis: true,
            },
          },
        },
      });

      if (app && app.job) {
        if (!company) company = app.job.company;
        if (!role) role = app.job.position;
        if (!jdText) {
          jdText = app.job.description || "";
          if (app.job.analysis) {
            jdText += `\nRequired Skills: ${app.job.analysis.requiredSkills}\nResponsibilities: ${app.job.analysis.responsibilities}`;
          }
        }

        // Record tracking event
        await prisma.applicationEvent.create({
          data: {
            applicationId: app.id,
            type: "OUTREACH_GENERATED",
            description: `Generated AI outreach pitches for ${company}`,
          },
        }).catch((e) => console.warn("Failed to create application event:", e));
      }
    }

    if (!company) company = "Startup";
    if (!role) role = "Software Engineer";

    // Retrieve candidate profile data
    const profileRes = await getProfileDataAction();
    const profile = profileRes.profile;

    // Retrieve primary resume for skills
    const primaryResume = await prisma.resume.findFirst({
      where: { userId: user.id, isPrimary: true },
    });

    const candidateSkills: string[] = [];
    if (primaryResume?.tags) {
      try {
        const parsed = JSON.parse(primaryResume.tags);
        if (Array.isArray(parsed)) candidateSkills.push(...parsed);
      } catch {
        // fallback
      }
    }

    if (profile?.experience) {
      profile.experience.forEach((exp) => {
        if (exp.skills) candidateSkills.push(...exp.skills);
      });
    }

    const portfolioUrl = profile?.username
      ? `https://careerpilot.app/p/${profile.username}`
      : profile?.id
      ? `https://careerpilot.app/p/${profile.id}`
      : null;

    const candidateProjects = (profile?.githubProjects || []).map((p) => ({
      name: p.name,
      description: p.description,
      language: p.language,
      stars: p.stars,
      url: p.url,
    }));

    const pitches = await generateOutreachPitches({
      candidateName: user.name || profile?.name || "Candidate",
      candidateHeadline: profile?.headline,
      candidateBio: profile?.bio,
      candidateSkills: Array.from(new Set(candidateSkills)),
      candidateExperience: profile?.experience || [],
      candidateProjects,
      companyName: company,
      roleTitle: role,
      jobDescription: jdText,
      recipientName: params.recipientName,
      portfolioUrl,
    });

    // Deduct credits and log to ledger
    await deductCredits({
      userId: user.id,
      amount: CREDIT_COSTS.OUTREACH_PITCH,
      action: "OUTREACH_PITCH",
      description: `Generated founder & lead outreach pitches for ${company}`,
    });

    revalidatePath("/", "layout");
    revalidatePath("/applications");

    return {
      success: true,
      pitches,
      company,
      role,
    };
  } catch (error) {
    console.error("Error generating outreach pitches:", error);
    return { success: false, error: "Failed to generate outreach pitch" };
  }
}

export async function getConnectedEmailAction(): Promise<{
  isConnected: boolean;
  email?: string;
  provider?: string;
  lastSyncedAt?: Date | null;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return { isConnected: false };

    const connection = await prisma.emailConnection.findUnique({
      where: { userId: user.id },
    });

    if (!connection || connection.syncStatus === "DISCONNECTED") {
      return { isConnected: false };
    }

    return {
      isConnected: true,
      email: connection.email,
      provider: connection.provider,
      lastSyncedAt: connection.lastSyncedAt,
    };
  } catch (error) {
    console.error("Error fetching connected email status:", error);
    return { isConnected: false };
  }
}

export interface SendDirectOutreachParams {
  applicationId?: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body: string;
  pitchType: "founder" | "recruiter";
  includePortfolioLink?: boolean;
}

export async function sendDirectOutreachEmailAction(
  params: SendDirectOutreachParams
): Promise<{
  success: boolean;
  messageId?: string;
  sentFrom?: string;
  isSimulated?: boolean;
  autoUpdatedStatus?: boolean;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    if (!params.recipientEmail || !params.recipientEmail.includes("@")) {
      return { success: false, error: "Please enter a valid recipient email address." };
    }

    const connection = await prisma.emailConnection.findUnique({
      where: { userId: user.id },
    });

    if (!connection || connection.syncStatus === "DISCONNECTED" || !connection.accessToken) {
      return {
        success: false,
        error: "NO_GMAIL_CONNECTED",
      };
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    // Construct body with optional portfolio signature
    let finalBody = params.body.trim();
    if (params.includePortfolioLink) {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_URL ||
        "http://localhost:3000";
      const portfolioHandle = profile?.username || profile?.id;
      if (portfolioHandle) {
        finalBody += `\n\n---\nPortfolio & Proof-of-Work: ${appUrl}/p/${portfolioHandle}`;
      }
    }

    const candidateDisplayName =
      user.name || profile?.headline?.split("•")[0]?.trim() || "Candidate";

    const sendRes = await sendGmailMessage({
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken || undefined,
      fromEmail: connection.email,
      to: params.recipientEmail,
      subject: params.subject,
      body: finalBody,
      candidateName: candidateDisplayName,
    });

    if (!sendRes.success) {
      return {
        success: false,
        error: sendRes.error || "Failed to dispatch email via Gmail API.",
      };
    }

    // If access token was refreshed during the dispatch, save it
    if (sendRes.refreshedAccessToken) {
      await prisma.emailConnection
        .update({
          where: { id: connection.id },
          data: {
            accessToken: sendRes.refreshedAccessToken,
            expiresAt: new Date(Date.now() + 3600 * 1000),
          },
        })
        .catch((e) => console.warn("Failed to persist refreshed token:", e));
    }

    let autoUpdatedStatus = false;

    // If an applicationId is linked, update application status & log audit
    if (params.applicationId) {
      const application = await prisma.application.findUnique({
        where: { id: params.applicationId },
        include: { job: true },
      });

      if (application) {
        // If application was SAVED, auto-promote to APPLIED
        const shouldPromote = application.status === "SAVED";
        const newStatus = shouldPromote ? "APPLIED" : application.status;

        const updatedNotes = application.notes
          ? `${application.notes}\n\n[${new Date().toLocaleDateString()}] Sent cold outreach to ${params.recipientEmail} (${params.pitchType === "founder" ? "Founder Pitch" : "Tech Lead Note"}): "${params.subject}"`
          : `[${new Date().toLocaleDateString()}] Sent cold outreach to ${params.recipientEmail} (${params.pitchType === "founder" ? "Founder Pitch" : "Tech Lead Note"}): "${params.subject}"`;

        await prisma.application.update({
          where: { id: application.id },
          data: {
            status: newStatus,
            notes: updatedNotes,
          },
        });

        if (shouldPromote) {
          autoUpdatedStatus = true;
          await prisma.applicationEvent
            .create({
              data: {
                applicationId: application.id,
                type: "STATUS_CHANGE",
                description: `Application status automatically changed to APPLIED upon cold email dispatch to ${params.recipientEmail}`,
              },
            })
            .catch((e) => console.warn("Failed to log status event:", e));
        }

        await prisma.applicationEvent
          .create({
            data: {
              applicationId: application.id,
              type: "OUTREACH_SENT",
              description: `Sent direct cold outreach to ${params.recipientName || params.recipientEmail} (${params.recipientEmail}) via connected Gmail (${connection.email})`,
            },
          })
          .catch((e) => console.warn("Failed to log outreach sent event:", e));

        // Deduplicate and record in SyncedEmailLog
        if (sendRes.messageId) {
          await prisma.syncedEmailLog
            .upsert({
              where: { messageId: sendRes.messageId },
              update: {},
              create: {
                userId: user.id,
                connectionId: connection.id,
                applicationId: application.id,
                messageId: sendRes.messageId,
                sender: connection.email,
                subject: params.subject,
                company: application.job.company,
                role: application.job.position,
                detectedStage: "APPLIED",
                actionTaken: "OUTREACH_SENT",
                receivedAt: new Date(),
              },
            })
            .catch((e) =>
              console.warn("Failed to create SyncedEmailLog entry:", e)
            );
        }
      }
    }

    revalidatePath("/", "layout");
    revalidatePath("/applications");
    if (params.applicationId) {
      revalidatePath(`/applications/${params.applicationId}`);
    }

    return {
      success: true,
      messageId: sendRes.messageId,
      sentFrom: sendRes.sentFrom || connection.email,
      isSimulated: sendRes.isSimulated,
      autoUpdatedStatus,
    };
  } catch (error) {
    console.error("Error sending direct outreach email:", error);
    return {
      success: false,
      error: "Failed to dispatch email. Please check your Gmail connection.",
    };
  }
}
