import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import ResumesClient from "./resumes-client";

export default async function ResumesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [resumes, jobs, tailoredResumes] = await Promise.all([
    prisma.resume.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        analysis: true,
      },
    }),
    prisma.job.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        company: true,
        position: true,
        location: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tailoredResume.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        targetCompany: true,
        targetRole: true,
        matchScoreEstimate: true,
        updatedAt: true,
        jobId: true,
      },
    }),
  ]);

  return (
    <ResumesClient
      initialResumes={resumes}
      initialTailoredResumes={tailoredResumes}
      jobs={jobs}
      userId={user.id}
    />
  );
}
