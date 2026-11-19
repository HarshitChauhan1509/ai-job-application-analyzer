"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  Sparkles,
  Plus,
  Trash2,
  Edit,
  Mail,
  Send,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  Award,
  ChevronRight,
  ShieldCheck,
  BarChart3,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OfferDialog } from "@/components/offers/offer-dialog";
import {
  calculateCompensation,
  formatCurrency,
  formatCompactCurrency,
} from "@/lib/compensation-calculator";
import {
  deleteJobOfferAction,
  generateOfferNegotiationAction,
  sendCounterOfferEmailAction,
} from "@/app/actions/compensation";
import { NegotiationStrategyResult, NegotiationPitch } from "@/lib/ai/negotiation-generator";
import { LowCreditsModal } from "@/components/credits/low-credits-modal";

interface JobOfferItem {
  id: string;
  userId: string;
  applicationId: string | null;
  company: string;
  role: string;
  location: string | null;
  baseSalary: number;
  targetBonus: number;
  signOnBonus: number;
  equityType: string;
  equityShares: number;
  strikePrice: number;
  currentValuation: number;
  equityEstimatedValue: number;
  vestingYears: number;
  vestingCliffMonths: number;
  annualTC: number;
  currency: string;
  notes: string | null;
  negotiationStrategy: string | null;
  status: string;
  deadline: Date | string | null;
  createdAt: Date | string;
  application?: {
    id: string;
    job: {
      id: string;
      position: string;
      company: string;
    };
  } | null;
}

interface OffersClientProps {
  initialOffers: JobOfferItem[];
}

