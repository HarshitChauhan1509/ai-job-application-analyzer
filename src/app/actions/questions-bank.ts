"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { QUESTION_BANK, QuestionBankItem } from "@/lib/interview-questions-bank";
import { hasEnoughCredits, deductCredits } from "@/lib/credits";

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

export interface QuestionBankFilter {
  search?: string;
  company?: string;
  category?: string;
  difficulty?: string;
}

export interface QuestionBankSummary {
  questions: QuestionBankItem[];
  totalCount: number;
  companies: { name: string; count: number }[];
  categories: { name: string; count: number }[];
  difficulties: { name: string; count: number }[];
}

/**
 * Retrieves the filtered question bank along with aggregation facets.
 */
export async function getQuestionBankAction(filter: QuestionBankFilter = {}): Promise<{
  success: boolean;
  data?: QuestionBankSummary;
  error?: string;
}> {
  try {
    let filtered = [...QUESTION_BANK];

    const search = filter.search?.trim().toLowerCase();
    if (search) {
      filtered = filtered.filter(
        (q) =>
          q.question.toLowerCase().includes(search) ||
          q.company.toLowerCase().includes(search) ||
          q.role.toLowerCase().includes(search) ||
          q.context.toLowerCase().includes(search) ||
          q.tags.some((t) => t.toLowerCase().includes(search))
      );
    }

    if (filter.company && filter.company !== "ALL") {
      filtered = filtered.filter((q) => q.company.toLowerCase() === filter.company?.toLowerCase());
    }

    if (filter.category && filter.category !== "ALL") {
      filtered = filtered.filter((q) => q.category.toLowerCase() === filter.category?.toLowerCase());
    }

    if (filter.difficulty && filter.difficulty !== "ALL") {
      filtered = filtered.filter((q) => q.difficulty.toLowerCase() === filter.difficulty?.toLowerCase());
    }

    // Facet counts from all questions
    const companyCountMap: Record<string, number> = {};
    const categoryCountMap: Record<string, number> = {};
    const difficultyCountMap: Record<string, number> = {};

    QUESTION_BANK.forEach((q) => {
      companyCountMap[q.company] = (companyCountMap[q.company] || 0) + 1;
      categoryCountMap[q.category] = (categoryCountMap[q.category] || 0) + 1;
      difficultyCountMap[q.difficulty] = (difficultyCountMap[q.difficulty] || 0) + 1;
    });

    const companies = Object.entries(companyCountMap).map(([name, count]) => ({ name, count }));
    const categories = Object.entries(categoryCountMap).map(([name, count]) => ({ name, count }));
    const difficulties = Object.entries(difficultyCountMap).map(([name, count]) => ({ name, count }));

    return {
      success: true,
      data: {
        questions: filtered,
        totalCount: filtered.length,
        companies,
        categories,
        difficulties,
      },
    };
  } catch (error) {
    console.error("Error retrieving interview question bank:", error);
    return { success: false, error: "Failed to load interview question bank" };
  }
}

/**
 * Retrieves a single question by its unique identifier.
 */
export async function getQuestionByIdAction(questionId: string): Promise<{
  success: boolean;
  question?: QuestionBankItem;
  error?: string;
}> {
  try {
    const question = QUESTION_BANK.find((q) => q.id === questionId);
    if (!question) {
      return { success: false, error: "Question not found" };
    }
    return { success: true, question };
  } catch (error) {
    console.error("Error retrieving question details:", error);
    return { success: false, error: "Failed to load question details" };
  }
}

/**
 * Launches an instant 1-click AI Voice Interview Coach practice session
 * focused specifically on the target company question.
 */
export async function startSessionFromQuestionAction(questionId: string): Promise<{
  success: boolean;
  sessionId?: string;
  error?: string;
  insufficientCredits?: boolean;
}> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const question = QUESTION_BANK.find((q) => q.id === questionId);
    if (!question) {
      return { success: false, error: "Selected interview question was not found" };
    }

    // Targeted 1-question sprint is priced at 5 credits (50% discount vs full 3-question session)
    const TARGETED_PRACTICE_CREDITS = 5;
    const creditCheck = await hasEnoughCredits(user.id, TARGETED_PRACTICE_CREDITS);
    if (!creditCheck.hasEnough) {
      return {
        success: false,
        insufficientCredits: true,
        error: `Insufficient AI credits. You need ${TARGETED_PRACTICE_CREDITS} credits for targeted practice, but only have ${creditCheck.currentBalance} credits remaining.`,
      };
    }

    // Create session in database with the exact question pre-loaded
    const session = await prisma.interviewSession.create({
      data: {
        userId: user.id,
        role: `${question.company} • ${question.role}`,
        difficulty: question.difficulty,
        questions: {
          create: [
            {
              question: question.question,
              category: question.category,
              orderIndex: 0,
            },
          ],
        },
      },
      include: {
        questions: true,
      },
    });

    // Deduct AI credits
    await deductCredits({
      userId: user.id,
      amount: TARGETED_PRACTICE_CREDITS,
      action: "MOCK_INTERVIEW",
      description: `Targeted Practice: ${question.company} (${question.category})`,
    });

    revalidatePath("/coach");
    revalidatePath("/coach/questions");

    return { success: true, sessionId: session.id };
  } catch (error) {
    console.error("Error starting practice session from question bank:", error);
    return { success: false, error: "Failed to start practice session" };
  }
}
