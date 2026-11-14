"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Clock,
  Award,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Zap,
  ArrowRight,
  Sparkles,
  Printer,
  Mail,
  Send,
  Target,
  Mic,
  Coins,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnalyticsData } from "@/app/actions/analytics";

interface AnalyticsClientProps {
  initialData: AnalyticsData;
}

export function AnalyticsClient({ initialData }: AnalyticsClientProps) {
  const [data] = useState<AnalyticsData>(initialData);

  const { funnel, velocity, atsCorrelation, interviewCoach, outreach, credits } = data;

  const handlePrint = () => {
    window.print();
  };

  const funnelSteps = [
    {
      label: "Saved Roles",
      count: funnel.saved,
      color: "bg-slate-500",
      textColor: "text-slate-500",
      description: "Bookmarked opportunities",
    },
    {
      label: "Applications Sent",
      count: funnel.applied,
      color: "bg-blue-500",
      textColor: "text-blue-500",
      description: "Submitted or cold pitched",
    },
    {
      label: "Recruiter Screenings",
      count: funnel.screening,
      color: "bg-amber-500",
      textColor: "text-amber-500",
      description: "HR / Talent introductions",
    },
    {
      label: "Technical Interviews",
      count: funnel.interview,
      color: "bg-purple-500",
      textColor: "text-purple-500",
      description: "System design & deep dives",
    },
    {
      label: "Offers Extended",
      count: funnel.offer,
      color: "bg-emerald-500",
      textColor: "text-emerald-500",
      description: "Job offers received",
    },
  ];

  const maxFunnelCount = Math.max(
    1,
    ...funnelSteps.map((s) => s.count),
    funnel.totalApplications
  );

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <BarChart3 className="h-6 w-6" />
            </div>
            Application Funnel &amp; Conversion Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time conversion drop-off, ATS match score correlation, response velocity, and AI coach trajectory.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-xs h-8 gap-1.5"
          >
            <Printer size={13} />
            <span>Print Report</span>
          </Button>

          <Link href="/applications">
            <Button size="sm" className="text-xs h-8 gap-1.5 shadow-sm">
              <span>View Kanban Board</span>
              <ArrowRight size={13} />
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <Card className="shadow-xs border-border/60 hover:border-primary/40 transition-all">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Pipeline
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {funnel.activeApplications}{" "}
              <span className="text-xs font-normal text-muted-foreground">roles</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <span>{funnel.totalApplications} total tracked applications</span>
            </p>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card className="shadow-xs border-border/60 hover:border-primary/40 transition-all">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Applied ➔ Interview
            </span>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Target size={16} />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold tracking-tight text-foreground flex items-baseline gap-2">
              {funnel.appliedToInterviewRate}%
              {funnel.appliedToInterviewRate >= 20 ? (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  Top 10%
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Industry baseline: 10% – 15%
            </p>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card className="shadow-xs border-border/60 hover:border-primary/40 transition-all">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Avg. Turnaround Velocity
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {velocity.avgDaysToInterview !== null ? `${velocity.avgDaysToInterview} days` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {velocity.fastestResponseDays !== null
                ? `Fastest response: ${velocity.fastestResponseDays} days`
                : "Tracking status changes..."}
            </p>
          </CardContent>
        </Card>

        {/* Metric 4 */}
        <Card className="shadow-xs border-border/60 hover:border-primary/40 transition-all">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Offers &amp; Closing
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Award size={16} />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {funnel.offer}{" "}
              <span className="text-xs font-normal text-muted-foreground">offers</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {funnel.interviewToOfferRate}% interview-to-offer rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Pipeline Conversion Funnel */}
      <Card className="shadow-xs border-border/60">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                Pipeline Conversion Funnel
                <Badge variant="outline" className="text-[10px] font-semibold bg-primary/5 text-primary">
                  End-to-End
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Conversion velocity from discovering open roles to receiving firm offers.
              </CardDescription>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-destructive"></span>
                {funnel.rejected} Archived / Rejected
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                {funnel.overallSuccessRate}% Overall Success
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-4">
            {funnelSteps.map((step, idx) => {
              const percentageOfMax =
                maxFunnelCount > 0 ? Math.round((step.count / maxFunnelCount) * 100) : 0;
              const nextStep = funnelSteps[idx + 1];
              const stepConversionRate =
                step.count > 0 && nextStep
                  ? Math.round((nextStep.count / step.count) * 100)
                  : null;

              return (
                <div key={step.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${step.color}`}></span>
                      <span className="font-semibold text-foreground">{step.label}</span>
                      <span className="text-[11px] text-muted-foreground hidden sm:inline">
                        • {step.description}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono">
                      <span className="font-bold text-foreground text-sm">{step.count}</span>
                      {stepConversionRate !== null && (
                        <span className="text-[11px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/50">
                          {stepConversionRate}% ➔ Next Stage
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="h-3 w-full bg-muted/50 rounded-full overflow-hidden border border-border/30">
                    <div
                      className={`h-full ${step.color} transition-all duration-500 rounded-full`}
                      style={{ width: `${Math.max(percentageOfMax, step.count > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border/40 text-xs">
            <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                Saved ➔ Applied Velocity
              </span>
              <div className="text-lg font-bold text-foreground mt-0.5">
                {funnel.savedToAppliedRate}%
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Percentage of saved jobs converted into dispatched applications.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                Screening ➔ Final Interview
              </span>
              <div className="text-lg font-bold text-foreground mt-0.5">
                {funnel.screening > 0
                  ? Math.round((funnel.interview / funnel.screening) * 100)
                  : 0}
                %
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Conversion rate from initial recruiter screen to technical loop.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                Offer Acceptance Ratio
              </span>
              <div className="text-lg font-bold text-foreground mt-0.5">
                {funnel.interviewToOfferRate}%
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Ratio of completed technical interviews converting into offers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Middle Grid: ATS Correlation & Voice Interview Coach */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: ATS Match Score Correlation */}
        <Card className="shadow-xs border-border/60 flex flex-col">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              ATS Match Score vs. Interview Rate
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Correlation between AI job match precision and invitation outcomes.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-5 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              {/* High Fit */}
              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck size={14} />
                    <span>High Fit (80% - 100% Match)</span>
                  </div>
                  <span className="font-mono text-xs font-bold">
                    {atsCorrelation.tierDistribution.highFit.count} roles
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Interview Invitations</span>
                  <span className="font-semibold text-foreground">
                    {atsCorrelation.tierDistribution.highFit.interviewCount} invites (
                    {atsCorrelation.tierDistribution.highFit.count > 0
                      ? Math.round(
                          (atsCorrelation.tierDistribution.highFit.interviewCount /
                            atsCorrelation.tierDistribution.highFit.count) *
                            100
                        )
                      : 0}
                    %)
                  </span>
                </div>
              </div>

              {/* Moderate Fit */}
              <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-semibold text-blue-700 dark:text-blue-400">
                    <Target size={14} />
                    <span>Moderate Fit (65% - 79% Match)</span>
                  </div>
                  <span className="font-mono text-xs font-bold">
                    {atsCorrelation.tierDistribution.moderateFit.count} roles
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Interview Invitations</span>
                  <span className="font-semibold text-foreground">
                    {atsCorrelation.tierDistribution.moderateFit.interviewCount} invites (
                    {atsCorrelation.tierDistribution.moderateFit.count > 0
                      ? Math.round(
                          (atsCorrelation.tierDistribution.moderateFit.interviewCount /
                            atsCorrelation.tierDistribution.moderateFit.count) *
                            100
                        )
                      : 0}
                    %)
                  </span>
                </div>
              </div>

              {/* Stretch Fit */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-semibold text-muted-foreground">
                    <Zap size={14} />
                    <span>Stretch Fit (&lt;65% Match)</span>
                  </div>
                  <span className="font-mono text-xs font-bold">
                    {atsCorrelation.tierDistribution.stretchFit.count} roles
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Interview Invitations</span>
                  <span className="font-semibold text-foreground">
                    {atsCorrelation.tierDistribution.stretchFit.interviewCount} invites (
                    {atsCorrelation.tierDistribution.stretchFit.count > 0
                      ? Math.round(
                          (atsCorrelation.tierDistribution.stretchFit.interviewCount /
                            atsCorrelation.tierDistribution.stretchFit.count) *
                            100
                        )
                      : 0}
                    %)
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground flex items-start gap-2.5">
              <Zap size={14} className="text-primary shrink-0 mt-0.5" />
              <span>
                <strong>Insight:</strong> Tailoring your resume keywords to reach <strong>80%+ match</strong>{" "}
                typically yields <strong>2.5x to 3x higher interview invite rates</strong> compared to general submissions.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Right: AI Voice Coach Scorecard */}
        <Card className="shadow-xs border-border/60 flex flex-col">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Mic size={16} className="text-purple-500" />
                  Voice Interview Simulator Growth
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Speech fluency, STAR framework mastery, and hiring bar clearance.
                </CardDescription>
              </div>

              <Link href="/coach">
                <Button variant="ghost" size="sm" className="text-xs h-7 gap-1 text-primary">
                  Practice <ChevronRight size={12} />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-5 flex-1 flex flex-col justify-between">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">
                  {interviewCoach.avgScore !== null ? `${interviewCoach.avgScore}` : "—"}
                  <span className="text-xs font-normal text-muted-foreground"> / 10</span>
                </div>
                <div className="text-xs font-semibold text-foreground mt-1">
                  Average Diagnostic Score
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Across {interviewCoach.completedSessions} completed sessions
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {interviewCoach.clearedBarRate}%
                </div>
                <div className="text-xs font-semibold text-foreground mt-1">
                  Hiring Bar Clearance
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Sessions scored &ge; 7.5 / 10
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40">
                <span className="text-muted-foreground">Highest Session Score</span>
                <span className="font-mono font-bold text-foreground">
                  {interviewCoach.bestScore !== null ? `${interviewCoach.bestScore} / 10` : "No sessions yet"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40">
                <span className="text-muted-foreground">Total Practice Sessions</span>
                <span className="font-mono font-bold text-foreground">
                  {interviewCoach.totalSessions} sessions
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20 text-xs text-muted-foreground flex items-center justify-between">
              <span className="text-[11px]">
                Ready to elevate your STAR technique and pace metrics?
              </span>
              <Link href="/coach">
                <Button size="sm" variant="outline" className="text-xs h-7 gap-1 border-purple-500/30 text-purple-600 dark:text-purple-400">
                  Launch Coach
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid: Outreach Velocity & Credit Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Direct Outreach Velocity */}
        <Card className="shadow-xs border-border/60">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Send size={16} className="text-blue-500" />
              Direct Founder &amp; Recruiter Outreach
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Cold pitches dispatched via connected Gmail and authentic mailbox sync.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Mail size={16} />
                </div>
                <div>
                  <div className="font-semibold text-foreground">Connected Mailbox</div>
                  <div className="text-[11px] text-muted-foreground">
                    {outreach.hasConnectedMailbox
                      ? outreach.connectedEmailAddress
                      : "No active Gmail connection"}
                  </div>
                </div>
              </div>

              <Badge
                variant="outline"
                className={`text-[10px] font-semibold ${
                  outreach.hasConnectedMailbox
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                }`}
              >
                {outreach.hasConnectedMailbox ? "Sync Active" : "Disconnected"}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                <div className="text-2xl font-bold text-foreground">
                  {outreach.outreachByPitchType.founder}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Founder Cold Pitches
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                <div className="text-2xl font-bold text-foreground">
                  {outreach.outreachByPitchType.recruiter}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Tech Lead / InMail Notes
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Total cold emails dispatched from candidate's authentic inbox:{" "}
              <strong className="text-foreground">{outreach.totalDirectPitchesSent} pitches</strong>.
            </p>
          </CardContent>
        </Card>

        {/* Right: AI Credit Economy & ROI */}
        <Card className="shadow-xs border-border/60">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Coins size={16} className="text-amber-500" />
                  AI Credits &amp; Resource Consumption
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Ledger of credits spent across tailoring, mock interviews, and pitches.
                </CardDescription>
              </div>

              <Link href="/dashboard/billing">
                <Button variant="ghost" size="sm" className="text-xs h-7 text-primary">
                  Billing <ChevronRight size={12} />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
              <div>
                <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  Available AI Credits
                </div>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                  {credits.currentBalance}{" "}
                  <span className="text-xs font-normal text-muted-foreground">credits</span>
                </div>
              </div>

              <Link href="/dashboard/billing">
                <Button size="sm" className="text-xs h-7 shadow-xs">
                  Top Up Credits
                </Button>
              </Link>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Spend Breakdown
              </div>
              {Object.keys(credits.spendByAction).length > 0 ? (
                <div className="space-y-1">
                  {Object.entries(credits.spendByAction).map(([action, amount]) => (
                    <div
                      key={action}
                      className="flex items-center justify-between p-1.5 rounded bg-muted/20 border border-border/30 text-xs"
                    >
                      <span className="font-mono text-[11px]">{action.replace(/_/g, " ")}</span>
                      <span className="font-bold text-foreground">{amount} credits</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground py-2 text-center bg-muted/10 rounded border border-dashed border-border/50">
                  No credits spent yet. Explore Tailoring, Pitch Generation, or Mock Interviews!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
