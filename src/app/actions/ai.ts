"use server";

import { analyzeResume } from "@/lib/ai/resume-analyzer";
import { analyzeJobDescription } from "@/lib/ai/job-analyzer";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hasEnoughCredits, deductCredits, CREDIT_COSTS } from "@/lib/credits";
import { revalidatePath } from "next/cache";

export async function processResumeAction(resumeId: string, resumeText: string) {
  try {
    const analysisResult = await analyzeResume(resumeText);
    
    const savedAnalysis = await prisma.resumeAnalysis.upsert({
      where: { resumeId },
      create: {
        resumeId,
        overallScore: analysisResult.overallScore,
        atsScore: analysisResult.atsScore,
        skillsScore: analysisResult.skillsScore,
        experienceScore: analysisResult.experienceScore,
        strengths: JSON.stringify(analysisResult.strengths),
        weaknesses: JSON.stringify(analysisResult.weaknesses),
        missingKeywords: JSON.stringify(analysisResult.missingKeywords),
        recommendations: JSON.stringify(analysisResult.recommendations),
      },
      update: {
        overallScore: analysisResult.overallScore,
        atsScore: analysisResult.atsScore,
        skillsScore: analysisResult.skillsScore,
        experienceScore: analysisResult.experienceScore,
        strengths: JSON.stringify(analysisResult.strengths),
        weaknesses: JSON.stringify(analysisResult.weaknesses),
        missingKeywords: JSON.stringify(analysisResult.missingKeywords),
        recommendations: JSON.stringify(analysisResult.recommendations),
      }
    });

    revalidatePath(`/resumes/${resumeId}`);
    revalidatePath("/resumes");
    
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
        requiredSkills: JSON.stringify(analysisResult.requiredSkills),
        preferredSkills: JSON.stringify(analysisResult.preferredSkills),
        responsibilities: JSON.stringify(analysisResult.responsibilities),
        keywords: JSON.stringify(analysisResult.keywords),
      },
      update: {
        requiredSkills: JSON.stringify(analysisResult.requiredSkills),
        preferredSkills: JSON.stringify(analysisResult.preferredSkills),
        responsibilities: JSON.stringify(analysisResult.responsibilities),
        keywords: JSON.stringify(analysisResult.keywords),
      }
    });

    revalidatePath("/jobs");
    
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
        overallScore: matchResult.overallScore,
        skillsScore: matchResult.skillsScore,
        experienceScore: matchResult.experienceScore,
        keywordsScore: matchResult.keywordsScore,
        strongMatches: JSON.stringify(matchResult.strongMatches),
        missingSkills: JSON.stringify(matchResult.missingSkills),
        missingKeywords: JSON.stringify(matchResult.missingKeywords),
        recommendations: JSON.stringify(matchResult.recommendations),
      },
      update: {
        overallScore: matchResult.overallScore,
        skillsScore: matchResult.skillsScore,
        experienceScore: matchResult.experienceScore,
        keywordsScore: matchResult.keywordsScore,
        strongMatches: JSON.stringify(matchResult.strongMatches),
        missingSkills: JSON.stringify(matchResult.missingSkills),
        missingKeywords: JSON.stringify(matchResult.missingKeywords),
        recommendations: JSON.stringify(matchResult.recommendations),
      }
    });

    revalidatePath(`/match/${resumeId}/${jobId}`);
    revalidatePath("/jobs");
    revalidatePath("/applications");
    
    return { success: true, match: savedMatch };
  } catch (error) {
    console.error("Error in matchJobAction:", error);
    return { success: false, error: "Failed to match job" };
  }
}

/**
 * Computes (or recomputes) a live AI resume-to-job match using stored Resume, Profile, and Job data.
 * Enforces credit verification & atomic deduction via CreditLedger.
 */
