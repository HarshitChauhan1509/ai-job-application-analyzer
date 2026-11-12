import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { TailorStudioClient } from "./tailor-studio-client";
import type {
  TailoredExperienceEntry,
  TailoredProjectEntry,
  TailoredSkillGroup,
} from "@/lib/ai/schema";

export const dynamic = "force-dynamic";

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default async function TailoredResumePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  const [tailored, profile] = await Promise.all([
    prisma.tailoredResume.findFirst({
      where: { id, userId: user.id },
    }),
    prisma.profile.findUnique({
      where: { userId: user.id },
      select: {
        headline: true,
        website: true,
        linkedin: true,
        github: true,
        username: true,
      },
    }),
  ]);

  if (!tailored) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
        <h1 className="text-2xl font-bold tracking-tight">Tailored Resume Not Found</h1>
        <p className="text-sm text-muted-foreground">
          This tailored resume variant does not exist or belongs to another account.
        </p>
        <Link href="/resumes">
          <Button variant="outline" className="gap-2 mt-2">
            <ArrowLeft className="h-4 w-4" /> Back to Resumes
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <TailorStudioClient
      tailored={{
        id: tailored.id,
        title: tailored.title,
        targetCompany: tailored.targetCompany,
        targetRole: tailored.targetRole,
        matchScoreEstimate: tailored.matchScoreEstimate,
        tailoredSummary: tailored.tailoredSummary,
        skillsSection: safeParseJson<TailoredSkillGroup[]>(tailored.skillsSection, []),
        tailoredExperience: safeParseJson<TailoredExperienceEntry[]>(tailored.tailoredExperience, []),
        tailoredProjects: safeParseJson<TailoredProjectEntry[]>(tailored.tailoredProjects, []),
        educationSection: tailored.educationSection,
        keywordsInjected: safeParseJson<string[]>(tailored.keywordsInjected, []),
        tailoringNotes: tailored.tailoringNotes,
        baseResumeId: tailored.baseResumeId,
        jobId: tailored.jobId,
        updatedAt: tailored.updatedAt,
      }}
      candidate={{
        name: user.name || "Candidate",
        email: user.email || "",
        headline: profile?.headline || null,
        website: profile?.website || null,
        linkedin: profile?.linkedin || null,
        github: profile?.github || null,
        username: profile?.username || null,
      }}
    />
  );
}
