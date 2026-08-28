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

import { matchJobToResume } from "@/lib/ai/job-matcher";
import { improveResumeBullet, ImprovementAction } from "@/lib/ai/resume-improver";

export async function matchJobAction(resumeId: string, jobId: string, resumeText: string, jobText: string) {
  try {
    const matchResult = await matchJobToResume(resumeText, jobText);
    
    const savedMatch = await prisma.jobMatch.upsert({
      where: {
        resumeId_jobId: {
          resumeId,
          jobId,
        }
      },
      create: {
        resumeId,
        jobId,
        ...matchResult,
      },
      update: {
        ...matchResult,
      }
    });

    revalidatePath(`/dashboard/match/${resumeId}/${jobId}`);
    
    return { success: true, match: savedMatch };
  } catch (error) {
    console.error("Error in matchJobAction:", error);
    return { success: false, error: "Failed to match job" };
  }
}

export async function improveBulletAction(
  originalBullet: string, 
  action: ImprovementAction, 
  jobContext?: string
) {
  try {
    const result = await improveResumeBullet(originalBullet, action, jobContext);
    return { success: true, improvement: result };
  } catch (error) {
    console.error("Error in improveBulletAction:", error);
    return { success: false, error: "Failed to improve bullet point" };
  }
}

import { generateInterviewQuestions, evaluateInterviewAnswer } from "@/lib/ai/interview-coach";

export async function generateQuestionsAction(role: string, difficulty: string, numQuestions: number, categories: string[]) {
  try {
    const result = await generateInterviewQuestions(role, difficulty, numQuestions, categories);
    // In a real implementation, we would create a new InterviewSession in the DB here
    // and store the questions.
    return { success: true, questions: result.questions };
  } catch (error) {
    console.error("Error in generateQuestionsAction:", error);
    return { success: false, error: "Failed to generate interview questions" };
  }
}

export async function evaluateAnswerAction(role: string, question: string, answer: string) {
  try {
    const evaluation = await evaluateInterviewAnswer(role, question, answer);
    // In a real implementation, we would store this InterviewAnswer in the DB.
    return { success: true, evaluation };
  } catch (error) {
    console.error("Error in evaluateAnswerAction:", error);
    return { success: false, error: "Failed to evaluate answer" };
  }
}
