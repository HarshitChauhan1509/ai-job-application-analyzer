"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  url: string;
  category: "navigation" | "jobs" | "resumes" | "interviews";
}

export async function globalSearchAction(query: string = ""): Promise<{
  success: boolean;
  results: SearchResultItem[];
}> {
  try {
    const user = await getCurrentUser();
    const userId = user?.id;

    const q = query.trim().toLowerCase();

    // 1. Core Quick Navigation Pages
    const pages: SearchResultItem[] = [
      {
        id: "nav-dash",
        title: "Dashboard Overview",
        subtitle: "Key metrics, application pipeline & recent activity",
        url: "/dashboard",
        category: "navigation",
        badge: "Page",
      },
      {
        id: "nav-jobs",
        title: "Saved Jobs & Postings",
        subtitle: "Manage imported job descriptions and track fit",
        url: "/jobs",
        category: "navigation",
        badge: "Page",
      },
      {
        id: "nav-apps",
        title: "Application Pipeline Tracker",
        subtitle: "Kanban board tracking Applied, Interviewing, Offer stages",
        url: "/applications",
        category: "navigation",
        badge: "Pipeline",
      },
      {
        id: "nav-resumes",
        title: "Resumes & Role Profiles",
        subtitle: "Upload & organize multiple targeted resume versions",
        url: "/resumes",
        category: "navigation",
        badge: "Hub",
      },
      {
        id: "nav-improve",
        title: "AI Resume Improver",
        subtitle: "Optimize bullet points using the Google X-Y-Z formula",
        url: "/improve",
        category: "navigation",
        badge: "AI Tool",
      },
      {
        id: "nav-coach",
        title: "AI Interview Coach",
        subtitle: "Simulate technical and behavioral practice sessions",
        url: "/coach",
        category: "navigation",
        badge: "AI Tool",
      },
    ];

    const matchedPages = !q
      ? pages
      : pages.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.subtitle.toLowerCase().includes(q)
        );

    if (!userId) {
      return { success: true, results: matchedPages };
    }

    // 2. Fetch Jobs, Resumes, and Interview Sessions
    const [jobs, resumes, interviewSessions] = await Promise.all([
      prisma.job.findMany({
        where: {
          userId,
          ...(q
            ? {
                OR: [
                  { position: { contains: q, mode: "insensitive" } },
                  { company: { contains: q, mode: "insensitive" } },
                  { location: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: {
          applications: {
            select: { status: true },
          },
        },
        take: 8,
        orderBy: { createdAt: "desc" },
      }),
      prisma.resume.findMany({
        where: {
          userId,
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { targetRole: { contains: q, mode: "insensitive" } },
                  { targetCompany: { contains: q, mode: "insensitive" } },
                  { tags: { contains: q, mode: "insensitive" } },
                  { resumeType: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: {
          analysis: {
            select: { overallScore: true },
          },
        },
        take: 6,
        orderBy: { createdAt: "desc" },
      }),
      prisma.interviewSession.findMany({
        where: {
          userId,
          ...(q
            ? {
                OR: [
                  { role: { contains: q, mode: "insensitive" } },
                  { difficulty: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const jobResults: SearchResultItem[] = jobs.map((job) => {
      const app = job.applications[0];
      return {
        id: `job-${job.id}`,
        title: job.position,
        subtitle: `${job.company}${job.location ? ` • ${job.location}` : ""}`,
        badge: app ? app.status : "SAVED",
        url: `/jobs`,
        category: "jobs",
      };
    });

    const resumeResults: SearchResultItem[] = resumes.map((res) => {
      return {
        id: `resume-${res.id}`,
        title: res.name,
        subtitle: res.targetRole ? `Target: ${res.targetRole}` : "General Software Engineer",
        badge: res.analysis?.overallScore
          ? `${res.analysis.overallScore}% ATS`
          : res.resumeType || "Resume",
        url: `/resumes/${res.id}`,
        category: "resumes",
      };
    });

    const interviewResults: SearchResultItem[] = interviewSessions.map((session) => {
      return {
        id: `interview-${session.id}`,
        title: `${session.role} Mock Interview`,
        subtitle: `${session.difficulty} level simulation`,
        badge: session.overallScore ? `${session.overallScore}/10` : "Practice",
        url: `/coach/session?sessionId=${session.id}`,
        category: "interviews",
      };
    });

    return {
      success: true,
      results: [...matchedPages, ...jobResults, ...resumeResults, ...interviewResults],
    };
  } catch (error) {
    console.error("Global search error:", error);
    return { success: false, results: [] };
  }
}
