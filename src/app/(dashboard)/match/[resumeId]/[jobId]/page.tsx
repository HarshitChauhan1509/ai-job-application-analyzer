import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { MatchAnalysisClient } from "./match-client";

export const dynamic = "force-dynamic";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ resumeId: string; jobId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { resumeId, jobId } = await params;

  const [resume, job, existingMatch, existingApplication] = await Promise.all([
    prisma.resume.findFirst({
      where: { id: resumeId, userId: user.id },
      select: { id: true, name: true, targetRole: true },
    }),
    prisma.job.findFirst({
      where: {
        id: jobId,
        OR: [{ userId: user.id }, { isCurated: true }],
      },
      select: { id: true, company: true, position: true, location: true, url: true },
    }),
    prisma.jobMatch.findUnique({
      where: {
        resumeId_jobId: { resumeId, jobId },
      },
    }),
    prisma.application.findFirst({
      where: { userId: user.id, jobId },
      select: { id: true, status: true },
    }),
  ]);

  if (!resume || !job) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
        <h1 className="text-2xl font-bold tracking-tight">Match Record Not Available</h1>
        <p className="text-sm text-muted-foreground">
          {!resume
            ? "The selected resume could not be found in your library."
            : "The selected job posting could not be found."}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/resumes">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> My Resumes
            </Button>
          </Link>
          <Link href="/jobs">
            <Button className="gap-2">Browse Saved Jobs</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <MatchAnalysisClient
      resume={resume}
      job={job}
      initialMatch={existingMatch}
      existingApplication={existingApplication}
    />
  );
}
