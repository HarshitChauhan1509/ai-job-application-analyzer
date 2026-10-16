"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  improveResumeBulletMulti,
  analyzeBullet,
  ImprovementAction,
  MultiVariationOutput,
  BulletAnalysis,
} from "@/lib/ai/resume-improver";

async function getAuthenticatedUser() {
  const user = await getCurrentUser();
  if (user) return user;

  // Fallback for development/demo mode if not logged in
  let demoUser = await prisma.user.findFirst();
  if (!demoUser) {
    demoUser = await prisma.user.create({
      data: {
        name: "Demo Candidate",
        email: "candidate@careerpilot.local",
        password: "democandidate123",
      },
    });
  }
  return demoUser;
}

export interface CuratedSampleBullet {
  id: string;
  role: string;
  category: string;
  bullet: string;
  originalScore: number;
}

const CURATED_SAMPLE_BULLETS: CuratedSampleBullet[] = [
  {
    id: "s1",
    role: "Full Stack Engineer",
    category: "Performance & Database",
    bullet: "Worked on a billing system and updated the database to make it faster for users.",
    originalScore: 48,
  },
  {
    id: "s2",
    role: "Frontend Engineer",
    category: "React & UX",
    bullet: "Helped build new dashboard pages with React and fixed bugs reported by QA.",
    originalScore: 42,
  },
  {
    id: "s3",
    role: "Backend Engineer",
    category: "APIs & Microservices",
    bullet: "Responsible for writing microservices and managing our Kubernetes cluster deployments.",
    originalScore: 45,
  },
  {
    id: "s4",
    role: "DevOps / Cloud Engineer",
    category: "CI/CD & Infrastructure",
    bullet: "Set up CI/CD pipelines using GitHub Actions to deploy containers to AWS.",
    originalScore: 56,
  },
  {
    id: "s5",
    role: "Engineering Lead",
    category: "Leadership & Delivery",
    bullet: "Led a team of developers and ran daily standups to deliver sprint goals on time.",
    originalScore: 50,
  },
];

const CATEGORIZED_POWER_VERBS = [
  {
    category: "Execution & Engineering",
    verbs: ["Architected", "Engineered", "Spearheaded", "Constructed", "Deployed", "Refactored", "Pioneered"],
  },
  {
    category: "Growth & Optimization",
    verbs: ["Accelerated", "Maximized", "Automated", "Streamlined", "Consolidated", "Overhauled", "Scaled"],
  },
  {
    category: "Leadership & Ownership",
    verbs: ["Championed", "Orchestrated", "Mobilized", "Directed", "Mentored", "Aligned", "Standardized"],
  },
  {
    category: "Research & Analytics",
    verbs: ["Uncovered", "Diagnosed", "Benchmarked", "Formulated", "Synthesized", "Forecasted", "Audited"],
  },
];

/**
 * Retrieves the user's uploaded resumes and saved jobs to populate selector dropdowns.
 */
export async function getResumesAndJobsForImproverAction() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return {
        success: true,
        resumes: [],
        jobs: [],
        samples: CURATED_SAMPLE_BULLETS,
        powerVerbs: CATEGORIZED_POWER_VERBS,
      };
    }

    const [resumes, jobs] = await Promise.all([
      prisma.resume.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          name: true,
          fileUrl: true,
          isPrimary: true,
          createdAt: true,
          analysis: {
            select: {
              overallScore: true,
              strengths: true,
              recommendations: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.job.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          company: true,
          position: true,
          description: true,
          location: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      success: true,
      resumes,
      jobs,
      samples: CURATED_SAMPLE_BULLETS,
      powerVerbs: CATEGORIZED_POWER_VERBS,
    };
  } catch (error) {
    console.error("Error fetching data for resume improver:", error);
    return {
      success: false,
      error: "Failed to load resumes and jobs",
      resumes: [],
      jobs: [],
      samples: CURATED_SAMPLE_BULLETS,
      powerVerbs: CATEGORIZED_POWER_VERBS,
    };
  }
}

/**
 * Analyzes and improves a resume bullet point into 3 distinct formulas/variations.
 */
export async function improveBulletMultiAction(params: {
  originalBullet: string;
  action: ImprovementAction;
  jobId?: string;
  customJobContext?: string;
}): Promise<{ success: boolean; data?: MultiVariationOutput; error?: string }> {
  try {
    const { originalBullet, action, jobId, customJobContext } = params;

    if (!originalBullet || originalBullet.trim().length < 5) {
      return { success: false, error: "Please enter a valid bullet point to improve" };
    }

    let jobContext = customJobContext?.trim() || "";

    if (jobId && jobId !== "none") {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
      });
      if (job) {
        jobContext = `Role: ${job.position} at ${job.company}\nDescription: ${job.description.slice(0, 800)}`;
      }
    }

    const result = await improveResumeBulletMulti(originalBullet.trim(), action, jobContext);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error in improveBulletMultiAction:", error);
    return { success: false, error: "Failed to generate bullet improvements" };
  }
}

/**
 * Real-time fast linting and analysis of a bullet point.
 */
export async function analyzeBulletStrengthAction(
  bullet: string
): Promise<{ success: boolean; analysis: BulletAnalysis }> {
  const analysis = analyzeBullet(bullet);
  return { success: true, analysis };
}
