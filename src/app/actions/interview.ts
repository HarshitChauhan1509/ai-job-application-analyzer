"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { generateInterviewQuestions, evaluateInterviewAnswer } from "@/lib/ai/interview-coach";
import { hasEnoughCredits, deductCredits, CREDIT_COSTS } from "@/lib/credits";

async function getAuthenticatedUser() {
  const user = await getCurrentUser();
  if (user) return user;

  // Fallback for development/demo mode if not logged in
  let demoUser = await prisma.user.findFirst();
  if (!demoUser) {
    demoUser = await prisma.user.create({
      data: {
        name: "Demo Candidate",
        email: "candidate@careerpilot.local",
        password: "democandidate123",
      },
    });
  }
  return demoUser;
}

export interface CreateInterviewSessionInput {
  role: string;
  difficulty: string;
  numQuestions: number;
  categories: string[];
  jobId?: string;
}

/**
 * Retrieves saved jobs for the user so they can practice for an imported JD.
 */
export async function getSavedJobsForInterviewAction() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: true, jobs: [] };

    const jobs = await prisma.job.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        company: true,
        position: true,
        description: true,
        location: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return { success: true, jobs };
  } catch (error) {
    console.error("Error fetching jobs for interview coach:", error);
    return { success: false, error: "Failed to load jobs", jobs: [] };
  }
}

/**
 * Creates a new interview session and generates questions using AI or heuristics.
 */
export async function createInterviewSessionAction(input: CreateInterviewSessionInput) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const { role, difficulty, numQuestions = 3, categories = ["General"], jobId } = input;

    // Credit Balance Verification
    const creditCost = CREDIT_COSTS.MOCK_INTERVIEW || 10;
    const creditCheck = await hasEnoughCredits(user.id, creditCost);
    if (!creditCheck.hasEnough) {
      return {
        success: false,
        error: `Insufficient AI credits. You need ${creditCost} credits to start an interview session, but only have ${creditCheck.currentBalance} credits remaining.`,
      };
    }

    let jobContext: string | undefined;
    if (jobId) {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: { analysis: true },
      });
      if (job) {
        jobContext = `Role: ${job.position} at ${job.company}\nDescription: ${job.description.slice(0, 1000)}`;
      }
    }

    // Generate questions using AI / heuristic fallback
    const { questions: generatedQuestions } = await generateInterviewQuestions(
      role,
      difficulty,
      Math.max(1, Math.min(numQuestions, 10)),
      categories.length > 0 ? categories : ["System Design", "Behavioral"],
      jobContext
    );

    // Save session and questions in DB
    const session = await prisma.interviewSession.create({
      data: {
        userId: user.id,
        role,
        difficulty,
        questions: {
          create: generatedQuestions.map((q, idx) => ({
            question: q.question,
            category: q.category || "General",
            orderIndex: idx,
          })),
        },
      },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    // Deduct AI credits for the mock interview session
    await deductCredits({
      userId: user.id,
      amount: creditCost,
      action: "MOCK_INTERVIEW",
      description: `Mock Interview practice session: ${role} (${difficulty})`,
    });

    revalidatePath("/coach");
    return { success: true, sessionId: session.id };
  } catch (error) {
    console.error("Error creating interview session:", error);
    return { success: false, error: "Failed to create practice session" };
  }
}

/**
 * Retrieves an interview session with all its questions and current answers.
 */
