export type PlanTier = "FREE" | "PRO" | "LIFETIME";

export type BillingCycle = "monthly" | "annual";

export type PaymentProviderName = "STRIPE" | "DODO" | "RAZORPAY";

export interface CheckoutSessionParams {
  userId: string;
  userEmail: string;
  userName?: string;
  plan: "PRO" | "LIFETIME";
  billingCycle?: BillingCycle;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  checkoutUrl: string;
  provider: PaymentProviderName;
}

export interface BillingPortalParams {
  customerId: string;
  returnUrl: string;
}

export interface BillingPortalResult {
  url: string;
}

export interface PaymentAdapter {
  readonly name: PaymentProviderName;
  createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult>;
  createBillingPortalSession(params: BillingPortalParams): Promise<BillingPortalResult>;
}
