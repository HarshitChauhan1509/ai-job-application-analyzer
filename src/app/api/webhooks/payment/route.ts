import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { addCredits } from "@/lib/credits";
import Stripe from "stripe";

// Disable Next.js body parser so we can access the raw request body for HMAC verification
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  // 1. Verify Cryptographic Webhook Signature
  if (stripeSecretKey && webhookSecret && signature) {
    try {
      const stripe = new Stripe(stripeSecretKey);
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("Stripe webhook signature verification failed:", err.message);
      return NextResponse.json(
        { error: `Webhook Signature Verification Failed: ${err.message}` },
        { status: 400 }
      );
    }
  } else if (process.env.NODE_ENV !== "production") {
    // Development / Test fallback: parse JSON payload directly if webhook secret is not configured
    try {
      event = JSON.parse(body);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }
  } else {
    return NextResponse.json(
      { error: "Missing webhook signing configuration in production" },
      { status: 400 }
    );
  }

  try {
    // 2. Handle Webhook Events (Stripe & Dodo MoR)
    const eventType = (event as any).type as string;
    switch (eventType) {
      // ========================================================
      // A) CHECKOUT SESSION COMPLETED (Initial Purchase / Upgrade)
      // ========================================================
      case "checkout.session.completed":
      case "payment.succeeded": {
        const session = (event.data?.object || event.data || event) as any;
        const userId = session.metadata?.userId;
        const plan = (session.metadata?.plan as "PRO" | "LIFETIME") || "PRO";
        const billingCycle = session.metadata?.billingCycle || "monthly";
        const orderId = session.id || session.payment_id || `order_${Date.now()}`;
        const provider = session.provider || (orderId.startsWith("dodo_") ? "DODO" : "STRIPE");

        if (!userId) {
          console.warn(`${event.type} missing userId in metadata`);
          break;
        }

        // Idempotency Guard: Check if this order was already processed
        const existingOrder = await prisma.paymentOrder.findUnique({
          where: { orderId },
        });

        if (existingOrder && existingOrder.status === "COMPLETED") {
          console.log(`Order ${orderId} already completed. Skipping duplicate processing.`);
          break;
        }

        const isLifetime = plan === "LIFETIME";
        const creditsToAward = isLifetime ? 5000 : 1000;
        const periodEnd = new Date();
        periodEnd.setDate(
          periodEnd.getDate() + (isLifetime ? 3650 : billingCycle === "annual" ? 365 : 30)
        );

        // Update or create PaymentOrder
        await prisma.paymentOrder.upsert({
          where: { orderId },
          create: {
            userId,
            orderId,
            paymentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_id || null,
            amount: session.amount_total || (isLifetime ? 9900 : 1900),
            currency: session.currency?.toUpperCase() || "USD",
            plan,
            status: "COMPLETED",
            provider,
          },
          update: {
            status: "COMPLETED",
            paymentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_id || undefined,
          },
        });

        // Upsert Subscription
        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            plan,
            status: "ACTIVE",
            provider,
            customerId: typeof session.customer === "string" ? session.customer : session.customer_id || null,
            subscriptionId:
              typeof session.subscription === "string"
                ? session.subscription
                : session.subscription_id
                ? session.subscription_id
                : isLifetime
                ? `sub_lifetime_${orderId}`
                : null,
            currentPeriodStart: new Date(),
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
          },
          update: {
            plan,
            status: "ACTIVE",
            provider,
            customerId: typeof session.customer === "string" ? session.customer : session.customer_id || undefined,
            subscriptionId:
              typeof session.subscription === "string"
                ? session.subscription
                : session.subscription_id
                ? session.subscription_id
                : undefined,
            currentPeriodStart: new Date(),
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
          },
        });

        // Award AI Credits to Candidate's Ledger
        await addCredits({
          userId,
          amount: creditsToAward,
          action: "PLAN_PURCHASE",
          description: `Upgraded to ${plan} Plan via ${provider} (+${creditsToAward} AI Credits)`,
        });

        // Dispatch in-app notification
        await prisma.notification.create({
          data: {
            userId,
            title: `🎉 Welcome to ${plan}!`,
            message: `Your account has been upgraded and ${creditsToAward.toLocaleString()} AI credits have been added to your balance.`,
            type: "BILLING",
            link: "/dashboard",
          },
        }).catch((e) => console.warn("Failed to create billing notification:", e));

        console.log(`Successfully activated ${plan} for user ${userId} via ${provider}.`);
        break;
      }

      // ========================================================
      // B) INVOICE PAYMENT SUCCEEDED (Recurring Subscription Renewal)
      // ========================================================
      case "invoice.payment_succeeded":
      case "subscription.renewed": {
        const invoice = (event.data?.object || event.data || event) as any;
        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription_id || null;
        const billingReason = invoice.billing_reason || "subscription_cycle";

        // Only process recurring renewals (not the initial checkout which is handled above)
        if (subscriptionId && billingReason === "subscription_cycle") {
          const subscription = await prisma.subscription.findUnique({
            where: { subscriptionId },
          });

          if (subscription) {
            const nextPeriodEnd = invoice.lines?.data?.[0]?.period?.end
              ? new Date(invoice.lines.data[0].period.end * 1000)
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            // Update Subscription renewal dates
            await prisma.subscription.update({
              where: { id: subscription.id },
              data: {
                status: "ACTIVE",
                currentPeriodStart: new Date(),
                currentPeriodEnd: nextPeriodEnd,
              },
            });

            // Refill monthly credits
            await addCredits({
              userId: subscription.userId,
              amount: 1000,
              action: "MONTHLY_REFRESH",
              description: "Monthly Pro subscription renewal (+1,000 AI Credits)",
            });

            console.log(`Refreshed 1,000 monthly credits for subscription ${subscriptionId}.`);
          }
        }
        break;
      }

      // ========================================================
      // C) INVOICE PAYMENT FAILED
      // ========================================================
      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const subscriptionId =
          typeof invoice.subscription === "string" ? invoice.subscription : null;

        if (subscriptionId) {
          await prisma.subscription.updateMany({
            where: { subscriptionId },
            data: { status: "PAST_DUE" },
          });

          console.warn(`Subscription ${subscriptionId} marked as PAST_DUE due to payment failure.`);
        }
        break;
      }

      // ========================================================
      // D) CUSTOMER SUBSCRIPTION DELETED (Cancellation finalized)
      // ========================================================
      case "customer.subscription.deleted":
      case "subscription.cancelled": {
        const subObj = (event.data?.object || event.data || event) as any;
        const subId = subObj.id || subObj.subscription_id;

        if (subId) {
          await prisma.subscription.updateMany({
            where: { subscriptionId: subId },
            data: {
              status: "CANCELED",
              plan: "FREE",
            },
          });
          console.log(`Subscription ${subId} canceled. Account reverted to Free tier.`);
        }
        break;
      }

      // ========================================================
      // E) CUSTOMER SUBSCRIPTION UPDATED
      // ========================================================
      case "customer.subscription.updated": {
        const subObj = event.data.object as Stripe.Subscription;

        await prisma.subscription.updateMany({
          where: { subscriptionId: subObj.id },
          data: {
            cancelAtPeriodEnd: subObj.cancel_at_period_end,
            canceledAt: subObj.canceled_at ? new Date(subObj.canceled_at * 1000) : null,
            status:
              subObj.status === "active"
                ? "ACTIVE"
                : subObj.status === "past_due"
                ? "PAST_DUE"
                : "CANCELED",
          },
        });

        console.log(`Subscription ${subObj.id} update recorded.`);
        break;
      }

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Error processing Stripe webhook event:", error);
    return NextResponse.json(
      { error: error.message || "Webhook processing error" },
      { status: 500 }
    );
  }
}
