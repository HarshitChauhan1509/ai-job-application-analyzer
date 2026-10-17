import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import ResumesClient from "./resumes-client";

export default async function ResumesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [resumes, jobs] = await Promise.all([
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
  ]);

  return <ResumesClient initialResumes={resumes} jobs={jobs} userId={user.id} />;
}
