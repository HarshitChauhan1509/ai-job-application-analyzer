"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getProfileDataAction } from "./profile";
import { generateOutreachPitches, OutreachPitchResult } from "@/lib/ai/outreach-generator";
import { hasEnoughCredits, deductCredits, CREDIT_COSTS } from "@/lib/credits";
import { revalidatePath } from "next/cache";

export async function generateOutreachPitchAction(params: {
  applicationId?: string;
  companyName?: string;
  roleTitle?: string;
  jobDescription?: string;
  recipientName?: string;
}): Promise<{
  success: boolean;
  pitches?: OutreachPitchResult;
  company?: string;
  role?: string;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify candidate has sufficient AI credits
    const creditCheck = await hasEnoughCredits(user.id, CREDIT_COSTS.OUTREACH_PITCH);
    if (!creditCheck.hasEnough) {
      return {
        success: false,
        error: `Insufficient AI credits (${creditCheck.currentBalance} left). Generating founder pitches requires ${CREDIT_COSTS.OUTREACH_PITCH} credits. Please upgrade or top up.`,
      };
    }

    let company = params.companyName?.trim() || "";
    let role = params.roleTitle?.trim() || "";
    let jdText = params.jobDescription?.trim() || "";

    // If an applicationId is passed, look up DB application and related job
    if (params.applicationId) {
      const app = await prisma.application.findUnique({
        where: { id: params.applicationId },
        include: {
          job: {
            include: {
              analysis: true,
            },
          },
        },
      });

      if (app && app.job) {
        if (!company) company = app.job.company;
        if (!role) role = app.job.position;
        if (!jdText) {
          jdText = app.job.description || "";
          if (app.job.analysis) {
            jdText += `\nRequired Skills: ${app.job.analysis.requiredSkills}\nResponsibilities: ${app.job.analysis.responsibilities}`;
          }
        }

        // Record tracking event
        await prisma.applicationEvent.create({
          data: {
            applicationId: app.id,
            type: "OUTREACH_GENERATED",
            description: `Generated AI outreach pitches for ${company}`,
          },
        }).catch((e) => console.warn("Failed to create application event:", e));
      }
    }

    if (!company) company = "Startup";
    if (!role) role = "Software Engineer";

    // Retrieve candidate profile data
    const profileRes = await getProfileDataAction();
    const profile = profileRes.profile;

    // Retrieve primary resume for skills
    const primaryResume = await prisma.resume.findFirst({
      where: { userId: user.id, isPrimary: true },
    });

    const candidateSkills: string[] = [];
    if (primaryResume?.tags) {
      try {
        const parsed = JSON.parse(primaryResume.tags);
        if (Array.isArray(parsed)) candidateSkills.push(...parsed);
      } catch {
        // fallback
      }
    }

    if (profile?.experience) {
      profile.experience.forEach((exp) => {
        if (exp.skills) candidateSkills.push(...exp.skills);
      });
    }

    const portfolioUrl = profile?.username
      ? `https://careerpilot.app/p/${profile.username}`
      : profile?.id
      ? `https://careerpilot.app/p/${profile.id}`
      : null;

    const candidateProjects = (profile?.githubProjects || []).map((p) => ({
      name: p.name,
      description: p.description,
      language: p.language,
      stars: p.stars,
      url: p.url,
    }));

    const pitches = await generateOutreachPitches({
      candidateName: user.name || profile?.name || "Candidate",
      candidateHeadline: profile?.headline,
      candidateBio: profile?.bio,
      candidateSkills: Array.from(new Set(candidateSkills)),
      candidateExperience: profile?.experience || [],
      candidateProjects,
      companyName: company,
      roleTitle: role,
      jobDescription: jdText,
      recipientName: params.recipientName,
      portfolioUrl,
    });

    // Deduct credits and log to ledger
    await deductCredits({
      userId: user.id,
      amount: CREDIT_COSTS.OUTREACH_PITCH,
      action: "OUTREACH_PITCH",
      description: `Generated founder & lead outreach pitches for ${company}`,
    });

    revalidatePath("/", "layout");
    revalidatePath("/applications");

    return {
      success: true,
      pitches,
      company,
      role,
    };
  } catch (error) {
    console.error("Error generating outreach pitches:", error);
    return { success: false, error: "Failed to generate outreach pitch" };
  }
}
