"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getPaymentAdapter, PlanTier, BillingCycle } from "@/lib/payments";
import { getOrCreateUserCredit, addCredits } from "@/lib/credits";

export interface CreateCheckoutResponse {
  success: boolean;
  checkoutUrl?: string;
  sessionId?: string;
  error?: string;
}

export interface UserBillingStatus {
  plan: PlanTier;
  status: string;
  provider: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  creditBalance: number;
  orders: Array<{
    id: string;
    orderId: string;
    amount: number;
    currency: string;
    plan: string;
    status: string;
    createdAt: Date;
  }>;
}

/**
 * Creates a hosted checkout session with Stripe or Dodo Payments.
 */
export async function createCheckoutSessionAction(params: {
  plan: "PRO" | "LIFETIME";
  isAnnual?: boolean;
}): Promise<CreateCheckoutResponse> {
  const user = await getCurrentUser();
  if (!user || !user.email) {
    return { success: false, error: "Please log in to upgrade your account." };
  }

  const { plan, isAnnual } = params;
  const billingCycle: BillingCycle = isAnnual ? "annual" : "monthly";

  try {
    const adapter = getPaymentAdapter();

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      "http://localhost:3000";

    const successUrl = `${appUrl}/dashboard/billing/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`;
    const cancelUrl = `${appUrl}/pricing`;

    const session = await adapter.createCheckoutSession({
      userId: user.id,
      userEmail: user.email,
      userName: user.name || undefined,
      plan,
      billingCycle,
      successUrl,
      cancelUrl,
    });

    // Record initial pending payment order
    const amount = plan === "LIFETIME" ? 9900 : isAnnual ? 18000 : 1900;

    await prisma.paymentOrder.upsert({
      where: { orderId: session.sessionId },
      create: {
        userId: user.id,
        orderId: session.sessionId,
        amount,
        currency: "USD",
        plan,
        status: "PENDING",
        provider: session.provider,
      },
      update: {
        status: "PENDING",
      },
    });

    return {
      success: true,
      checkoutUrl: session.checkoutUrl,
      sessionId: session.sessionId,
    };
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    return {
      success: false,
      error: error.message || "Failed to initialize payment checkout.",
    };
  }
}

/**
 * Creates a customer portal session for managing payment methods and cancellations.
 */
export async function createBillingPortalAction(): Promise<{
  success: boolean;
  portalUrl?: string;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    if (!subscription || !subscription.customerId) {
      return {
        success: false,
        error: "No active customer subscription found to manage.",
      };
    }

    const adapter = getPaymentAdapter();
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      "http://localhost:3000";

    const portal = await adapter.createBillingPortalSession({
      customerId: subscription.customerId,
      returnUrl: `${appUrl}/dashboard`,
    });

    return {
      success: true,
      portalUrl: portal.url,
    };
  } catch (error: any) {
    console.error("Error creating billing portal:", error);
    return {
      success: false,
      error: error.message || "Failed to load billing portal.",
    };
  }
}

/**
 * Retrieves the full billing status, subscription, and order history for the candidate.
 */
export async function getUserBillingStatusAction(): Promise<{
  success: boolean;
  billing?: UserBillingStatus;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const [subscription, userCredit, orders] = await Promise.all([
      prisma.subscription.findUnique({
        where: { userId: user.id },
      }),
      getOrCreateUserCredit(user.id),
      prisma.paymentOrder.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const plan: PlanTier =
      subscription && subscription.status === "ACTIVE"
        ? (subscription.plan as PlanTier)
        : "FREE";

    return {
      success: true,
      billing: {
        plan,
        status: subscription?.status || "ACTIVE",
        provider: subscription?.provider || "STRIPE",
        currentPeriodEnd: subscription?.currentPeriodEnd || null,
        cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
        creditBalance: userCredit.balance,
        orders: orders.map((o) => ({
          id: o.id,
          orderId: o.orderId,
          amount: o.amount,
          currency: o.currency,
          plan: o.plan,
          status: o.status,
          createdAt: o.createdAt,
        })),
      },
    };
  } catch (error: any) {
    console.error("Error fetching billing status:", error);
    return {
      success: false,
      error: error.message || "Failed to load billing status.",
    };
  }
}

/**
 * Simulates a successful checkout completion in development/test mode.
 * Activates subscription and allocates credits without needing external webhooks.
 */
export async function simulateMockUpgradeAction(params: {
  sessionId: string;
  plan: "PRO" | "LIFETIME";
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const { sessionId, plan } = params;

  try {
    const creditsToAdd = plan === "LIFETIME" ? 5000 : 1000;
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + (plan === "LIFETIME" ? 3650 : 30));

    // 1. Upsert Subscription
    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        plan,
        status: "ACTIVE",
        provider: "STRIPE",
        subscriptionId: `sub_${sessionId}`,
        customerId: `cus_${user.id.substring(0, 8)}`,
        currentPeriodEnd: periodEnd,
      },
      update: {
        plan,
        status: "ACTIVE",
        currentPeriodEnd: periodEnd,
      },
    });

    // 2. Update PaymentOrder status to COMPLETED
    await prisma.paymentOrder.upsert({
      where: { orderId: sessionId },
      create: {
        userId: user.id,
        orderId: sessionId,
        amount: plan === "LIFETIME" ? 9900 : 1900,
        currency: "USD",
        plan,
        status: "COMPLETED",
        provider: "STRIPE",
      },
      update: {
        status: "COMPLETED",
      },
    });

    // 3. Award Plan Credits to UserCredit
    await addCredits({
      userId: user.id,
      amount: creditsToAdd,
      action: "PLAN_PURCHASE",
      description: `Upgrade to ${plan} Plan (+${creditsToAdd} AI Credits)`,
    });

    revalidatePath("/", "layout");
    revalidatePath("/dashboard");
    revalidatePath("/pricing");

    return {
      success: true,
      message: `Account upgraded to ${plan}! Awarded ${creditsToAdd} AI credits.`,
    };
  } catch (error: any) {
    console.error("Error in simulateMockUpgradeAction:", error);
    return {
      success: false,
      error: error.message || "Failed to process mock upgrade.",
    };
  }
}
