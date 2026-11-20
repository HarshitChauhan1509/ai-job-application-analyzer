"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { QUESTION_BANK } from "@/lib/interview-questions-bank";

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  url: string;
  category: "navigation" | "applications" | "jobs" | "resumes" | "interviews" | "actions";
}

export async function globalSearchAction(query: string = ""): Promise<{
  success: boolean;
  results: SearchResultItem[];
  publicPortfolioUrl?: string | null;
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
        id: "nav-explore",
        title: "Explore Curated Startups",
        subtitle: "Verified tech roles with salary ranges and equity stakes",
        url: "/jobs/explore",
        category: "navigation",
        badge: "Hot",
      },
      {
        id: "nav-apps",
        title: "Application Pipeline Tracker",
        subtitle: "Kanban board tracking Saved, Applied, Interview, and Offer stages",
        url: "/applications",
        category: "navigation",
        badge: "Pipeline",
      },
      {
        id: "nav-offers",
        title: "Offer Evaluator & Negotiation Strategist",
        subtitle: "Model Year 1 Total Comp (TC), simulate equity upside, and craft counter-offers",
        url: "/offers",
        category: "navigation",
        badge: "Offers",
      },
      {
        id: "nav-analytics",
        title: "Funnel & Conversion Analytics",
        subtitle: "Pipeline drop-off, ATS correlation, and response velocity metrics",
        url: "/analytics",
        category: "navigation",
        badge: "Analytics",
      },
      {
        id: "nav-resumes",
        title: "Resumes & Tailor Studio",
        subtitle: "Upload master resumes and generate role-specific ATS variants",
        url: "/resumes",
        category: "navigation",
        badge: "Hub",
      },
      {
        id: "nav-jobs",
        title: "Saved Jobs & Postings",
        subtitle: "Manage imported job descriptions and assess fit",
        url: "/jobs",
        category: "navigation",
        badge: "Page",
      },
      {
        id: "nav-coach",
        title: "AI Voice Interview Coach",
        subtitle: "Simulate natural speech technical and behavioral practice loops",
        url: "/coach",
        category: "navigation",
        badge: "AI Coach",
      },
      {
        id: "nav-question-bank",
        title: "Company Interview Question Bank",
        subtitle: "Curated system design & behavioral packs (Stripe, Linear, Supabase, Vercel)",
        url: "/coach/questions",
        category: "navigation",
        badge: "Packs",
      },
      {
        id: "nav-improve",
        title: "STAR Resume Improver",
        subtitle: "Optimize bullet points using the Google X-Y-Z formula",
        url: "/improve",
        category: "navigation",
        badge: "AI Tool",
      },
      {
        id: "nav-billing",
        title: "Billing & AI Credits",
        subtitle: "Manage subscription plans, check balances, and top up credits",
        url: "/dashboard/billing",
        category: "navigation",
        badge: "Billing",
      },
      {
        id: "nav-profile",
        title: "Candidate Profile & Portfolio",
        subtitle: "Manage public portfolio, GitHub proof-of-work, and timeline",
        url: "/profile",
        category: "navigation",
        badge: "Profile",
      },
    ];

    // Quick AI Actions
    const quickActions: SearchResultItem[] = [
      {
        id: "act-clip-job",
        title: "Clip / Import Job Description",
        subtitle: "Paste raw job spec or URL to auto-extract skills and add to Kanban",
        url: "/applications?action=clip",
        category: "actions",
        badge: "1-Click",
      },
      {
        id: "act-install-extension",
        title: "Install Browser Extension (Chrome / Edge)",
        subtitle: "1-Click clip job postings directly from LinkedIn, Indeed, Greenhouse, and Lever",
        url: "/applications?action=extension",
        category: "actions",
        badge: "Extension",
      },
      {
        id: "act-tailor-resume",
        title: "Tailor Resume for Role",
        subtitle: "Generate an ATS-optimized, single-page printable PDF resume",
        url: "/resumes",
        category: "actions",
        badge: "Resume",
      },
      {
        id: "act-mock-interview",
        title: "Start Voice Mock Interview",
        subtitle: "Launch a speech-tracked simulation with senior STAR answers",
        url: "/coach",
        category: "actions",
        badge: "Practice",
      },
      {
        id: "act-question-bank",
        title: "Explore Question Bank (Stripe, Linear, Supabase)",
        subtitle: "Practice company-specific interview prompts with 1-click voice coach",
        url: "/coach/questions",
        category: "actions",
        badge: "Packs",
      },
      {
        id: "act-sync-mailbox",
        title: "Sync Recruiter Mailbox",
        subtitle: "Scan connected Gmail inbox for interview invites and ATS updates",
        url: "/applications?action=sync",
        category: "actions",
        badge: "Gmail",
      },
      {
        id: "act-evaluate-offer",
        title: "Evaluate Job Offer & Compensation",
        subtitle: "Calculate TC breakdown, model startup equity upside, and unlock counter-offers",
        url: "/offers",
        category: "actions",
        badge: "Offers",
      },
    ];

    const matchedPages = !q
      ? pages
      : pages.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.subtitle.toLowerCase().includes(q)
        );

    const matchedActions = !q
      ? quickActions
      : quickActions.filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.subtitle.toLowerCase().includes(q)
        );

    if (!userId) {
      return { success: true, results: [...matchedActions, ...matchedPages] };
    }

    // 2. Fetch User Profile, Applications, Tailored Resumes, Jobs, Resumes, and Interview Sessions
    const [profile, applications, tailoredResumes, jobs, resumes, interviewSessions, jobOffers] =
      await Promise.all([
        prisma.profile.findUnique({
          where: { userId },
          select: { username: true },
        }),
        prisma.application.findMany({
          where: {
            userId,
            ...(q
              ? {
                  OR: [
                    { job: { position: { contains: q, mode: "insensitive" } } },
                    { job: { company: { contains: q, mode: "insensitive" } } },
                    { status: { contains: q, mode: "insensitive" } },
                  ] as any,
                }
              : {}),
          },
          include: {
            job: {
              select: { company: true, position: true, location: true },
            },
          },
          take: 8,
          orderBy: { updatedAt: "desc" },
        }),
        prisma.tailoredResume.findMany({
          where: {
            userId,
            ...(q
              ? {
                  OR: [
                    { targetRole: { contains: q, mode: "insensitive" } },
                    { targetCompany: { contains: q, mode: "insensitive" } },
                  ],
                }
              : {}),
          },
          take: 5,
          orderBy: { createdAt: "desc" },
        }),
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
          take: 6,
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
          take: 5,
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
          take: 4,
          orderBy: { createdAt: "desc" },
        }),
        prisma.jobOffer.findMany({
          where: {
            userId,
            ...(q
              ? {
                  OR: [
                    { company: { contains: q, mode: "insensitive" } },
                    { role: { contains: q, mode: "insensitive" } },
                    { status: { contains: q, mode: "insensitive" } },
                  ],
                }
              : {}),
          },
          take: 4,
          orderBy: { createdAt: "desc" },
        }),
      ]);

    const applicationResults: SearchResultItem[] = applications.map((app) => ({
      id: `app-${app.id}`,
      title: `${app.job.position} • ${app.job.company}`,
      subtitle: `Stage: ${app.status} • Location: ${app.job.location || "Remote"}`,
      badge: app.status,
      url: `/applications/${app.id}`,
      category: "applications",
    }));

    const tailoredResults: SearchResultItem[] = tailoredResumes.map((tr) => ({
      id: `tailored-${tr.id}`,
      title: `Tailored: ${tr.targetRole}`,
      subtitle: `${tr.targetCompany} • ${tr.matchScoreEstimate ? `${tr.matchScoreEstimate}% ATS Fit` : "ATS Optimized"}`,
      badge: "Tailored PDF",
      url: `/resumes/tailor/${tr.id}`,
      category: "resumes",
    }));

    const jobResults: SearchResultItem[] = jobs.map((job) => ({
      id: `job-${job.id}`,
      title: job.position,
      subtitle: `${job.company}${job.location ? ` • ${job.location}` : ""}`,
      badge: "Saved Job",
      url: `/jobs`,
      category: "jobs",
    }));

    const resumeResults: SearchResultItem[] = resumes.map((res) => ({
      id: `resume-${res.id}`,
      title: res.name,
      subtitle: res.targetRole ? `Target: ${res.targetRole}` : "Primary Master Resume",
      badge: res.analysis?.overallScore
        ? `${res.analysis.overallScore}% ATS`
        : res.resumeType || "Resume",
      url: `/resumes`,
      category: "resumes",
    }));

    const interviewResults: SearchResultItem[] = interviewSessions.map((session) => ({
      id: `interview-${session.id}`,
      title: `${session.role} Mock Interview`,
      subtitle: `${session.difficulty} level simulation`,
      badge: session.overallScore ? `${session.overallScore}/10` : "Practice",
      url: `/coach`,
      category: "interviews",
    }));

    const offerResults: SearchResultItem[] = jobOffers.map((o) => ({
      id: `offer-${o.id}`,
      title: `${o.company} Offer — $${(o.annualTC / 1000).toFixed(0)}k Year 1 TC`,
      subtitle: `${o.role} • Status: ${o.status}`,
      badge: "Offer",
      url: `/offers`,
      category: "applications",
    }));

    const publicPortfolioUrl = profile?.username
      ? `https://careerpilot.app/p/${profile.username}`
      : null;

    const matchedQuestions: SearchResultItem[] = q
      ? QUESTION_BANK.filter(
          (item) =>
            item.question.toLowerCase().includes(q) ||
            item.company.toLowerCase().includes(q) ||
            item.role.toLowerCase().includes(q) ||
            item.tags.some((t) => t.toLowerCase().includes(q))
        )
          .slice(0, 3)
          .map((qb) => ({
            id: `qb-${qb.id}`,
            title: `[${qb.company}] ${qb.question.slice(0, 60)}...`,
            subtitle: `${qb.role} • ${qb.category} (${qb.difficulty})`,
            badge: qb.company,
            url: `/coach/questions`,
            category: "interviews",
          }))
      : [];

    return {
      success: true,
      publicPortfolioUrl,
      results: [
        ...matchedActions,
        ...applicationResults,
        ...offerResults,
        ...tailoredResults,
        ...jobResults,
        ...resumeResults,
        ...matchedQuestions,
        ...interviewResults,
        ...matchedPages,
      ],
    };
  } catch (error) {
    console.error("Global search error:", error);
    return { success: false, results: [] };
  }
}