export function OffersClient({ initialOffers }: OffersClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<JobOfferItem | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string>(
    initialOffers[0]?.id || ""
  );

  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number>(0);
  const [activeStrategyTab, setActiveStrategyTab] = useState<string>("base-maximizer");

  const [generatingStrategy, setGeneratingStrategy] = useState(false);
  const [strategyError, setStrategyError] = useState<string | null>(null);
  const [lowCreditsOpen, setLowCreditsOpen] = useState(false);

  const [copiedScript, setCopiedScript] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Active Offer Selection
  const activeOffer =
    initialOffers.find((o) => o.id === selectedOfferId) || initialOffers[0] || null;

  // Compensation breakdown
  const activeComp = activeOffer
    ? calculateCompensation({
        baseSalary: activeOffer.baseSalary,
        targetBonus: activeOffer.targetBonus,
        signOnBonus: activeOffer.signOnBonus,
        equityType: activeOffer.equityType as "OPTIONS" | "RSU" | "NONE",
        equityShares: activeOffer.equityShares,
        strikePrice: activeOffer.strikePrice,
        currentValuation: activeOffer.currentValuation,
        vestingYears: activeOffer.vestingYears,
        vestingCliffMonths: activeOffer.vestingCliffMonths,
      })
    : null;

  // Parsed AI Negotiation Strategies
  let negotiationResult: NegotiationStrategyResult | null = null;
  if (activeOffer?.negotiationStrategy) {
    try {
      negotiationResult = JSON.parse(activeOffer.negotiationStrategy);
    } catch {
      negotiationResult = null;
    }
  }

  // Aggregate Metrics
  const topOfferTC = initialOffers.reduce((max, o) => Math.max(max, o.annualTC), 0);
  const avgBaseSalary =
    initialOffers.length > 0
      ? Math.round(
          initialOffers.reduce((sum, o) => sum + o.baseSalary, 0) / initialOffers.length
        )
      : 0;
  const bestEquityVal = initialOffers.reduce(
    (max, o) => Math.max(max, o.equityEstimatedValue),
    0
  );

  const handleDeleteOffer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this offer?")) return;
    try {
      await deleteJobOfferAction(id);
      router.refresh();
    } catch (err) {
      console.error("Failed to delete offer:", err);
    }
  };

  const handleGenerateStrategy = async () => {
    if (!activeOffer) return;
    setGeneratingStrategy(true);
    setStrategyError(null);

    try {
      const res = await generateOfferNegotiationAction(activeOffer.id, {
        candidatePriorities: "BALANCED",
      });

      if (res.success) {
        router.refresh();
      } else {
        if (res.insufficientCredits) {
          setLowCreditsOpen(true);
        } else {
          setStrategyError(res.error || "Failed to generate negotiation strategies");
        }
      }
    } catch (err: any) {
      setStrategyError(err?.message || "An unexpected error occurred");
    } finally {
      setGeneratingStrategy(false);
    }
  };

  const activeStrategy: NegotiationPitch | null =
    negotiationResult?.strategies.find((s) => s.id === activeStrategyTab) ||
    negotiationResult?.strategies[0] ||
    null;

  const handleCopyScript = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleSendViaGmail = async () => {
    if (!activeOffer || !activeStrategy) return;

    // Prompt for recipient email
    const recipient = prompt(
      `Enter the recruiter or hiring manager's email address for ${activeOffer.company}:`,
      "recruiter@" + activeOffer.company.toLowerCase().replace(/\s+/g, "") + ".com"
    );

    if (!recipient || !recipient.includes("@")) {
      return;
    }

    setSendingEmail(true);
    setEmailError(null);
    setEmailSuccess(null);

    try {
      const res = await sendCounterOfferEmailAction({
        offerId: activeOffer.id,
        recipientEmail: recipient,
        subject: activeStrategy.subject,
        emailBody: activeStrategy.emailBody,
      });

      if (res.success) {
        setEmailSuccess(`Counter-offer sent to ${recipient}! Status updated to COUNTERED.`);
        router.refresh();
      } else {
        setEmailError(res.error || "Failed to deliver email through Gmail API.");
      }
    } catch (err: any) {
      setEmailError(err?.message || "An unexpected error occurred while sending email.");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="flex-1 space-y-8 p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1.5">
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Offers</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
              <DollarSign size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Offer Evaluator & Negotiation Strategist
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Model Total Compensation (TC), simulate startup equity upside, and generate data-backed counter-offer scripts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setEditingOffer(null);
              setDialogOpen(true);
            }}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
          >
            <Plus size={16} />
            <span>Log New Offer</span>
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/80 bg-card/80">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold">
              Top Offer (Year 1 TC)
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-emerald-500">
              {topOfferTC > 0 ? formatCurrency(topOfferTC) : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            {initialOffers.length > 0 ? "Highest single offer package" : "No offers logged yet"}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold">
              Average Base Salary
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-foreground">
              {avgBaseSalary > 0 ? formatCurrency(avgBaseSalary) : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Across {initialOffers.length} logged opportunities
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold">
              Peak 4-Yr Equity Value
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-primary">
              {bestEquityVal > 0 ? formatCurrency(bestEquityVal) : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Current 409A / Grant valuation
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold">
              Active Offers
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-foreground">
              {initialOffers.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            {initialOffers.filter((o) => o.status === "COUNTERED").length} counter-offers pending
          </CardContent>
        </Card>
      </div>

      {initialOffers.length === 0 ? (
        /* Empty State */
        <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card/40 space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-500 w-fit mx-auto">
            <DollarSign size={40} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold">No Job Offers Logged Yet</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Received a verbal offer or written letter? Log it here to calculate Year 1 Total Comp, model startup equity upside, and generate AI counter-offer pitch scripts.
            </p>
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            <Plus size={16} />
            <span>Log Your First Offer</span>
          </Button>
        </div>
      ) : (
        /* Offers Master-Detail View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Offer Cards List */}
          <div className="lg:col-span-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between px-1">
              <span>Your Offers ({initialOffers.length})</span>
              <button
                onClick={() => {
                  setEditingOffer(null);
                  setDialogOpen(true);
                }}
                className="text-primary hover:underline text-xs flex items-center gap-1 font-medium"
              >
                <Plus size={12} /> Add
              </button>
            </div>

            <div className="space-y-2.5">
              {initialOffers.map((offer) => {
                const isSelected = offer.id === selectedOfferId;
                return (
                  <div
                    key={offer.id}
                    onClick={() => setSelectedOfferId(offer.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-emerald-500/60 bg-emerald-500/5 shadow-sm ring-1 ring-emerald-500/20"
                        : "border-border/80 bg-card hover:border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{offer.company}</h4>
                        <p className="text-xs text-muted-foreground">{offer.role}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-mono ${
                          offer.status === "COUNTERED"
                            ? "border-amber-500/40 text-amber-500 bg-amber-500/5"
                            : offer.status === "ACCEPTED"
                            ? "border-emerald-500/40 text-emerald-500 bg-emerald-500/5"
                            : "border-primary/40 text-primary bg-primary/5"
                        }`}
                      >
                        {offer.status}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-baseline justify-between border-t border-border/40 pt-2 text-xs">
                      <span className="text-muted-foreground">Year 1 TC:</span>
                      <span className="font-black font-mono text-emerald-500 text-sm">
                        {formatCurrency(offer.annualTC)}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Base: {formatCompactCurrency(offer.baseSalary)}</span>
                      <span>
                        {offer.equityType === "NONE" ? "No Equity" : `${offer.equityType}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed Inspector */}
          {activeOffer && activeComp && (
            <div className="lg:col-span-8 space-y-6">
              {/* Selected Offer Header Card */}
              <Card className="border-border/80 bg-card/90 shadow-sm overflow-hidden">
                <CardHeader className="p-6 pb-4 border-b border-border/60">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-2xl font-black tracking-tight">
                          {activeOffer.company}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className="font-mono text-xs border-emerald-500/40 text-emerald-500 bg-emerald-500/5"
                        >
                          {activeOffer.status}
                        </Badge>
                        {activeOffer.location && (
                          <span className="text-xs text-muted-foreground">• {activeOffer.location}</span>
                        )}
                      </div>
                      <CardDescription className="text-sm font-medium text-foreground mt-0.5">
                        {activeOffer.role}
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingOffer(activeOffer);
                          setDialogOpen(true);
                        }}
                        className="gap-1.5 text-xs h-8"
                      >
                        <Edit size={13} />
                        <span>Edit</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteOffer(activeOffer.id)}
                        className="text-destructive hover:bg-destructive/10 gap-1.5 text-xs h-8 border-destructive/30"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  {/* Total Compensation Stack */}
                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Total Compensation (TC) Architecture
                      </h4>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground mr-2">Year 1 Total:</span>
                        <span className="text-2xl font-black font-mono text-emerald-500">
                          {formatCurrency(activeComp.year1TotalCompensation)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Stack */}
                    <div className="h-4 w-full rounded-full bg-muted overflow-hidden flex shadow-inner">
                      <div
                        style={{ width: `${activeComp.cashCompensationPercentage}%` }}
                        className="bg-emerald-500 transition-all"
                        title={`Cash: ${activeComp.cashCompensationPercentage}%`}
                      />
                      <div
                        style={{ width: `${activeComp.equityCompensationPercentage}%` }}
                        className="bg-primary transition-all"
                        title={`Equity: ${activeComp.equityCompensationPercentage}%`}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span>Guaranteed Cash ({activeComp.cashCompensationPercentage}%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary" />
                        <span>Equity Ownership ({activeComp.equityCompensationPercentage}%)</span>
                      </div>
                    </div>

                    {/* 4-Item Cash & Equity Component Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      <div className="p-3 rounded-xl border border-border/60 bg-muted/20">
                        <div className="text-[11px] text-muted-foreground">Base Salary</div>
                        <div className="text-base font-bold font-mono text-foreground mt-0.5">
                          {formatCurrency(activeComp.annualBase)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Guaranteed / Yr</div>
                      </div>

                      <div className="p-3 rounded-xl border border-border/60 bg-muted/20">
                        <div className="text-[11px] text-muted-foreground">Target Bonus</div>
                        <div className="text-base font-bold font-mono text-foreground mt-0.5">
                          {formatCurrency(activeComp.annualBonus)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Performance KPI</div>
                      </div>

                      <div className="p-3 rounded-xl border border-border/60 bg-muted/20">
                        <div className="text-[11px] text-muted-foreground">Sign-On Bonus</div>
                        <div className="text-base font-bold font-mono text-foreground mt-0.5">
                          {formatCurrency(activeComp.firstYearSignOn)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">One-time Year 1</div>
                      </div>

                      <div className="p-3 rounded-xl border border-border/60 bg-muted/20">
                        <div className="text-[11px] text-muted-foreground">Annual Equity</div>
                        <div className="text-base font-bold font-mono text-primary mt-0.5">
                          {formatCurrency(activeComp.annualEquityValue)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Vested / Yr (4-Yr Vest)</div>
                      </div>
                    </div>
                  </div>

                  {/* Startup Equity Upside Simulator */}
                  {activeOffer.equityType !== "NONE" && (
                    <div className="p-5 rounded-2xl border border-border/80 bg-muted/20 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm flex items-center gap-2">
                            <TrendingUp size={16} className="text-primary" />
                            <span>Startup Equity Upside Simulator</span>
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Model your 4-year equity value under different company valuation milestones.
                          </p>
                        </div>

                        {/* Scenario Pills */}
                        <div className="flex flex-wrap gap-1.5">
                          {activeComp.scenarios.map((sc, sIdx) => (
                            <button
                              key={sc.multiplier}
                              onClick={() => setSelectedScenarioIndex(sIdx)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                selectedScenarioIndex === sIdx
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "bg-background/80 hover:bg-background text-muted-foreground border border-border/60"
                              }`}
                            >
                              {sc.multiplier}x
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Active Scenario Banner */}
                      {activeComp.scenarios[selectedScenarioIndex] && (
                        <div className="p-4 rounded-xl bg-background/80 border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs font-semibold border-primary/40 text-primary">
                                {activeComp.scenarios[selectedScenarioIndex].multiplier}x Multiple
                              </Badge>
                              <span className="font-bold text-sm text-foreground">
                                {activeComp.scenarios[selectedScenarioIndex].scenarioName}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Projected Share Price:{" "}
                              <strong className="text-foreground">
                                {formatCurrency(activeComp.scenarios[selectedScenarioIndex].sharePrice)}
                              </strong>{" "}
                              • Gain / Share:{" "}
                              <strong className="text-foreground">
                                {formatCurrency(activeComp.scenarios[selectedScenarioIndex].perShareGain)}
                              </strong>
                            </div>
                          </div>

                          <div className="text-left sm:text-right">
                            <div className="text-xs text-muted-foreground">Estimated 4-Yr Equity Value</div>
                            <div className="text-2xl font-black font-mono text-primary">
                              {formatCurrency(
                                activeComp.scenarios[selectedScenarioIndex].fourYearEquityValue
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Year 1 TC: {formatCurrency(activeComp.scenarios[selectedScenarioIndex].year1TotalComp)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Counter-Offer & Negotiation Hub */}
                  <div className="space-y-4 pt-2 border-t border-border/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-base flex items-center gap-2">
                          <Sparkles size={18} className="text-primary" />
                          <span>AI Counter-Offer & Negotiation Strategist</span>
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Trained on executive compensation playbooks to craft polite, data-grounded negotiation scripts.
                        </p>
                      </div>

                      <Button
                        size="sm"
                        onClick={handleGenerateStrategy}
                        disabled={generatingStrategy}
                        className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-9 text-xs"
                      >
                        {generatingStrategy ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Generating Strategies...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} />
                            <span>{negotiationResult ? "Regenerate AI Strategies" : "Generate Counter-Offer (2 Credits)"}</span>
                          </>
                        )}
                      </Button>
                    </div>

                    {strategyError && (
                      <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/30 rounded-lg flex items-center gap-2">
                        <AlertTriangle size={15} />
                        <span>{strategyError}</span>
                      </div>
                    )}

                    {emailSuccess && (
                      <div className="p-3 text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-lg flex items-center gap-2">
                        <Check size={15} />
                        <span>{emailSuccess}</span>
                      </div>
                    )}

                    {emailError && (
                      <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/30 rounded-lg flex items-center gap-2">
                        <AlertTriangle size={15} />
                        <span>{emailError}</span>
                      </div>
                    )}

                    {!negotiationResult ? (
                      <div className="p-8 text-center border border-dashed border-border rounded-xl bg-card/40 space-y-2">
                        <Sparkles className="mx-auto text-primary" size={28} />
                        <h5 className="font-semibold text-sm">Unlock AI Counter-Offer Strategies</h5>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto">
                          Generate 3 tailored counter-offer email drafts (Base Salary Maximizer, Equity Optimizer, and Sign-on Bridge) plus phone call talking points.
                        </p>
                        <Button
                          size="sm"
                          onClick={handleGenerateStrategy}
                          disabled={generatingStrategy}
                          className="gap-2 mt-2"
                        >
                          <Sparkles size={14} />
                          <span>Generate Negotiation Strategies</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Strategy Switcher Tabs */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {negotiationResult.strategies.map((strat) => {
                            const isTabActive = activeStrategyTab === strat.id;
                            return (
                              <button
                                key={strat.id}
                                onClick={() => setActiveStrategyTab(strat.id)}
                                className={`p-3 rounded-xl border text-left transition-all ${
                                  isTabActive
                                    ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                                    : "border-border/80 bg-background/60 hover:bg-background text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                <div className="font-bold text-xs text-foreground flex items-center justify-between">
                                  <span>{strat.title}</span>
                                  {isTabActive && <Check size={12} className="text-primary" />}
                                </div>
                                <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-snug">
                                  {strat.tagline}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Active Strategy Pitch Viewer */}
                        {activeStrategy && (
                          <div className="p-5 rounded-2xl border border-border/80 bg-background/80 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                              <div>
                                <h5 className="font-bold text-sm text-foreground">
                                  {activeStrategy.title}
                                </h5>
                                <p className="text-xs text-muted-foreground">
                                  Outcome: {activeStrategy.expectedOutcome}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCopyScript(activeStrategy.emailBody)}
                                  className="gap-1.5 text-xs h-8"
                                >
                                  {copiedScript ? (
                                    <>
                                      <Check size={13} className="text-emerald-500" />
                                      <span className="text-emerald-500">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={13} />
                                      <span>Copy Email</span>
                                    </>
                                  )}
                                </Button>

                                <Button
                                  size="sm"
                                  onClick={handleSendViaGmail}
                                  disabled={sendingEmail}
                                  className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                >
                                  {sendingEmail ? (
                                    <>
                                      <Loader2 size={13} className="animate-spin" />
                                      <span>Sending...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Send size={13} />
                                      <span>Send via Gmail</span>
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>

                            {/* Email Draft Box */}
                            <div className="space-y-2">
                              <div className="text-xs text-muted-foreground font-mono bg-muted/40 p-2 rounded-md border border-border/60">
                                <strong>Subject:</strong> {activeStrategy.subject}
                              </div>
                              <pre className="p-4 rounded-xl bg-card border border-border/80 text-xs font-sans text-foreground whitespace-pre-wrap leading-relaxed">
                                {activeStrategy.emailBody}
                              </pre>
                            </div>

                            <div className="text-[11px] text-muted-foreground italic">
                              💡 Best timing: {activeStrategy.bestUsedWhen}
                            </div>
                          </div>
                        )}

                        {/* Phone Call Talking Points & Pitfalls Accordion */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                            <h6 className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                              <ShieldCheck size={14} className="text-emerald-500" />
                              <span>Verbal Talking Points (For Compensation Call)</span>
                            </h6>
                            <ul className="space-y-1.5 text-xs text-muted-foreground pl-1">
                              {negotiationResult.verbalTalkingPoints.map((pt, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-emerald-500 font-bold shrink-0">💬</span>
                                  <span className="leading-snug">{pt}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                            <h6 className="font-bold text-xs flex items-center gap-1.5 text-destructive">
                              <AlertTriangle size={14} />
                              <span>Common Negotiation Red Flags</span>
                            </h6>
                            <ul className="space-y-1.5 text-xs text-muted-foreground pl-1">
                              {negotiationResult.pitfallsToAvoid.map((pf, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-destructive font-bold shrink-0">✗</span>
                                  <span className="leading-snug">{pf}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Offer Dialog */}
      <OfferDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={
          editingOffer
            ? {
                id: editingOffer.id,
                company: editingOffer.company,
                role: editingOffer.role,
                location: editingOffer.location || "",
                baseSalary: editingOffer.baseSalary,
                targetBonus: editingOffer.targetBonus,
                signOnBonus: editingOffer.signOnBonus,
                equityType: editingOffer.equityType as "OPTIONS" | "RSU" | "NONE",
                equityShares: editingOffer.equityShares,
                strikePrice: editingOffer.strikePrice,
                currentValuation: editingOffer.currentValuation,
                vestingYears: editingOffer.vestingYears,
                status: editingOffer.status,
                notes: editingOffer.notes || "",
              }
            : undefined
        }
        onOfferSaved={() => {
          router.refresh();
        }}
      />

      {/* Low Credits Modal */}
      <LowCreditsModal
        open={lowCreditsOpen}
        onOpenChange={setLowCreditsOpen}
        requiredCredits={2}
        actionName="AI Counter-Offer Negotiation Strategy"
      />
    </div>
  );
}
