import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { ApplicationDetailClient } from "./application-detail-client";

export const dynamic = "force-dynamic";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  const [application, userResumes] = await Promise.all([
    prisma.application.findFirst({
      where: { id, userId: user.id },
      include: {
        job: {
          include: {
            jobMatches: {
              orderBy: { updatedAt: "desc" },
              select: {
                id: true,
                resumeId: true,
                jobId: true,
                overallScore: true,
                skillsScore: true,
                experienceScore: true,
                keywordsScore: true,
              },
            },
          },
        },
        resume: {
          select: {
            id: true,
            name: true,
            resumeType: true,
          },
        },
        events: {
          orderBy: { createdAt: "desc" },
        },
        syncedEmails: {
          orderBy: { receivedAt: "desc" },
        },
      },
    }),
    prisma.resume.findMany({
      where: { userId: user.id },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        isPrimary: true,
        resumeType: true,
      },
    }),
  ]);

  if (!application) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
        <h1 className="text-2xl font-bold tracking-tight">Application Not Found</h1>
        <p className="text-sm text-muted-foreground">
          This job application could not be found or you do not have permission to view it.
        </p>
        <Link href="/applications">
          <Button variant="outline" className="gap-2 mt-2">
            <ArrowLeft className="h-4 w-4" /> Return to Application Tracker
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <ApplicationDetailClient
      application={application}
      userResumes={userResumes}
    />
  );
}
