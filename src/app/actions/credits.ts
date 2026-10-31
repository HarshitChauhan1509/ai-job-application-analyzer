"use server";

import { getCurrentUser } from "@/lib/auth";
import {
  getOrCreateUserCredit,
  getCreditLedgerHistory,
  hasEnoughCredits,
  CREDIT_COSTS,
  CreditAction,
  UserCreditSummary,
} from "@/lib/credits";

export interface GetCreditsResponse {
  success: boolean;
  credit?: UserCreditSummary;
  history?: Array<{
    id: string;
    amount: number;
    balanceAfter: number;
    action: string;
    description: string | null;
    createdAt: Date;
  }>;
  costs?: Record<string, number>;
  error?: string;
}

/**
 * Fetches the authenticated user's current credit summary and recent ledger transactions.
 */
export async function getUserCreditsAction(): Promise<GetCreditsResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  try {
    const credit = await getOrCreateUserCredit(user.id);
    const history = await getCreditLedgerHistory(user.id, 15);

    return {
      success: true,
      credit,
      history,
      costs: CREDIT_COSTS,
    };
  } catch (error: any) {
    console.error("Error in getUserCreditsAction:", error);
    return {
      success: false,
      error: error.message || "Failed to load user credit profile",
    };
  }
}

/**
 * Checks whether the user can perform a specific credit-consuming action.
 */
export async function checkActionCreditsAction(action: CreditAction): Promise<{
  success: boolean;
  hasEnough: boolean;
  requiredCredits: number;
  currentBalance: number;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      hasEnough: false,
      requiredCredits: 0,
      currentBalance: 0,
      error: "Unauthorized",
    };
  }

  const requiredCredits = CREDIT_COSTS[action] ?? 1;
  const { hasEnough, currentBalance } = await hasEnoughCredits(user.id, requiredCredits);

  return {
    success: true,
    hasEnough,
    requiredCredits,
    currentBalance,
  };
}
