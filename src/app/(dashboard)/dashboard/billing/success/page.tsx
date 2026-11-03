"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  FileText,
  MessageSquare,
  KanbanSquare,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { simulateMockUpgradeAction } from "@/app/actions/billing";

export default function BillingSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id") || "sess_live";
  const planParam = (searchParams.get("plan")?.toUpperCase() as "PRO" | "LIFETIME") || "PRO";

  const [processing, setProcessing] = useState(false);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    // If returning from a mock developer checkout, reconcile automatically
    if (sessionId.includes("mock") || sessionId.startsWith("cs_mock") || sessionId.startsWith("test_")) {
      setProcessing(true);
      simulateMockUpgradeAction({
        sessionId,
        plan: planParam,
      })
        .then(() => setSynced(true))
        .catch(console.warn)
        .finally(() => setProcessing(false));
    } else {
      setSynced(true);
    }
  }, [sessionId, planParam]);

  const creditsAwarded = planParam === "LIFETIME" ? 5000 : 1000;

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <Card className="border-border/80 shadow-2xl bg-card overflow-hidden text-center relative">
          {/* Subtle background glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <CardHeader className="pt-10 pb-4 relative z-10">
            {/* Animated Check Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
              className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 ring-8 ring-emerald-500/5 shadow-inner"
            >
              <CheckCircle2 className="h-10 w-10 stroke-[2.5]" />
            </motion.div>

            <div className="inline-flex items-center gap-1.5 mx-auto mb-2">
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1 font-semibold">
                Payment Confirmed
              </Badge>
              <Badge className="bg-primary text-primary-foreground text-xs px-3 py-1 font-bold">
                {planParam} Pass
              </Badge>
            </div>

            <CardTitle className="text-3xl font-extrabold tracking-tight mt-1">
              Welcome to CareerPilot {planParam === "LIFETIME" ? "Lifetime" : "Pro"}!
            </CardTitle>
            <CardDescription className="text-sm max-w-md mx-auto mt-2 leading-relaxed">
              Your subscription is active and your AI token allocation is ready for your job hunt.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-2 pb-10 px-6 sm:px-10 relative z-10">
            {/* Credits Deposited Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-amber-500/10 to-primary/10 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Zap className="h-5 w-5 fill-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">AI Credits Credited</h4>
                  <p className="text-xs text-muted-foreground">
                    Available immediately for pitches, copilot, and tailoring
                  </p>
                </div>
              </div>
              <div className="text-right sm:text-right">
                <span className="text-2xl font-black text-amber-500">
                  +{creditsAwarded.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground ml-1">Credits</span>
              </div>
            </div>

            {/* Quick Summary Grid */}
            <div className="grid grid-cols-2 gap-3 text-left text-xs bg-muted/40 p-3.5 rounded-xl border border-border/50">
              <div>
                <span className="text-muted-foreground block text-[11px]">Reference Session</span>
                <span className="font-mono text-foreground font-medium truncate block max-w-[180px]">
                  {sessionId.substring(0, 18)}...
                </span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground block text-[11px]">Renewal Policy</span>
                <span className="text-foreground font-medium">
                  {planParam === "LIFETIME" ? "Never Expires" : "Refreshes Monthly"}
                </span>
              </div>
            </div>

            {/* Next Steps CTA Buttons */}
            <div className="space-y-2.5 pt-2">
              <Link href="/improve" className="w-full block">
                <Button className="w-full h-11 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze &amp; Improve Your Resume Now
                </Button>
              </Link>

              <div className="grid grid-cols-2 gap-3">
                <Link href="/applications" className="w-full">
                  <Button variant="outline" className="w-full h-10 rounded-xl text-xs font-semibold">
                    <KanbanSquare className="mr-1.5 h-3.5 w-3.5" />
                    Applications
                  </Button>
                </Link>

                <Link href="/dashboard/billing" className="w-full">
                  <Button variant="outline" className="w-full h-10 rounded-xl text-xs font-semibold">
                    View Billing Ledger &rarr;
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
