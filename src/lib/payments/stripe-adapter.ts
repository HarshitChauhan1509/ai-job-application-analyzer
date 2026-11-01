import Stripe from "stripe";
import {
  PaymentAdapter,
  CheckoutSessionParams,
  CheckoutSessionResult,
  BillingPortalParams,
  BillingPortalResult,
} from "./types";

export class StripePaymentAdapter implements PaymentAdapter {
  readonly name = "STRIPE" as const;
  private stripe: Stripe | null = null;
  private isConfigured: boolean = false;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (
      secretKey &&
      !secretKey.startsWith("dummy") &&
      secretKey !== "your-stripe-secret-key"
    ) {
      this.stripe = new Stripe(secretKey);
      this.isConfigured = true;
    }
  }

  /**
   * Helper to retrieve or create a Stripe Customer record linked to candidate email.
   */
  private async getOrCreateCustomer(
    email: string,
    name?: string,
    userId?: string
  ): Promise<string | undefined> {
    if (!this.stripe) return undefined;

    try {
      const existing = await this.stripe.customers.list({
        email,
        limit: 1,
      });

      if (existing.data.length > 0) {
        return existing.data[0].id;
      }

      const created = await this.stripe.customers.create({
        email,
        name: name || undefined,
        metadata: {
          userId: userId || "",
        },
      });

      return created.id;
    } catch (err) {
      console.warn("Failed to get or create Stripe customer:", err);
      return undefined;
    }
  }

  async createCheckoutSession(
    params: CheckoutSessionParams
  ): Promise<CheckoutSessionResult> {
    const {
      userId,
      userEmail,
      userName,
      plan,
      billingCycle = "monthly",
      successUrl,
      cancelUrl,
    } = params;

    const isAnnual = billingCycle === "annual";

    // 1. Fallback Mock Simulator for local testing without active Stripe API keys
    if (!this.isConfigured || !this.stripe) {
      const mockSessionId = `mock_cs_${plan.toLowerCase()}_${Date.now()}`;
      const separator = successUrl.includes("?") ? "&" : "?";
      const mockCheckoutUrl = `${successUrl}${separator}session_id=${mockSessionId}&mock_plan=${plan}`;

      return {
        sessionId: mockSessionId,
        checkoutUrl: mockCheckoutUrl,
        provider: "STRIPE",
      };
    }

    // 2. Real Stripe Checkout Session creation
    const customerId = await this.getOrCreateCustomer(userEmail, userName, userId);

    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const mode: Stripe.Checkout.SessionCreateParams.Mode =
      plan === "LIFETIME" ? "payment" : "subscription";

    if (plan === "PRO") {
      const configuredPriceId = isAnnual
        ? process.env.STRIPE_PRICE_PRO_ANNUAL
        : process.env.STRIPE_PRICE_PRO_MONTHLY;

      if (configuredPriceId) {
        lineItems = [{ price: configuredPriceId, quantity: 1 }];
      } else {
        // Dynamic price specification (No pre-configured Stripe dashboard price required!)
        lineItems = [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: isAnnual
                  ? "CareerPilot Pro Copilot (Annual)"
                  : "CareerPilot Pro Copilot (Monthly)",
                description:
                  "Unlimited AI resume tailoring, 1-click founder pitches, recruiter email sync, and 1,000 monthly credits.",
              },
              unit_amount: isAnnual ? 18000 : 1900, // $180/yr ($15/mo) or $19/mo
              recurring: {
                interval: isAnnual ? "year" : "month",
              },
            },
            quantity: 1,
          },
        ];
      }
    } else if (plan === "LIFETIME") {
      const configuredPriceId = process.env.STRIPE_PRICE_LIFETIME;

      if (configuredPriceId) {
        lineItems = [{ price: configuredPriceId, quantity: 1 }];
      } else {
        // Dynamic lifetime pass line item
        lineItems = [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "CareerPilot Lifetime Pass",
                description:
                  "Lifetime access to all current and future CareerPilot AI tools + 5,000 initial credits.",
              },
              unit_amount: 9900, // $99.00 one-time
            },
            quantity: 1,
          },
        ];
      }
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      mode,
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      metadata: {
        userId,
        plan,
        billingCycle,
      },
      subscription_data:
        mode === "subscription"
          ? {
              metadata: {
                userId,
                plan,
                billingCycle,
              },
            }
          : undefined,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a valid checkout session URL");
    }

    return {
      sessionId: session.id,
      checkoutUrl: session.url,
      provider: "STRIPE",
    };
  }

  async createBillingPortalSession(
    params: BillingPortalParams
  ): Promise<BillingPortalResult> {
    const { customerId, returnUrl } = params;

    if (!this.isConfigured || !this.stripe) {
      return {
        url: returnUrl,
      };
    }

    const portalSession = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return {
      url: portalSession.url,
    };
  }
}
