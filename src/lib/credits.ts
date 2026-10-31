import { prisma } from "@/lib/db";

export type PlanTier = "FREE" | "PRO" | "LIFETIME";

export type CreditAction =
  | "INITIAL_SIGNUP"
  | "RESUME_ANALYSIS"
  | "JOB_SCRAPER"
  | "OUTREACH_PITCH"
  | "EMAIL_PARSER"
  | "COPILOT_MESSAGE"
  | "MOCK_INTERVIEW"
  | "MONTHLY_REFRESH"
  | "PLAN_PURCHASE"
  | "ADMIN_ADJUSTMENT";

export const CREDIT_COSTS: Record<string, number> = {
  RESUME_ANALYSIS: 5,
  JOB_SCRAPER: 2,
  OUTREACH_PITCH: 3,
  EMAIL_PARSER: 2,
  COPILOT_MESSAGE: 1,
  MOCK_INTERVIEW: 10,
} as const;

export const INITIAL_FREE_CREDITS = 50;

export interface UserCreditSummary {
  id: string;
  userId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  plan: PlanTier;
}

/**
 * Retrieves the user's credit record, automatically creating one with initial credits if absent.
 */
export async function getOrCreateUserCredit(userId: string): Promise<UserCreditSummary> {
  let userCredit = await prisma.userCredit.findUnique({
    where: { userId },
  });

  if (!userCredit) {
    userCredit = await prisma.userCredit.create({
      data: {
        userId,
        balance: INITIAL_FREE_CREDITS,
        totalEarned: INITIAL_FREE_CREDITS,
        totalSpent: 0,
        transactions: {
          create: {
            amount: INITIAL_FREE_CREDITS,
            balanceAfter: INITIAL_FREE_CREDITS,
            action: "INITIAL_SIGNUP",
            description: "Welcome credit allocation for new candidate account",
          },
        },
      },
    });
  }

  // Get active subscription plan (if any)
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true, status: true },
  });

  const plan: PlanTier =
    subscription?.status === "ACTIVE"
      ? (subscription.plan as PlanTier)
      : "FREE";

  return {
    id: userCredit.id,
    userId: userCredit.userId,
    balance: userCredit.balance,
    totalEarned: userCredit.totalEarned,
    totalSpent: userCredit.totalSpent,
    plan,
  };
}

/**
 * Checks if the user has at least the specified number of credits.
 */
export async function hasEnoughCredits(
  userId: string,
  requiredCredits: number
): Promise<{ hasEnough: boolean; currentBalance: number }> {
  const credit = await getOrCreateUserCredit(userId);
  return {
    hasEnough: credit.balance >= requiredCredits,
    currentBalance: credit.balance,
  };
}

/**
 * Atomically deducts credits from a user's balance and records the transaction in the ledger.
 */
export async function deductCredits(params: {
  userId: string;
  amount: number;
  action: CreditAction;
  description?: string;
}): Promise<{
  success: boolean;
  error?: string;
  balanceAfter?: number;
  transactionId?: string;
}> {
  const { userId, amount, action, description } = params;

  if (amount <= 0) {
    return { success: true };
  }

  try {
    const currentCredit = await getOrCreateUserCredit(userId);

    if (currentCredit.balance < amount) {
      return {
        success: false,
        error: `Insufficient AI credits. This action requires ${amount} credits, but your current balance is ${currentCredit.balance}.`,
        balanceAfter: currentCredit.balance,
      };
    }

    const newBalance = currentCredit.balance - amount;
    const newTotalSpent = currentCredit.totalSpent + amount;

    const [updatedCredit, transaction] = await prisma.$transaction([
      prisma.userCredit.update({
        where: { userId },
        data: {
          balance: newBalance,
          totalSpent: newTotalSpent,
        },
      }),
      prisma.creditLedger.create({
        data: {
          userCreditId: currentCredit.id,
          amount: -amount,
          balanceAfter: newBalance,
          action,
          description: description || `Deducted for ${action.toLowerCase().replace(/_/g, " ")}`,
        },
      }),
    ]);

    return {
      success: true,
      balanceAfter: updatedCredit.balance,
      transactionId: transaction.id,
    };
  } catch (error: any) {
    console.error("Error deducting user credits:", error);
    return {
      success: false,
      error: error.message || "Failed to process credit deduction",
    };
  }
}

/**
 * Atomically adds credits to a user's balance (e.g. on monthly renewal, plan purchase, or top-up).
 */
export async function addCredits(params: {
  userId: string;
  amount: number;
  action: CreditAction;
  description?: string;
}): Promise<{
  success: boolean;
  error?: string;
  balanceAfter?: number;
  transactionId?: string;
}> {
  const { userId, amount, action, description } = params;

  if (amount <= 0) {
    return { success: true };
  }

  try {
    const currentCredit = await getOrCreateUserCredit(userId);
    const newBalance = currentCredit.balance + amount;
    const newTotalEarned = currentCredit.totalEarned + amount;

    const [updatedCredit, transaction] = await prisma.$transaction([
      prisma.userCredit.update({
        where: { userId },
        data: {
          balance: newBalance,
          totalEarned: newTotalEarned,
        },
      }),
      prisma.creditLedger.create({
        data: {
          userCreditId: currentCredit.id,
          amount,
          balanceAfter: newBalance,
          action,
          description: description || `Added via ${action.toLowerCase().replace(/_/g, " ")}`,
        },
      }),
    ]);

    return {
      success: true,
      balanceAfter: updatedCredit.balance,
      transactionId: transaction.id,
    };
  } catch (error: any) {
    console.error("Error adding user credits:", error);
    return {
      success: false,
      error: error.message || "Failed to add credits to account",
    };
  }
}

/**
 * Retrieves recent credit transactions for a user.
 */
export async function getCreditLedgerHistory(
  userId: string,
  take: number = 20
) {
  const userCredit = await prisma.userCredit.findUnique({
    where: { userId },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take,
      },
    },
  });

  return userCredit?.transactions || [];
}
