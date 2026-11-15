"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { analyzeJobDescription } from "@/lib/ai/job-analyzer";
import { matchJobToResume } from "@/lib/ai/job-matcher";

export interface ClipJobInput {
  rawText: string;
  url?: string;
  targetStage?: "SAVED" | "APPLIED";
  customCompany?: string;
  customPosition?: string;
}

export interface ClipJobResult {
  success: boolean;
  jobId?: string;
  applicationId?: string;
  company?: string;
  position?: string;
  location?: string | null;
  employmentType?: string | null;
  matchScore?: number;
  requiredSkills?: string[];
  error?: string;
}

/**
 * 1-Click Job Description Clipper & Pipeline Importer.
 * Ingests raw job specs, extracts structured requirements via AI,
 * computes ATS match scores against primary resume, and registers application in Kanban.
 */
export async function clipAndImportJobAction(
  input: ClipJobInput
): Promise<ClipJobResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please sign in to clip jobs." };
    }

    const text = input.rawText?.trim();
    if (!text || text.length < 30) {
      return {
        success: false,
        error: "Please provide a complete job description (minimum 30 characters).",
      };
    }

    // 1. Analyze role requirements using AI or heuristic parser
    const analysis = await analyzeJobDescription(text);

    const company =
      input.customCompany?.trim() ||
      analysis.company?.trim() ||
      "Tech Company";

    const position =
      input.customPosition?.trim() ||
      analysis.position?.trim() ||
      "Software Engineer";

    const location = analysis.location || "Remote";
    const employmentType = analysis.employmentType || "Full-Time";
    const targetStatus = input.targetStage === "APPLIED" ? "APPLIED" : "SAVED";

    // 2. Fetch primary resume to calculate instant ATS match
    const primaryResume = await prisma.resume.findFirst({
      where: { userId: user.id },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
      include: { analysis: true },
    });

    let overallMatchScore = 75; // default benchmark
    let matchData: any = null;

    if (primaryResume) {
      const resumeSummary = primaryResume.analysis
        ? `Resume for ${primaryResume.name}. Strengths: ${primaryResume.analysis.strengths}. Missing: ${primaryResume.analysis.missingKeywords}`
        : primaryResume.name;

      matchData = await matchJobToResume(resumeSummary, text);
      overallMatchScore = matchData.overallScore;
    }

    // 3. Persist Job, Analysis, Match, and Application in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      const job = await tx.job.create({
        data: {
          userId: user.id,
          company,
          position,
          description: text,
          url: input.url?.trim() || null,
          location,
          employmentType,
          experienceRequirement: analysis.experienceRequirement || null,
        },
      });

      await tx.jobAnalysis.create({
        data: {
          jobId: job.id,
          requiredSkills: JSON.stringify(analysis.requiredSkills || []),
          preferredSkills: JSON.stringify(analysis.preferredSkills || []),
          responsibilities: JSON.stringify(analysis.responsibilities || []),
          keywords: JSON.stringify(analysis.keywords || []),
          seniority: analysis.seniority || null,
        },
      });

      if (primaryResume && matchData) {
        await tx.jobMatch.create({
          data: {
            resumeId: primaryResume.id,
            jobId: job.id,
            overallScore: matchData.overallScore,
            skillsScore: matchData.skillsScore,
            experienceScore: matchData.experienceScore,
            keywordsScore: matchData.keywordsScore,
            strongMatches: JSON.stringify(matchData.strongMatches || []),
            missingSkills: JSON.stringify(matchData.missingSkills || []),
            missingKeywords: JSON.stringify(matchData.missingKeywords || []),
            recommendations: JSON.stringify(matchData.recommendations || []),
          },
        });
      }

      const application = await tx.application.create({
        data: {
          userId: user.id,
          jobId: job.id,
          resumeId: primaryResume?.id || null,
          status: targetStatus,
          notes: `[${new Date().toLocaleDateString()}] Clipped from job posting via 1-Click Job Importer.`,
        },
      });

      await tx.applicationEvent.create({
        data: {
          applicationId: application.id,
          type: "STATUS_CHANGE",
          description: `Job clipped into ${targetStatus} column on Kanban pipeline`,
        },
      });

      return {
        jobId: job.id,
        applicationId: application.id,
      };
    });

    revalidatePath("/applications");
    revalidatePath("/jobs");
    revalidatePath("/dashboard");
    revalidatePath("/analytics");

    return {
      success: true,
      jobId: result.jobId,
      applicationId: result.applicationId,
      company,
      position,
      location,
      employmentType,
      matchScore: overallMatchScore,
      requiredSkills: analysis.requiredSkills || [],
    };
  } catch (error) {
    console.error("Failed to clip and import job:", error);
    return {
      success: false,
      error: "An error occurred while clipping the job description. Please try again.",
    };
  }
}
