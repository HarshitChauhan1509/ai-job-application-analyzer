import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import ApplicationsClient from "./applications-client";

export default async function ApplicationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    include: {
      job: {
        include: {
          analysis: { select: { id: true } },
          jobMatches: {
            orderBy: { overallScore: "desc" },
            take: 1,
            select: { overallScore: true, resumeId: true },
          },
        },
      },
      resume: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return <ApplicationsClient initialApplications={applications} />;
}
