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
      job: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  // We need to format the applications for the KanbanBoard
  // Kanban board takes initialApplications
  return <ApplicationsClient initialApplications={applications} />;
}
