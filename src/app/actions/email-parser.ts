"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { parseApplicationEmail, ParsedEmailResult, EmailStage } from "@/lib/ai/email-parser";

export interface ParseEmailResponse {
  success: boolean;
  error?: string;
  parsed?: ParsedEmailResult;
  candidateApplications?: Array<{
    id: string;
    company: string;
    position: string;
    currentStatus: string;
    similarityScore: number;
  }>;
  suggestedAction?: "UPDATE_EXISTING" | "CREATE_NEW";
  suggestedApplicationId?: string;
}

/**
 * Step 1: Parse the raw recruiter email and match against user's applications
 */
export async function parseEmailTextAction(emailText: string): Promise<ParseEmailResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  if (!emailText || emailText.trim().length < 15) {
    return { success: false, error: "Please paste a complete email or message snippet (minimum 15 characters)." };
  }

  try {
    const parsed = await parseApplicationEmail(emailText);

    // Fetch user's existing applications
    const applications = await prisma.application.findMany({
      where: { userId: user.id },
      include: {
        job: {
          select: {
            company: true,
            position: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const parsedCompanyLower = parsed.company.toLowerCase().replace(/[^a-z0-9]/g, "");
    const parsedRoleLower = parsed.role.toLowerCase();

    // Score and rank matches
    const scoredApplications = applications
      .map((app) => {
        const appCompany = app.job?.company || "";
        const appCompanyClean = appCompany.toLowerCase().replace(/[^a-z0-9]/g, "");
        const appPosition = app.job?.position || "";
        const appPosLower = appPosition.toLowerCase();

        let similarity = 0;

        if (parsedCompanyLower && appCompanyClean) {
          if (appCompanyClean === parsedCompanyLower) {
            similarity += 70;
          } else if (appCompanyClean.includes(parsedCompanyLower) || parsedCompanyLower.includes(appCompanyClean)) {
            similarity += 50;
          }
        }

        if (parsedRoleLower && appPosLower) {
          const roleTokens = parsedRoleLower.split(/\s+/).filter((t) => t.length > 2);
          const posTokens = appPosLower.split(/\s+/).filter((t) => t.length > 2);
          const common = roleTokens.filter((t) => posTokens.includes(t));
          if (common.length > 0) {
            similarity += Math.min(30, common.length * 15);
          }
        }

        return {
          id: app.id,
          company: appCompany,
          position: appPosition,
          currentStatus: app.status,
          similarityScore: similarity,
        };
      })
      .filter((app) => app.similarityScore > 0)
      .sort((a, b) => b.similarityScore - a.similarityScore);

    const bestMatch = scoredApplications.length > 0 && scoredApplications[0].similarityScore >= 50
      ? scoredApplications[0]
      : null;

    return {
      success: true,
      parsed,
      candidateApplications: scoredApplications.slice(0, 5),
      suggestedAction: bestMatch ? "UPDATE_EXISTING" : "CREATE_NEW",
      suggestedApplicationId: bestMatch?.id,
    };
  } catch (error: any) {
    console.error("Error parsing email text:", error);
    return {
      success: false,
      error: error.message || "Failed to analyze recruiter email",
    };
  }
}

/**
 * Step 2: Apply the detected changes to an existing application or create a new one
 */
export async function applyParsedEmailAction(params: {
  applicationId?: string;
  parsedData: ParsedEmailResult;
  createNewIfNoMatch?: boolean;
}): Promise<{
  success: boolean;
  error?: string;
  actionTaken?: "UPDATED" | "CREATED";
  applicationId?: string;
  previousStatus?: string;
  newStatus?: string;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const { applicationId, parsedData, createNewIfNoMatch } = params;

  try {
    // 1. UPDATE EXISTING APPLICATION
    if (applicationId) {
      const existing = await prisma.application.findUnique({
        where: { id: applicationId },
        include: { job: true },
      });

      if (!existing || existing.userId !== user.id) {
        return { success: false, error: "Application not found or unauthorized" };
      }

      const previousStatus = existing.status;
      const newStatus = parsedData.detectedStatus;

      // Prepare updated notes
      const timestamp = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const newNoteSnippet = `[${timestamp} Recruiter Email]: ${parsedData.summary}${
        parsedData.actionDetails ? ` (Action: ${parsedData.actionDetails})` : ""
      }${parsedData.interviewDate ? ` (Date: ${parsedData.interviewDate})` : ""}`;

      const updatedNotes = existing.notes
        ? `${existing.notes}\n\n${newNoteSnippet}`
        : newNoteSnippet;

      // Update application
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          status: newStatus,
          notes: updatedNotes,
        },
      });

      // Log event
      await prisma.applicationEvent.create({
        data: {
          applicationId,
          type: "STATUS_CHANGE",
          description: `${parsedData.statusLabel}: ${parsedData.summary}`,
        },
      });

      revalidatePath("/dashboard");
      revalidatePath("/applications");
      revalidatePath(`/applications/${applicationId}`);

      return {
        success: true,
        actionTaken: "UPDATED",
        applicationId,
        previousStatus,
        newStatus,
      };
    }

    // 2. CREATE NEW APPLICATION
    if (createNewIfNoMatch) {
      const company = parsedData.company.trim() || "Unknown Company";
      const position = parsedData.role.trim() || "Software Engineer";

      // Create Job
      const job = await prisma.job.create({
        data: {
          userId: user.id,
          company,
          position,
          description: `Auto-created from recruiter email. Summary: ${parsedData.summary}`,
        },
      });

      // Create Application
      const application = await prisma.application.create({
        data: {
          userId: user.id,
          jobId: job.id,
          status: parsedData.detectedStatus,
          notes: `[Recruiter Email Log]: ${parsedData.summary}${
            parsedData.actionDetails ? ` | ${parsedData.actionDetails}` : ""
          }`,
        },
      });

      // Log Event
      await prisma.applicationEvent.create({
        data: {
          applicationId: application.id,
          type: "CREATED",
          description: `Logged from recruiter email with status ${parsedData.statusLabel}`,
        },
      });

      revalidatePath("/dashboard");
      revalidatePath("/applications");
      revalidatePath("/jobs");

      return {
        success: true,
        actionTaken: "CREATED",
        applicationId: application.id,
        newStatus: parsedData.detectedStatus,
      };
    }

    return { success: false, error: "No target application specified" };
  } catch (error: any) {
    console.error("Error applying parsed email:", error);
    return {
      success: false,
      error: error.message || "Failed to apply email updates",
    };
  }
}
