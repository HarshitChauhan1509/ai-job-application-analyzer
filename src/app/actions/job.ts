"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { analyzeJobDescription, analyzeJobFromImages } from "@/lib/ai/job-analyzer";
import { scrapeJobUrl, ScrapedJobResult } from "@/lib/scraper";
import { matchJobToResume } from "@/lib/ai/job-matcher";

export interface CreateJobInput {
  descriptionText: string;
  url?: string;
  company?: string;
  position?: string;
  location?: string;
  employmentType?: string;
  experienceRequirement?: string;
}

/**
 * Scrapes a job description URL.
 * Detects anti-bot protections (Indeed, LinkedIn) and provides structured guidance.
 */
export async function scrapeJobUrlAction(url: string): Promise<ScrapedJobResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      url,
      error: "You must be logged in to import a job.",
    };
  }

  return await scrapeJobUrl(url);
}

/**
 * Analyzes a job description and creates Job + JobAnalysis in the database.
 * Supports passing an optional URL and extracted metadata.
 */
export async function createAndAnalyzeJobAction(input: string | CreateJobInput) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const payload: CreateJobInput = typeof input === "string" ? { descriptionText: input } : input;
  const descriptionText = payload.descriptionText?.trim();

  if (!descriptionText) {
    return { success: false, error: "Job description text is required" };
  }

  try {
    // 1. Analyze the job description
    const analysisResult = await analyzeJobDescription(descriptionText);

    // 2. Select final values (explicit overrides from scraper / user take precedence, else AI/heuristic)
    const company = payload.company?.trim() || analysisResult.company || "Tech Company";
    const position = payload.position?.trim() || analysisResult.position || "Software Engineer";
    const location = payload.location?.trim() || analysisResult.location || null;
    const employmentType = payload.employmentType?.trim() || analysisResult.employmentType || null;
    const experienceRequirement = payload.experienceRequirement?.trim() || analysisResult.experienceRequirement || null;

    // 3. Create Job and JobAnalysis in a transaction
    const job = await prisma.$transaction(async (tx) => {
      const newJob = await tx.job.create({
        data: {
          userId: user.id,
          company,
          position,
          description: descriptionText,
          url: payload.url?.trim() || null,
          location,
          employmentType,
          experienceRequirement,
        },
      });

      await tx.jobAnalysis.create({
        data: {
          jobId: newJob.id,
          requiredSkills: JSON.stringify(analysisResult.requiredSkills || []),
          preferredSkills: JSON.stringify(analysisResult.preferredSkills || []),
          responsibilities: JSON.stringify(analysisResult.responsibilities || []),
          keywords: JSON.stringify(analysisResult.keywords || []),
          seniority: analysisResult.seniority || null,
        },
      });

      // 4. If user has a primary resume (or any resume), pre-calculate job match
      const resume = await tx.resume.findFirst({
        where: { userId: user.id },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
        include: { analysis: true },
      });

      if (resume) {
        // Construct resume text representation from analysis or name
        const resumeSummary = resume.analysis
          ? `Resume for ${resume.name}. Strengths: ${resume.analysis.strengths}. Keywords: ${resume.analysis.missingKeywords}`
          : resume.name;

        const matchResult = await matchJobToResume(resumeSummary, descriptionText);

        await tx.jobMatch.upsert({
          where: {
            resumeId_jobId: {
              resumeId: resume.id,
              jobId: newJob.id,
            },
          },
          create: {
            resumeId: resume.id,
            jobId: newJob.id,
            overallScore: matchResult.overallScore,
            skillsScore: matchResult.skillsScore,
            experienceScore: matchResult.experienceScore,
            keywordsScore: matchResult.keywordsScore,
            strongMatches: JSON.stringify(matchResult.strongMatches),
            missingSkills: JSON.stringify(matchResult.missingSkills),
            missingKeywords: JSON.stringify(matchResult.missingKeywords),
            recommendations: JSON.stringify(matchResult.recommendations),
          },
          update: {
            overallScore: matchResult.overallScore,
            skillsScore: matchResult.skillsScore,
            experienceScore: matchResult.experienceScore,
            keywordsScore: matchResult.keywordsScore,
            strongMatches: JSON.stringify(matchResult.strongMatches),
            missingSkills: JSON.stringify(matchResult.missingSkills),
            missingKeywords: JSON.stringify(matchResult.missingKeywords),
            recommendations: JSON.stringify(matchResult.recommendations),
          },
        });
      }

      return newJob;
    });

    revalidatePath("/jobs");
    revalidatePath("/dashboard");
    return { success: true, job };
  } catch (error: any) {
    console.error("Failed to create and analyze job:", error);
    return { success: false, error: error?.message || "Failed to process job description" };
  }
}