export async function getInterviewSessionAction(sessionId: string) {
  try {
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
          include: {
            answer: true,
          },
        },
      },
    });

    if (!session) {
      return { success: false, error: "Practice session not found" };
    }

    // Parse stored JSON feedback for answers
    const formattedQuestions = session.questions.map((q) => {
      let parsedEvaluation = null;
      if (q.answer?.feedback) {
        try {
          parsedEvaluation = JSON.parse(q.answer.feedback);
        } catch {
          parsedEvaluation = {
            scores: { overall: q.answer.score ?? 7, technical: 7, communication: 7, specificity: 7 },
            strengths: ["Clear response"],
            weaknesses: [],
            missingConcepts: [],
            idealStructure: q.answer.feedback,
            modelAnswer: null,
            followUpQuestion: null,
          };
        }
      }

      return {
        ...q,
        evaluation: parsedEvaluation,
      };
    });

    return {
      success: true,
      session: {
        ...session,
        questions: formattedQuestions,
      },
    };
  } catch (error) {
    console.error("Error fetching interview session:", error);
    return { success: false, error: "Failed to fetch interview session" };
  }
}

/**
 * Evaluates a candidate's answer to a question and saves the score and feedback.
 */
export async function submitInterviewAnswerAction(input: {
  sessionId: string;
  questionId: string;
  answerText: string;
}) {
  try {
    const { sessionId, questionId, answerText } = input;

    if (!answerText || answerText.trim().length < 5) {
      return { success: false, error: "Please provide a more substantial answer" };
    }

    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        questions: {
          include: { answer: true },
        },
      },
    });

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    const currentQuestion = session.questions.find((q) => q.id === questionId);
    if (!currentQuestion) {
      return { success: false, error: "Question not found in this session" };
    }

    // Evaluate answer via AI engine
    const evaluation = await evaluateInterviewAnswer(session.role, currentQuestion.question, answerText);

    // Save answer in database
    await prisma.interviewAnswer.upsert({
      where: { interviewQuestionId: questionId },
      create: {
        interviewQuestionId: questionId,
        answer: answerText,
        score: evaluation.scores.overall,
        feedback: JSON.stringify(evaluation),
      },
      update: {
        answer: answerText,
        score: evaluation.scores.overall,
        feedback: JSON.stringify(evaluation),
      },
    });

    // Re-check all answers to calculate session completion and overall score
    const updatedQuestions = await prisma.interviewQuestion.findMany({
      where: { interviewSessionId: sessionId },
      include: { answer: true },
    });

    const answeredQuestions = updatedQuestions.filter((q) => q.answer !== null);
    const totalQuestions = updatedQuestions.length;
    const isCompleted = answeredQuestions.length === totalQuestions;

    let averageScore: number | null = null;
    if (answeredQuestions.length > 0) {
      const totalScore = answeredQuestions.reduce((acc, q) => acc + (q.answer?.score ?? 0), 0);
      averageScore = Math.round((totalScore / answeredQuestions.length) * 10) / 10;
    }

    if (isCompleted && averageScore !== null) {
      await prisma.interviewSession.update({
        where: { id: sessionId },
        data: {
          overallScore: averageScore,
          completedAt: new Date(),
          feedback: `Practice session completed with ${totalQuestions} questions. Overall average score: ${averageScore}/10.`,
        },
      });

      // Optionally create a notification
      try {
        await prisma.notification.create({
          data: {
            userId: session.userId,
            title: "Interview Session Completed",
            message: `You completed your ${session.difficulty} ${session.role} mock interview with an average score of ${averageScore}/10!`,
            type: "INFO",
            link: `/coach/session?sessionId=${sessionId}`,
          },
        });
      } catch (err) {
        console.warn("Could not create completion notification:", err);
      }
    } else if (averageScore !== null) {
      await prisma.interviewSession.update({
        where: { id: sessionId },
        data: {
          overallScore: averageScore,
        },
      });
    }

    revalidatePath(`/coach/session`);
    revalidatePath(`/coach`);

    return {
      success: true,
      evaluation,
      isCompleted,
      sessionScore: averageScore,
    };
  } catch (error) {
    console.error("Error submitting interview answer:", error);
    return { success: false, error: "Failed to evaluate and save answer" };
  }
}

/**
 * Retrieves past interview sessions for the current user.
 */
