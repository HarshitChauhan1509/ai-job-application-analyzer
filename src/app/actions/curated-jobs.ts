"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { seedCuratedJobsIfEmpty } from "@/lib/curated-jobs";

export interface CuratedJobItem {
  id: string;
  company: string;
  position: string;
  department: string | null;
  startupStage: string | null;
  location: string | null;
  employmentType: string | null;
  salaryRange: string | null;
  url: string | null;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  seniority: string | null;
  matchScore?: number;
  applicationId?: string;
  applicationStatus?: string;
}

/**
 * Fetch all curated startup roles with user-tailored match scores & tracking statuses
 */
export async function getCuratedJobsAction(params?: {
  department?: string;
  stage?: string;
  search?: string;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // 1. Ensure curated jobs exist in DB
    await seedCuratedJobsIfEmpty();

    // 2. Fetch user's primary resume (for live match scoring)
    const primaryResume = await prisma.resume.findFirst({
      where: { userId: user.id, isPrimary: true },
      include: { analysis: true },
    });

    const resumeSkills: string[] = [];
    if (primaryResume?.analysis?.strengths) {
      try {
        const parsed = JSON.parse(primaryResume.analysis.strengths);
        if (Array.isArray(parsed)) resumeSkills.push(...parsed);
      } catch {}
    }

    // 3. Build filter where clause
    const where: any = { isCurated: true };
    if (params?.department && params.department !== "All") {
      where.department = params.department;
    }
    if (params?.stage && params.stage !== "All") {
      where.startupStage = params.stage;
    }
    if (params?.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { company: { contains: q, mode: "insensitive" } },
        { position: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    // 4. Fetch jobs with analysis and user's application
    const jobs = await prisma.job.findMany({
      where,
      include: {
        analysis: true,
        applications: {
          where: { userId: user.id },
          select: { id: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 5. Transform into clean UI model
    const transformedJobs: CuratedJobItem[] = jobs.map((job) => {
      let requiredSkills: string[] = [];
      let preferredSkills: string[] = [];
      let seniority: string | null = null;

      if (job.analysis) {
        try {
          requiredSkills = JSON.parse(job.analysis.requiredSkills || "[]");
          preferredSkills = JSON.parse(job.analysis.preferredSkills || "[]");
          seniority = job.analysis.seniority;
        } catch {}
      }

      // Compute ATS Match Score based on primary resume or default high fit
      let matchScore = 80;
      if (resumeSkills.length > 0 && requiredSkills.length > 0) {
        const resumeSkillsLower = resumeSkills.map((s) => s.toLowerCase());
        const matchedReq = requiredSkills.filter((req) =>
          resumeSkillsLower.some((res) => res.includes(req.toLowerCase()) || req.toLowerCase().includes(res))
        );
        const ratio = matchedReq.length / requiredSkills.length;
        matchScore = Math.min(96, Math.max(68, Math.round(ratio * 40 + 60)));
      } else {
        // Deterministic score based on company name length for varied showcase
        matchScore = 82 + (job.company.charCodeAt(0) % 15);
      }

      const existingApp = job.applications[0];

      return {
        id: job.id,
        company: job.company,
        position: job.position,
        department: job.department,
        startupStage: job.startupStage,
        location: job.location,
        employmentType: job.employmentType,
        salaryRange: job.salaryRange,
        url: job.url,
        description: job.description,
        requiredSkills,
        preferredSkills,
        seniority,
        matchScore,
        applicationId: existingApp?.id,
        applicationStatus: existingApp?.status,
      };
    });

    return {
      success: true,
      jobs: transformedJobs,
      hasPrimaryResume: Boolean(primaryResume),
    };
  } catch (error: any) {
    console.error("Error fetching curated jobs:", error);
    return {
      success: false,
      error: error.message || "Failed to load curated startup jobs",
    };
  }
}

/**
 * Add a curated job directly to candidate's pipeline
 */
export async function trackCuratedJobAction(jobId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const existing = await prisma.application.findFirst({
      where: { userId: user.id, jobId },
      include: { job: true },
    });

    if (existing) {
      return {
        success: true,
        alreadyTracked: true,
        applicationId: existing.id,
        application: existing,
      };
    }

    const application = await prisma.application.create({
      data: {
        userId: user.id,
        jobId,
        status: "SAVED",
        notes: "Added from Curated Startup Jobs Explorer Feed",
      },
      include: { job: true },
    });

    await prisma.applicationEvent.create({
      data: {
        applicationId: application.id,
        type: "CREATED",
        description: `Tracked from Curated Startup Jobs Explorer`,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/applications");
    revalidatePath("/jobs");
    revalidatePath("/jobs/explore");

    return {
      success: true,
      alreadyTracked: false,
      applicationId: application.id,
      application,
    };
  } catch (error: any) {
    console.error("Error tracking curated job:", error);
    return {
      success: false,
      error: error.message || "Failed to track job in pipeline",
    };
  }
}
