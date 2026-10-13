import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Fetch real stats
  const resumesCount = await prisma.resume.count({ where: { userId: user.id } });
  const jobsCount = await prisma.job.count({ where: { userId: user.id } });
  
  const activeApplicationsCount = await prisma.application.count({
    where: { 
      userId: user.id,
      status: { notIn: ["REJECTED", "OFFER", "SAVED"] }
    }
  });

  const upcomingInterviewsCount = await prisma.application.count({
    where: {
      userId: user.id,
      status: "INTERVIEW"
    }
  });

  const recentApplications = await prisma.application.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 3,
    include: { job: true }
  });

  // Calculate real pipeline counts
  const pipelineGrouping = await prisma.application.groupBy({
    by: ["status"],
    where: { userId: user.id },
    _count: { status: true },
  });

  const statusMap: Record<string, number> = {
    SAVED: 0,
    APPLIED: 0,
    SCREENING: 0,
    INTERVIEW: 0,
    OFFER: 0,
  };

  pipelineGrouping.forEach((item) => {
    if (item.status in statusMap) {
      statusMap[item.status] = item._count.status;
    }
  });

  const totalPipelineApps = Object.values(statusMap).reduce((acc, curr) => acc + curr, 0);

  const pipeline = [
    { label: "Saved", status: "SAVED", count: statusMap.SAVED, color: "bg-slate-500", percent: totalPipelineApps > 0 ? Math.round((statusMap.SAVED / totalPipelineApps) * 100) : 0 },
    { label: "Applied", status: "APPLIED", count: statusMap.APPLIED, color: "bg-blue-500", percent: totalPipelineApps > 0 ? Math.round((statusMap.APPLIED / totalPipelineApps) * 100) : 0 },
    { label: "Screening", status: "SCREENING", count: statusMap.SCREENING, color: "bg-amber-500", percent: totalPipelineApps > 0 ? Math.round((statusMap.SCREENING / totalPipelineApps) * 100) : 0 },
    { label: "Interview", status: "INTERVIEW", count: statusMap.INTERVIEW, color: "bg-purple-500", percent: totalPipelineApps > 0 ? Math.round((statusMap.INTERVIEW / totalPipelineApps) * 100) : 0 },
    { label: "Offer", status: "OFFER", count: statusMap.OFFER, color: "bg-green-500", percent: totalPipelineApps > 0 ? Math.round((statusMap.OFFER / totalPipelineApps) * 100) : 0 },
  ];

  // Aggregate real skills and missing keywords
  const jobAnalyses = await prisma.jobAnalysis.findMany({
    where: { job: { userId: user.id } },
    select: { requiredSkills: true, preferredSkills: true },
    take: 10,
  });

  const resumeAnalyses = await prisma.resumeAnalysis.findMany({
    where: { resume: { userId: user.id } },
    select: { missingKeywords: true, recommendations: true },
    take: 5,
  });

  const missingSkillsCountMap: Record<string, number> = {};

  // Extract from resume analysis missingKeywords
  resumeAnalyses.forEach((ra) => {
    try {
      const parsed = JSON.parse(ra.missingKeywords || "[]");
      if (Array.isArray(parsed)) {
        parsed.forEach((kw: string) => {
          const clean = kw.trim();
          if (clean) {
            missingSkillsCountMap[clean] = (missingSkillsCountMap[clean] || 0) + 1;
          }
        });
      }
    } catch {}
  });

  // Also check requiredSkills from jobs
  jobAnalyses.forEach((ja) => {
    try {
      const req = JSON.parse(ja.requiredSkills || "[]");
      if (Array.isArray(req)) {
        req.forEach((sk: string) => {
          const clean = sk.trim();
          if (clean && !missingSkillsCountMap[clean]) {
            missingSkillsCountMap[clean] = 1;
          }
        });
      }
    } catch {}
  });

  const topMissingSkills = Object.keys(missingSkillsCountMap)
    .sort((a, b) => missingSkillsCountMap[b] - missingSkillsCountMap[a])
    .slice(0, 6);

  // Dynamic recommendation
  let recommendation = {
    title: "AI Job Copilot Ready",
    description: "Welcome to CareerPilot! Upload your primary resume and save a few target job descriptions to automatically generate tailored match scores and ATS optimization tips.",
    actionText: "Upload First Resume",
    actionLink: "/resumes",
  };

  if (resumesCount > 0 && jobsCount === 0) {
    recommendation = {
      title: "Add Target Job Postings",
      description: "You've uploaded a resume! Now analyze a target job description to see how your background matches and what keywords you're missing.",
      actionText: "Analyze a Job",
      actionLink: "/jobs",
    };
  } else if (resumesCount > 0 && jobsCount > 0 && topMissingSkills.length > 0) {
    const skillList = topMissingSkills.slice(0, 2).join(" and ");
    recommendation = {
      title: "Key Skill Opportunities Detected",
      description: `Across your target roles and resume analysis, ${skillList} frequently appear as missing skills. Consider emphasizing related projects or refining your bullet points.`,
      actionText: "Improve Resume Bullets",
      actionLink: "/improve",
    };
  } else if (resumesCount > 0 && jobsCount > 0) {
    recommendation = {
      title: "Tailor Your Next Application",
      description: "Your resumes and target roles are in sync. Practice mock interview questions for your upcoming opportunities with the AI Coach.",
      actionText: "Practice with AI Coach",
      actionLink: "/coach",
    };
  }

  const stats = {
    resumesCount,
    jobsCount,
    activeApplicationsCount,
    upcomingInterviewsCount,
  };

  return (
    <DashboardClient
      userId={user.id}
      stats={stats}
      recentApplications={recentApplications}
      pipeline={pipeline}
      missingSkills={topMissingSkills}
      recommendation={recommendation}
    />
  );
}
