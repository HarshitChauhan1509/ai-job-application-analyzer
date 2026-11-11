"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hasEnoughCredits, deductCredits, CREDIT_COSTS } from "@/lib/credits";
import { tailorResumeForJob } from "@/lib/ai/resume-tailor";
import type { ExperienceItem } from "@/app/actions/profile";
import type { GitHubRepoItem } from "@/lib/github";
import type {
  TailoredExperienceEntry,
  TailoredProjectEntry,
  TailoredSkillGroup,
} from "@/lib/ai/schema";

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function generateTailoredResumeAction(params: {
  baseResumeId?: string;
  jobId?: string;
  targetCompany?: string;
  targetRole?: string;
  customJobDescription?: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const cost = CREDIT_COSTS.RESUME_TAILOR ?? 2;
    const creditCheck = await hasEnoughCredits(user.id, cost);
    if (!creditCheck.hasEnough) {
      return {
        success: false,
        code: "INSUFFICIENT_CREDITS",
        requiredCredits: cost,
        currentBalance: creditCheck.currentBalance,
        error: `You need ${cost} AI credits to generate a role-specific tailored resume (balance: ${creditCheck.currentBalance}).`,
      };
    }

    const [profile, baseResume, job] = await Promise.all([
      prisma.profile.findUnique({ where: { userId: user.id } }),
      params.baseResumeId
        ? prisma.resume.findFirst({
            where: { id: params.baseResumeId, userId: user.id },
            include: { analysis: true },
          })
        : prisma.resume.findFirst({
            where: { userId: user.id },
            orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
            include: { analysis: true },
          }),
      params.jobId
        ? prisma.job.findFirst({
            where: {
              id: params.jobId,
              OR: [{ userId: user.id }, { isCurated: true }],
            },
            include: { analysis: true },
          })
        : null,
    ]);

    const targetCompany = params.targetCompany?.trim() || job?.company || "Target Company";
    const targetRole = params.targetRole?.trim() || job?.position || baseResume?.targetRole || "Software Engineer";
    const jobDescription =
      params.customJobDescription?.trim() ||
      job?.description ||
      `${targetRole} at ${targetCompany}`;

    const experiences = safeParseJson<ExperienceItem[]>(profile?.experience, []);
    const githubProjects = safeParseJson<GitHubRepoItem[]>(profile?.githubProjects, []);
    const baseResumeStrengths = safeParseJson<string[]>(baseResume?.analysis?.strengths, []);

    const requiredSkills = safeParseJson<string[]>(job?.analysis?.requiredSkills, []);
    const preferredSkills = safeParseJson<string[]>(job?.analysis?.preferredSkills, []);
    const keywords = safeParseJson<string[]>(job?.analysis?.keywords, []);

    const tailored = await tailorResumeForJob({
      candidateName: user.name || "Candidate",
      headline: profile?.headline,
      bio: profile?.bio,
      experiences,
      githubProjects,
      baseResumeName: baseResume?.name,
      baseResumeStrengths,
      targetCompany,
      targetRole,
      jobDescription,
      requiredSkills,
      preferredSkills,
      keywords,
    });

    const title = `${targetRole} — ${targetCompany}`;

    const created = await prisma.tailoredResume.create({
      data: {
        userId: user.id,
        baseResumeId: baseResume?.id || null,
        jobId: job?.id || null,
        title,
        targetCompany,
        targetRole,
        matchScoreEstimate: Math.round(tailored.matchScoreEstimate),
        tailoredSummary: tailored.tailoredSummary,
        skillsSection: JSON.stringify(tailored.skillsSection),
        tailoredExperience: JSON.stringify(tailored.tailoredExperience),
        tailoredProjects: JSON.stringify(tailored.tailoredProjects),
        educationSection: tailored.educationSection || null,
        keywordsInjected: JSON.stringify(tailored.keywordsInjected),
        tailoringNotes: tailored.tailoringNotes,
      },
    });

    await deductCredits({
      userId: user.id,
      amount: cost,
      action: "RESUME_TAILOR",
      description: `Role-specific resume tailored for ${targetRole} @ ${targetCompany}`,
    });

    // If user is tracking an application for this job, record a milestone
    if (job?.id) {
      const existingApp = await prisma.application.findFirst({
        where: { userId: user.id, jobId: job.id },
        select: { id: true },
      });
      if (existingApp) {
        await prisma.applicationEvent
          .create({
            data: {
              applicationId: existingApp.id,
              type: "RESUME_TAILORED",
              description: `Generated ATS-tailored resume variant "${title}" (${created.matchScoreEstimate}% estimated fit)`,
            },
          })
          .catch((e) => console.warn("Failed to create RESUME_TAILORED event:", e));
        revalidatePath(`/applications/${existingApp.id}`);
      }
    }

    revalidatePath("/", "layout");
    revalidatePath("/resumes");
    revalidatePath("/applications");
    revalidatePath("/jobs");
    revalidatePath("/dashboard");

    return { success: true, tailoredResumeId: created.id };
  } catch (error: unknown) {
    console.error("Error in generateTailoredResumeAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate tailored resume",
    };
  }
}

export async function updateTailoredResumeAction(
  id: string,
  data: {
    title?: string;
    tailoredSummary?: string;
    skillsSection?: TailoredSkillGroup[];
    tailoredExperience?: TailoredExperienceEntry[];
    tailoredProjects?: TailoredProjectEntry[];
    educationSection?: string | null;
  }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const existing = await prisma.tailoredResume.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return { success: false, error: "Tailored resume not found" };
    }

    const updated = await prisma.tailoredResume.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title.trim() || existing.title } : {}),
        ...(data.tailoredSummary !== undefined ? { tailoredSummary: data.tailoredSummary } : {}),
        ...(data.skillsSection !== undefined
          ? { skillsSection: JSON.stringify(data.skillsSection) }
          : {}),
        ...(data.tailoredExperience !== undefined
          ? { tailoredExperience: JSON.stringify(data.tailoredExperience) }
          : {}),
        ...(data.tailoredProjects !== undefined
          ? { tailoredProjects: JSON.stringify(data.tailoredProjects) }
          : {}),
        ...(data.educationSection !== undefined
          ? { educationSection: data.educationSection?.trim() || null }
          : {}),
      },
    });

    revalidatePath("/resumes");
    revalidatePath(`/resumes/tailor/${id}`);

    return { success: true, tailoredResume: updated };
  } catch (error: unknown) {
    console.error("Error updating tailored resume:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save tailored resume",
    };
  }
}

export async function deleteTailoredResumeAction(id: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const existing = await prisma.tailoredResume.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return { success: false, error: "Tailored resume not found" };
    }

    await prisma.tailoredResume.delete({
      where: { id },
    });

    revalidatePath("/resumes");
    return { success: true };
  } catch (error: unknown) {
    console.error("Error deleting tailored resume:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete tailored resume",
    };
  }
}