/**
 * Deletes a job posting and associated analysis / matches for the authenticated user.
 */
export async function deleteJobAction(jobId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.job.deleteMany({
      where: {
        id: jobId,
        userId: user.id,
      },
    });

    revalidatePath("/jobs");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete job:", error);
    return { success: false, error: error?.message || "Failed to delete job" };
  }
}

/**
 * Analyzes one or more images of a job description using Vision AI,
 * extracts text and structured role requirements, and creates Job + JobAnalysis in the database.
 */
export async function analyzeJobImagesAction(params: {
  images: string[];
  url?: string;
  company?: string;
  position?: string;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  if (!params.images || params.images.length === 0) {
    return { success: false, error: "At least one job description image is required" };
  }

  try {
    // 1. Analyze and transcribe images via Vision AI
    const result = await analyzeJobFromImages(params.images);

    const descriptionText = result.extractedDescription || "Job description extracted from screenshots";
    const company = params.company?.trim() || result.company || "Company from JD";
    const position = params.position?.trim() || result.position || "Job Title";

    // 2. Create Job and JobAnalysis in transaction
    const job = await prisma.$transaction(async (tx) => {
      const newJob = await tx.job.create({
        data: {
          userId: user.id,
          company,
          position,
          description: descriptionText,
          url: params.url?.trim() || null,
          location: result.location || null,
          employmentType: result.employmentType || null,
          experienceRequirement: result.experienceRequirement || null,
        },
      });

      await tx.jobAnalysis.create({
        data: {
          jobId: newJob.id,
          requiredSkills: JSON.stringify(result.requiredSkills || []),
          preferredSkills: JSON.stringify(result.preferredSkills || []),
          responsibilities: JSON.stringify(result.responsibilities || []),
          keywords: JSON.stringify(result.keywords || []),
          seniority: result.seniority || null,
        },
      });

      // 3. Pre-calculate match if user has a resume
      const resume = await tx.resume.findFirst({
        where: { userId: user.id },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
        include: { analysis: true },
      });

      if (resume) {
        const resumeSummary = resume.analysis
          ? `Resume for ${resume.name}. Strengths: ${resume.analysis.strengths}. Keywords: ${resume.analysis.missingKeywords}`
          : resume.name;

        const matchResult = await matchJobToResume(resumeSummary, descriptionText);

        await tx.jobMatch.upsert({
          where: {
            resumeId_jobId: {
              resumeId: resume.id,
              jobId: newJob.id,
            },
          },
          create: {
            resumeId: resume.id,
            jobId: newJob.id,
            overallScore: matchResult.overallScore,
            skillsScore: matchResult.skillsScore,
            experienceScore: matchResult.experienceScore,
            keywordsScore: matchResult.keywordsScore,
            strongMatches: JSON.stringify(matchResult.strongMatches),
            missingSkills: JSON.stringify(matchResult.missingSkills),
            missingKeywords: JSON.stringify(matchResult.missingKeywords),
            recommendations: JSON.stringify(matchResult.recommendations),
          },
          update: {
            overallScore: matchResult.overallScore,
            skillsScore: matchResult.skillsScore,
            experienceScore: matchResult.experienceScore,
            keywordsScore: matchResult.keywordsScore,
            strongMatches: JSON.stringify(matchResult.strongMatches),
            missingSkills: JSON.stringify(matchResult.missingSkills),
            missingKeywords: JSON.stringify(matchResult.missingKeywords),
            recommendations: JSON.stringify(matchResult.recommendations),
          },
        });
      }

      return newJob;
    });

    revalidatePath("/jobs");
    revalidatePath("/dashboard");
    return { success: true, job };
  } catch (error: any) {
    console.error("Failed to analyze job images:", error);
    return { success: false, error: error?.message || "Failed to process job description images" };
  }
}

