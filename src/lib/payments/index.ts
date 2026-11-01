import { PaymentAdapter, PaymentProviderName } from "./types";
import { StripePaymentAdapter } from "./stripe-adapter";
import { DodoPaymentAdapter } from "./dodo-adapter";

export * from "./types";
export * from "./stripe-adapter";
export * from "./dodo-adapter";

let stripeAdapterInstance: StripePaymentAdapter | null = null;
let dodoAdapterInstance: DodoPaymentAdapter | null = null;

/**
 * Returns the configured payment adapter instance.
 * Defaults to Stripe, but switches seamlessly to Dodo if specified via env or param.
 */
export function getPaymentAdapter(provider?: PaymentProviderName): PaymentAdapter {
  const chosenProvider: PaymentProviderName =
    provider ||
    ((process.env.PAYMENT_PROVIDER?.toUpperCase() as PaymentProviderName) || "STRIPE");

  if (chosenProvider === "DODO") {
    if (!dodoAdapterInstance) {
      dodoAdapterInstance = new DodoPaymentAdapter();
    }
    return dodoAdapterInstance;
  }

  if (!stripeAdapterInstance) {
    stripeAdapterInstance = new StripePaymentAdapter();
  }
  return stripeAdapterInstance;
}
