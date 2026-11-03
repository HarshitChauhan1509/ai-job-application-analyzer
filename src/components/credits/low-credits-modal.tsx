"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Sparkles, Check, ArrowRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createCheckoutSessionAction } from "@/app/actions/billing";

interface LowCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionName?: string;
  requiredCredits?: number;
  currentBalance?: number;
}

export function LowCreditsModal({
  open,
  onOpenChange,
  actionName = "this action",
  requiredCredits = 3,
  currentBalance = 0,
}: LowCreditsModalProps) {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<"PRO" | "LIFETIME" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async (plan: "PRO" | "LIFETIME") => {
    try {
      setLoadingPlan(plan);
      setError(null);
      const res = await createCheckoutSessionAction({ plan, isAnnual: plan === "PRO" });
      if (res.success && res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        setError(res.error || "Unable to open checkout session.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to initiate upgrade.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 overflow-hidden">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 ring-8 ring-amber-500/5">
            <Zap className="h-6 w-6 fill-amber-500" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">
            Need More AI Credits
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            You need <span className="font-semibold text-foreground">{requiredCredits} credits</span> to run{" "}
            <span className="font-semibold text-foreground">{actionName}</span>, but your balance is{" "}
            <span className="font-semibold text-destructive">{currentBalance} credits</span>.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive text-center">
            {error}
          </div>
        )}

        <div className="space-y-3 my-2">
          {/* Pro Copilot Card */}
          <div className="relative rounded-xl border border-primary/40 bg-card p-3.5 shadow-sm hover:border-primary transition-all">
            <div className="absolute -top-2.5 right-4">
              <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 font-bold">
                Most Popular
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold flex items-center gap-1.5">
                  Pro Copilot
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  1,000 monthly credits • Unlimited resumes &amp; tools
                </p>
              </div>
              <div className="text-right">
                <div className="text-base font-extrabold text-foreground">$19</div>
                <div className="text-[10px] text-muted-foreground">/ month</div>
              </div>
            </div>
            <Button
              onClick={() => handleUpgrade("PRO")}
              disabled={loadingPlan !== null}
              size="sm"
              className="w-full mt-3 rounded-lg text-xs font-semibold h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loadingPlan === "PRO" ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Upgrading...
                </>
              ) : (
                <>
                  Upgrade to Pro <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>

          {/* Lifetime Pass Card */}
          <div className="rounded-xl border border-border bg-muted/40 p-3.5 hover:border-border/80 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold">Lifetime Pass</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  5,000 upfront credits + 500/mo lifetime
                </p>
              </div>
              <div className="text-right">
                <div className="text-base font-extrabold text-foreground">$99</div>
                <div className="text-[10px] text-muted-foreground">one-time</div>
              </div>
            </div>
            <Button
              onClick={() => handleUpgrade("LIFETIME")}
              disabled={loadingPlan !== null}
              variant="outline"
              size="sm"
              className="w-full mt-3 rounded-lg text-xs font-semibold h-8"
            >
              {loadingPlan === "LIFETIME" ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Upgrading...
                </>
              ) : (
                <>Get Lifetime Access</>
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
          <span>Cancel anytime • 14-day guarantee</span>
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              router.push("/dashboard/billing");
            }}
            className="text-primary hover:underline font-medium cursor-pointer"
          >
            View billing details &rarr;
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
