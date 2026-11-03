import { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserBillingStatusAction } from "@/app/actions/billing";
import { getUserCreditsAction } from "@/app/actions/credits";
import { BillingManager } from "@/components/billing/billing-manager";

export const metadata: Metadata = {
  title: "Billing & AI Credits | CareerPilot",
  description: "Manage your subscription plan, credit ledger, and payment receipts.",
};

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [billingRes, creditsRes] = await Promise.all([
    getUserBillingStatusAction(),
    getUserCreditsAction(),
  ]);

  return (
    <div className="container py-4">
      <BillingManager
        initialBilling={billingRes.billing || null}
        initialCredit={creditsRes.credit || null}
        initialHistory={creditsRes.history || []}
      />
    </div>
  );
}
