"use server";

import { analyzeResume } from "@/lib/ai/resume-analyzer";
import { analyzeJobDescription } from "@/lib/ai/job-analyzer";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function processResumeAction(resumeId: string, resumeText: string) {
  try {
    const analysisResult = await analyzeResume(resumeText);
    
    const savedAnalysis = await prisma.resumeAnalysis.upsert({
      where: { resumeId },
      create: {
        resumeId,
        ...analysisResult,
      },
      update: {
        ...analysisResult,
      }
    });

    revalidatePath(`/dashboard/resumes/${resumeId}`);
    revalidatePath("/dashboard/resumes");
    
    return { success: true, analysis: savedAnalysis };
  } catch (error) {
    console.error("Error in processResumeAction:", error);
    return { success: false, error: "Failed to analyze resume" };
  }
}

export async function processJobAction(jobId: string, jobDescriptionText: string) {
  try {
    const analysisResult = await analyzeJobDescription(jobDescriptionText);
    
    const savedAnalysis = await prisma.jobAnalysis.upsert({
      where: { jobId },
      create: {
        jobId,
        ...analysisResult,
      },
      update: {
        ...analysisResult,
      }
    });

    revalidatePath(`/dashboard/jobs/${jobId}`);
    
    return { success: true, analysis: savedAnalysis };
  } catch (error) {
    console.error("Error in processJobAction:", error);
    return { success: false, error: "Failed to analyze job" };
  }
}