export async function getPastInterviewSessionsAction() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: true, sessions: [] };

    const sessions = await prisma.interviewSession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        questions: {
          include: { answer: true },
        },
      },
      take: 20,
    });

    const formatted = sessions.map((s) => {
      const answeredCount = s.questions.filter((q) => q.answer !== null).length;
      return {
        id: s.id,
        role: s.role,
        difficulty: s.difficulty,
        totalQuestions: s.questions.length,
        answeredQuestions: answeredCount,
        overallScore: s.overallScore,
        isCompleted: s.completedAt !== null || (s.questions.length > 0 && answeredCount === s.questions.length),
        createdAt: s.createdAt,
      };
    });

    return { success: true, sessions: formatted };
  } catch (error) {
    console.error("Error fetching past sessions:", error);
    return { success: false, error: "Failed to load past sessions", sessions: [] };
  }
}

/**
 * Deletes an interview session.
 */
export async function deleteInterviewSessionAction(sessionId: string) {
  try {
    await prisma.interviewSession.delete({
      where: { id: sessionId },
    });

    revalidatePath("/coach");
    return { success: true };
  } catch (error) {
    console.error("Error deleting session:", error);
    return { success: false, error: "Failed to delete session" };
  }
}

/**
 * Retrieves the candidate's active applications so they can link this interview scorecard to an application.
 */
export async function getUserApplicationsForInterviewAction() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: true, applications: [] };

    const applications = await prisma.application.findMany({
      where: { userId: user.id },
      include: {
        job: {
          select: { company: true, position: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 25,
    });

    return {
      success: true,
      applications: applications.map((a) => ({
        id: a.id,
        company: a.job.company,
        position: a.job.position,
        status: a.status,
      })),
    };
  } catch (error) {
    console.error("Error fetching user applications for interview link:", error);
    return { success: false, applications: [], error: "Failed to load applications" };
  }
}

/**
 * Logs a completed interview session directly into an application's Kanban timeline events and notes.
 */
export async function logInterviewToApplicationTimelineAction(params: {
  sessionId: string;
  applicationId: string;
}) {
  const { sessionId, applicationId } = params;

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const [session, application] = await Promise.all([
      prisma.interviewSession.findUnique({
        where: { id: sessionId },
        include: {
          questions: {
            include: { answer: true },
          },
        },
      }),
      prisma.application.findUnique({
        where: { id: applicationId },
        include: { job: true },
      }),
    ]);

    if (!session || !application) {
      return { success: false, error: "Session or application not found" };
    }

    const answered = session.questions.filter((q) => q.answer !== null);
    const avgScore =
      session.overallScore ??
      (answered.length > 0
        ? Math.round(
            (answered.reduce((acc, q) => acc + (q.answer?.score ?? 7), 0) / answered.length) *
              10
          ) / 10
        : 8.0);

    const eventDescription = `Practiced AI Mock Interview for ${session.role} (${session.difficulty} difficulty). Score: ${avgScore}/10 across ${answered.length} questions.`;

    // 1. Create ApplicationEvent
    await prisma.applicationEvent.create({
      data: {
        applicationId: application.id,
        type: "MOCK_INTERVIEW_PRACTICE",
        description: eventDescription,
      },
    });

    // 2. Append to Application notes
    const updatedNotes = application.notes
      ? `${application.notes}\n\n[Mock Interview Practice (${new Date().toLocaleDateString()})]: Score ${avgScore}/10 for ${session.role}`
      : `[Mock Interview Practice (${new Date().toLocaleDateString()})]: Score ${avgScore}/10 for ${session.role}`;

    await prisma.application.update({
      where: { id: application.id },
      data: {
        notes: updatedNotes,
      },
    });

    revalidatePath("/applications");
    revalidatePath(`/applications/${application.id}`);

    return {
      success: true,
      message: `Practice session logged to ${application.job.company} application timeline!`,
    };
  } catch (error: any) {
    console.error("Error logging interview to application timeline:", error);
    return { success: false, error: error.message || "Failed to log practice session" };
  }
}
