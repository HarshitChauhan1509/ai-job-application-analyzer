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

  const stats = {
    resumesCount,
    jobsCount,
    activeApplicationsCount,
    upcomingInterviewsCount,
  };

  return <DashboardClient stats={stats} recentApplications={recentApplications} />;
}
