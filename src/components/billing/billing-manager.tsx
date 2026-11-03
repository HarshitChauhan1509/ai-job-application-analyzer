"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Zap,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ArrowUpRight,
  Clock,
  History,
  Receipt,
  AlertCircle,
  Loader2,
  Calendar,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  createCheckoutSessionAction,
  createBillingPortalAction,
  simulateMockUpgradeAction,
  UserBillingStatus,
} from "@/app/actions/billing";
import { UserCreditSummary } from "@/lib/credits";

interface BillingManagerProps {
  initialBilling: UserBillingStatus | null;
  initialCredit: UserCreditSummary | null;
  initialHistory: Array<{
    id: string;
    amount: number;
    balanceAfter: number;
    action: string;
    description: string | null;
    createdAt: Date;
  }>;
}

export function BillingManager({
  initialBilling,
  initialCredit,
  initialHistory,
}: BillingManagerProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [annualBilling, setAnnualBilling] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const plan = initialBilling?.plan || "FREE";
  const status = initialBilling?.status || "ACTIVE";
  const balance = initialCredit?.balance ?? initialBilling?.creditBalance ?? 50;
  const totalEarned = initialCredit?.totalEarned ?? 50;
  const totalSpent = initialCredit?.totalSpent ?? 0;
  const percentUsed = totalEarned > 0 ? Math.min(Math.round((totalSpent / totalEarned) * 100), 100) : 0;

  // Handle Checkout
  const handleCheckout = async (targetPlan: "PRO" | "LIFETIME") => {
    try {
      setLoadingAction(`checkout_${targetPlan}`);
      setStatusMessage(null);

      const res = await createCheckoutSessionAction({
        plan: targetPlan,
        isAnnual: annualBilling,
      });

      if (res.success && res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "Failed to initialize checkout.",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "An unexpected error occurred.",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // Handle Billing Portal
  const handleOpenPortal = async () => {
    try {
      setLoadingAction("portal");
      setStatusMessage(null);

      const res = await createBillingPortalAction();
      if (res.success && res.portalUrl) {
        window.location.href = res.portalUrl;
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "Billing portal is only available for active recurring subscriptions.",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to launch billing portal.",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // Mock Upgrade in Dev Mode
  const handleMockUpgrade = async (targetPlan: "PRO" | "LIFETIME") => {
    try {
      setLoadingAction(`mock_${targetPlan}`);
      setStatusMessage(null);

      const mockSessionId = `mock_sim_${Date.now()}`;
      const res = await simulateMockUpgradeAction({
        sessionId: mockSessionId,
        plan: targetPlan,
      });

      if (res.success) {
        setStatusMessage({
          type: "success",
          text: res.message || `Upgraded to ${targetPlan}!`,
        });
        router.refresh();
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "Failed to simulate upgrade.",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Simulation error.",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Billing &amp; AI Credits</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your subscription tier, track token usage, and inspect transaction ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {plan !== "FREE" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenPortal}
              disabled={loadingAction === "portal"}
              className="text-xs h-9"
            >
              {loadingAction === "portal" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              )}
              Stripe Customer Portal
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => {
              const el = document.getElementById("plans-section");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {plan === "FREE" ? "Upgrade Account" : "Change Plan"}
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-sm flex items-center gap-2.5 ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Grid: 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Subscription Tier */}
        <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Current Plan
              </span>
              <Badge
                className={
                  plan === "LIFETIME"
                    ? "bg-amber-500 text-white font-bold"
                    : plan === "PRO"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-muted text-muted-foreground font-medium"
                }
              >
                {plan}
              </Badge>
            </div>
            <CardTitle className="text-2xl font-extrabold mt-1">
              {plan === "LIFETIME" ? "Lifetime Pass" : plan === "PRO" ? "Pro Copilot" : "Starter Free"}
            </CardTitle>
            <CardDescription className="text-xs">
              {plan === "LIFETIME"
                ? "Full unrestricted lifetime access with continuous monthly refills."
                : plan === "PRO"
                ? "Active monthly subscription with 1,000 monthly credits."
                : "Standard free starter tier with essential ATS tools."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 text-xs space-y-2 border-t border-border/40">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Status</span>
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    status === "ACTIVE" ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                {status}
              </span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{plan === "LIFETIME" ? "Pass Validity" : "Next Renewal"}</span>
              <span className="font-medium text-foreground">
                {plan === "LIFETIME"
                  ? "Permanent / Never Expires"
                  : formatDate(initialBilling?.currentPeriodEnd)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: AI Credits Meter */}
        <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Credit Economy
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
                <Zap className="h-3.5 w-3.5 fill-amber-500" />
                Active Balance
              </span>
            </div>
            <CardTitle className="text-3xl font-extrabold tracking-tight text-foreground flex items-baseline gap-2 mt-1">
              {balance.toLocaleString()}
              <span className="text-xs font-medium text-muted-foreground">Credits</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Used for automated pitches, mock interviews, and JD parsing.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 space-y-2.5 border-t border-border/40">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Total Spent: {totalSpent}</span>
                <span>Total Earned: {totalEarned}</span>
              </div>
              <Progress value={percentUsed} className="h-1.5 bg-muted" />
            </div>
            <div className="text-[11px] text-muted-foreground">
              {plan === "FREE"
                ? "Upgrade to Pro to get 1,000 monthly credits."
                : "Credits automatically refresh on your billing cycle."}
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Action Costs Breakdown */}
        <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Feature Token Rates
            </span>
            <CardTitle className="text-base font-bold mt-1">AI Action Costs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs pt-1">
            <div className="flex justify-between items-center py-1 border-b border-border/30">
              <span className="text-muted-foreground">Founder Outreach Pitch</span>
              <Badge variant="outline" className="text-[10px] font-mono">
                3 credits
              </Badge>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/30">
              <span className="text-muted-foreground">AI Email &amp; Status Parser</span>
              <Badge variant="outline" className="text-[10px] font-mono">
                2 credits
              </Badge>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/30">
              <span className="text-muted-foreground">Application Copilot Message</span>
              <Badge variant="outline" className="text-[10px] font-mono">
                1 credit
              </Badge>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground">Resume ATS Tailoring</span>
              <Badge variant="outline" className="text-[10px] font-mono">
                2 credits
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upgrade / Tier Selection Section */}
      <div id="plans-section" className="space-y-6 pt-4">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <Badge variant="outline" className="text-primary border-primary/30 text-xs px-3 py-1">
            Upgrade Your Superpowers
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Accelerate your engineering job hunt
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Switch tiers anytime. Instant credit crediting upon checkout completion.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-2 p-1 rounded-full bg-muted/60 border border-border mt-2">
            <button
              onClick={() => setAnnualBilling(false)}
              className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all ${
                !annualBilling
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnualBilling(true)}
              className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all flex items-center gap-1.5 ${
                annualBilling
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Annual</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background/20 font-bold">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Pro Copilot Card */}
          <Card
            className={`border relative transition-all duration-200 ${
              plan === "PRO"
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border hover:border-primary/50 bg-card"
            }`}
          >
            {plan === "PRO" && (
              <div className="absolute -top-3 right-4">
                <Badge className="bg-primary text-primary-foreground text-xs font-bold">
                  Current Tier
                </Badge>
              </div>
            )}
            <CardHeader>
              <div className="flex justify-between items-baseline">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    Pro Copilot
                    <Sparkles className="h-4 w-4 text-primary" />
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    For active engineering candidates targeting multiple offers.
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black">${annualBilling ? 15 : 19}</div>
                  <div className="text-[10px] text-muted-foreground">/ month</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-foreground">1,000 AI Credits</span> renewed every month
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                Unlimited resumes &amp; specialized role profiles
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                Founder &amp; Hiring Manager direct outreach pitches
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                AI Job status email parser &amp; auto pipeline updates
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                Priority AI generation response speeds
              </div>

              <div className="pt-4">
                <Button
                  onClick={() => handleCheckout("PRO")}
                  disabled={loadingAction !== null || plan === "PRO"}
                  className="w-full h-10 rounded-xl font-semibold text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {loadingAction === "checkout_PRO" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing Checkout...
                    </>
                  ) : plan === "PRO" ? (
                    "Active Plan"
                  ) : (
                    <>
                      Upgrade to Pro <ArrowUpRight className="ml-1.5 h-4 w-4" />
                    </>
                  )}
                </Button>

                {/* Developer Mode Instant Mock Upgrade */}
                {process.env.NODE_ENV !== "production" && plan !== "PRO" && (
                  <button
                    type="button"
                    onClick={() => handleMockUpgrade("PRO")}
                    disabled={loadingAction !== null}
                    className="w-full text-center text-[10px] text-muted-foreground hover:text-foreground mt-2 underline cursor-pointer"
                  >
                    {loadingAction === "mock_PRO"
                      ? "Simulating..."
                      : "⚡ Dev Test: Simulate instant Pro upgrade"}
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Lifetime Pass Card */}
          <Card
            className={`border relative transition-all duration-200 ${
              plan === "LIFETIME"
                ? "border-amber-500 bg-amber-500/5 shadow-md"
                : "border-border hover:border-amber-500/50 bg-card"
            }`}
          >
            {plan === "LIFETIME" && (
              <div className="absolute -top-3 right-4">
                <Badge className="bg-amber-500 text-white text-xs font-bold">
                  Current Tier
                </Badge>
              </div>
            )}
            <CardHeader>
              <div className="flex justify-between items-baseline">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    Lifetime Pass
                    <ShieldCheck className="h-4 w-4 text-amber-500" />
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    One-time payment for continuous lifetime engineering tools.
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black">$99</div>
                  <div className="text-[10px] text-muted-foreground">one-time payment</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="font-semibold text-foreground">5,000 AI Credits</span> upfront allocation
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="font-semibold text-foreground">+500 AI Credits</span> refilled every month forever
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                No recurring monthly credit card charges
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                Lifetime access to all future AI models &amp; tools
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                VIP candidate support &amp; direct assistance
              </div>

              <div className="pt-4">
                <Button
                  onClick={() => handleCheckout("LIFETIME")}
                  disabled={loadingAction !== null || plan === "LIFETIME"}
                  variant={plan === "LIFETIME" ? "outline" : "default"}
                  className="w-full h-10 rounded-xl font-semibold text-xs bg-amber-500 hover:bg-amber-600 text-white"
                >
                  {loadingAction === "checkout_LIFETIME" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing Checkout...
                    </>
                  ) : plan === "LIFETIME" ? (
                    "Active Plan"
                  ) : (
                    <>
                      Get Lifetime Access <ArrowUpRight className="ml-1.5 h-4 w-4" />
                    </>
                  )}
                </Button>

                {/* Developer Mode Instant Mock Upgrade */}
                {process.env.NODE_ENV !== "production" && plan !== "LIFETIME" && (
                  <button
                    type="button"
                    onClick={() => handleMockUpgrade("LIFETIME")}
                    disabled={loadingAction !== null}
                    className="w-full text-center text-[10px] text-muted-foreground hover:text-foreground mt-2 underline cursor-pointer"
                  >
                    {loadingAction === "mock_LIFETIME"
                      ? "Simulating..."
                      : "⚡ Dev Test: Simulate instant Lifetime upgrade"}
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs: Credit Activity Ledger & Orders History */}
      <div className="pt-6">
        <Tabs defaultValue="ledger" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
            <div>
              <h3 className="text-lg font-bold">Transaction Records</h3>
              <p className="text-xs text-muted-foreground">
                Audit logs of credit deductions, renewals, and payment receipts.
              </p>
            </div>
            <TabsList className="bg-muted/60 p-1 rounded-lg">
              <TabsTrigger value="ledger" className="text-xs gap-1.5">
                <History className="h-3.5 w-3.5" />
                Credit Ledger
              </TabsTrigger>
              <TabsTrigger value="orders" className="text-xs gap-1.5">
                <Receipt className="h-3.5 w-3.5" />
                Payment Invoices
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab 1: Credit Ledger */}
          <TabsContent value="ledger" className="space-y-3">
            {initialHistory.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border/60 rounded-xl text-muted-foreground text-xs">
                No credit ledger transactions recorded yet.
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                      <tr>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4 text-right">Change</th>
                        <th className="py-3 px-4 text-right">Balance After</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {initialHistory.map((item) => {
                        const isPositive = item.amount > 0;
                        return (
                          <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                              {formatDate(item.createdAt)}
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-mono ${
                                  isPositive
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                    : "bg-muted text-muted-foreground border-border"
                                }`}
                              >
                                {item.action}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-foreground/90 max-w-xs truncate">
                              {item.description || "Credit update"}
                            </td>
                            <td
                              className={`py-3 px-4 text-right font-mono font-bold whitespace-nowrap ${
                                isPositive ? "text-emerald-500" : "text-destructive"
                              }`}
                            >
                              {isPositive ? `+${item.amount}` : item.amount}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                              {item.balanceAfter}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Payment Orders */}
          <TabsContent value="orders" className="space-y-3">
            {!initialBilling?.orders || initialBilling.orders.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border/60 rounded-xl text-muted-foreground text-xs">
                No payment orders or checkout sessions on record.
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Order ID</th>
                        <th className="py-3 px-4">Plan</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {initialBilling.orders.map((order) => (
                        <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                            {formatDate(order.createdAt)}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground max-w-[140px] truncate">
                            {order.orderId}
                          </td>
                          <td className="py-3 px-4 font-semibold text-foreground">
                            {order.plan}
                          </td>
                          <td className="py-3 px-4 font-mono text-foreground">
                            ${(order.amount / 100).toFixed(2)} {order.currency}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Badge
                              className={`text-[10px] ${
                                order.status === "COMPLETED"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                              }`}
                            >
                              {order.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
