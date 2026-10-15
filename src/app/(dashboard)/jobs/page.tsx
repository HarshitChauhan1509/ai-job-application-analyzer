import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import JobsClient from "./jobs-client";

export default async function JobsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const jobs = await prisma.job.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      analysis: true,
      jobMatches: {
        orderBy: { overallScore: "desc" },
        take: 1,
      },
      applications: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  return <JobsClient initialJobs={jobs} userId={user.id} />;
}