export async function runLiveJobMatchAction(resumeId: string, jobId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const cost = CREDIT_COSTS.JOB_MATCH ?? 2;
    const creditCheck = await hasEnoughCredits(user.id, cost);
    if (!creditCheck.hasEnough) {
      return {
        success: false,
        code: "INSUFFICIENT_CREDITS",
        requiredCredits: cost,
        currentBalance: creditCheck.currentBalance,
        error: `You need ${cost} AI credits to run a live resume-to-job match analysis (balance: ${creditCheck.currentBalance}).`,
      };
    }

    const [resume, job, profile] = await Promise.all([
      prisma.resume.findFirst({
        where: { id: resumeId, userId: user.id },
        include: { analysis: true },
      }),
      prisma.job.findFirst({
        where: {
          id: jobId,
          OR: [{ userId: user.id }, { isCurated: true }],
        },
        include: { analysis: true },
      }),
      prisma.profile.findUnique({
        where: { userId: user.id },
      }),
    ]);

    if (!resume || !job) {
      return { success: false, error: "Resume or Job record could not be found." };
    }

    const candidateSummaryParts: string[] = [
      `Resume Title: ${resume.name}`,
      resume.targetRole ? `Target Role: ${resume.targetRole}` : "",
      resume.resumeType ? `Specialization: ${resume.resumeType}` : "",
      resume.tags ? `Resume Tags: ${resume.tags}` : "",
    ];

    if (resume.analysis) {
      candidateSummaryParts.push(
        `Resume Strengths: ${resume.analysis.strengths}`,
        `Resume Recommendations: ${resume.analysis.recommendations}`
      );
    }

    if (profile) {
      if (profile.headline) candidateSummaryParts.push(`Headline: ${profile.headline}`);
      if (profile.bio) candidateSummaryParts.push(`Bio: ${profile.bio}`);
      if (profile.experience) candidateSummaryParts.push(`Work Experience: ${profile.experience}`);
      if (profile.githubProjects) candidateSummaryParts.push(`GitHub Proof-of-Work: ${profile.githubProjects}`);
    }

    const jobContextParts: string[] = [
      `Company: ${job.company}`,
      `Position: ${job.position}`,
      job.location ? `Location: ${job.location}` : "",
      `Job Description: ${job.description}`,
    ];

    if (job.analysis) {
      jobContextParts.push(
        `Required Skills: ${job.analysis.requiredSkills}`,
        `Preferred Skills: ${job.analysis.preferredSkills}`,
        `Responsibilities: ${job.analysis.responsibilities}`,
        `ATS Keywords: ${job.analysis.keywords}`
      );
    }

    const matchResult = await matchJobToResume(
      candidateSummaryParts.filter(Boolean).join("\n"),
      jobContextParts.filter(Boolean).join("\n")
    );

    const savedMatch = await prisma.jobMatch.upsert({
      where: {
        resumeId_jobId: { resumeId: resume.id, jobId: job.id },
      },
      create: {
        resumeId: resume.id,
        jobId: job.id,
        overallScore: matchResult.overallScore,
        skillsScore: matchResult.skillsScore,
        experienceScore: matchResult.experienceScore,
        keywordsScore: matchResult.keywordsScore,
        strongMatches: JSON.stringify(matchResult.strongMatches),
        missingSkills: JSON.stringify(matchResult.missingSkills),
        missingKeywords: JSON.stringify(matchResult.missingKeywords),
        recommendations: JSON.stringify(matchResult.recommendations),
      },
      update: {
        overallScore: matchResult.overallScore,
        skillsScore: matchResult.skillsScore,
        experienceScore: matchResult.experienceScore,
        keywordsScore: matchResult.keywordsScore,
        strongMatches: JSON.stringify(matchResult.strongMatches),
        missingSkills: JSON.stringify(matchResult.missingSkills),
        missingKeywords: JSON.stringify(matchResult.missingKeywords),
        recommendations: JSON.stringify(matchResult.recommendations),
      },
    });

    await deductCredits({
      userId: user.id,
      amount: cost,
      action: "JOB_MATCH",
      description: `Resume match analysis: ${resume.name} vs ${job.position} @ ${job.company}`,
    });

    revalidatePath("/", "layout");
    revalidatePath(`/match/${resume.id}/${job.id}`);
    revalidatePath("/jobs");
    revalidatePath("/applications");
    revalidatePath("/dashboard");

    return { success: true, match: savedMatch };
  } catch (error: unknown) {
    console.error("Error in runLiveJobMatchAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to run live match analysis",
    };
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
