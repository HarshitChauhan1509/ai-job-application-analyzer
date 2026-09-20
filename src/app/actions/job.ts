"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { analyzeJobDescription } from "@/lib/ai/job-analyzer";

export async function createAndAnalyzeJobAction(descriptionText: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Call the AI analyzer to extract details
    const analysisResult = await analyzeJobDescription(descriptionText);

    // Provide fallbacks if AI fails to extract
    const company = analysisResult.company || "Unknown Company";
    const position = analysisResult.position || "Unknown Role";

    // Create both Job and JobAnalysis in a transaction
    const job = await prisma.$transaction(async (tx) => {
      const newJob = await tx.job.create({
        data: {
          userId: user.id,
          company,
          position,
          description: descriptionText,
          location: analysisResult.location || null,
          employmentType: analysisResult.employmentType || null,
          experienceRequirement: analysisResult.experienceRequirement || null,
        },
      });

      await tx.jobAnalysis.create({
        data: {
          jobId: newJob.id,
          requiredSkills: JSON.stringify(analysisResult.requiredSkills || []),
          preferredSkills: JSON.stringify(analysisResult.preferredSkills || []),
          responsibilities: JSON.stringify(analysisResult.responsibilities || []),
          keywords: JSON.stringify(analysisResult.keywords || []),
          seniority: analysisResult.seniority || null,
        },
      });

      return newJob;
    });

    revalidatePath("/jobs");
    revalidatePath("/dashboard");
    return { success: true, job };
  } catch (error) {
    console.error("Failed to create and analyze job:", error);
    return { success: false, error: "Failed to process job description" };
  }
}
