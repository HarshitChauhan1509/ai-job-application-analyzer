"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  FileText,
  Briefcase,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Loader2,
  Mic,
  BookmarkPlus,
  ExternalLink,
  AlertTriangle,
  Printer,
} from "lucide-react";
import { runLiveJobMatchAction } from "@/app/actions/ai";
import { createApplicationAction } from "@/app/actions/application";
import { generateTailoredResumeAction } from "@/app/actions/tailor";
import { LowCreditsModal } from "@/components/credits/low-credits-modal";
import { useToast } from "@/hooks/use-toast";

export interface MatchRecord {
  id: string;
  overallScore: number;
  skillsScore: number;
  experienceScore: number;
  keywordsScore: number;
  strongMatches: string;
  missingSkills: string;
  missingKeywords: string;
  recommendations: string;
  updatedAt: string | Date;
}

interface MatchClientProps {
  resume: {
    id: string;
    name: string;
    targetRole: string | null;
  };
  job: {
    id: string;
    company: string;
    position: string;
    location: string | null;
    url: string | null;
  };
  initialMatch: MatchRecord | null;
  existingApplication: {
    id: string;
    status: string;
  } | null;
}

function safeParseArray(val: string | string[] | null | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function MatchAnalysisClient({
  resume,
  job,
  initialMatch,
  existingApplication,
}: MatchClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [match, setMatch] = useState<MatchRecord | null>(initialMatch);
  const [application, setApplication] = useState(existingApplication);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lowCreditState, setLowCreditState] = useState<{
    open: boolean;
    required: number;
    balance: number;
  }>({ open: false, required: 2, balance: 0 });

  const autoTriggeredRef = useRef(false);

  const handleRunMatch = useCallback(async (isInitialAutoRun = false) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const res = await runLiveJobMatchAction(resume.id, job.id);
      if (res.success && res.match) {
        setMatch(res.match as MatchRecord);
        if (!isInitialAutoRun) {
          toast({
            title: "Match Analysis Updated",
            description: `Updated compatibility score: ${res.match.overallScore}% for ${job.position} @ ${job.company}.`,
          });
        }
        router.refresh();
      } else if (res.code === "INSUFFICIENT_CREDITS") {
        setLowCreditState({
          open: true,
          required: res.requiredCredits ?? 2,
          balance: res.currentBalance ?? 0,
        });
        setError(res.error || "Insufficient AI credits to compute match.");
      } else {
        setError(res.error || "Failed to analyze resume compatibility.");
        toast({
          title: "Analysis Error",
          description: res.error || "Could not analyze match.",
          variant: "destructive",
        });
      }
    } catch (e: unknown) {
      console.error("Match analysis error:", e);
      setError(e instanceof Error ? e.message : "Unexpected error while matching.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [resume.id, job.id, job.position, job.company, toast, router]);

  useEffect(() => {
    if (!initialMatch && !autoTriggeredRef.current) {
      autoTriggeredRef.current = true;
      handleRunMatch(true);
    }
  }, [initialMatch, handleRunMatch]);

  const handleTrackApplication = async () => {
    setIsTracking(true);
    const res = await createApplicationAction(job.id);
    if (res.success && res.application) {
      setApplication({ id: res.application.id, status: res.application.status });
      toast({
        title: "Added to Kanban Pipeline",
        description: `Now tracking ${job.position} @ ${job.company}.`,
      });
      router.refresh();
    } else {
      toast({
        title: "Could Not Add Application",
        description: res.error || "Please check your pipeline.",
        variant: "destructive",
      });
    }
    setIsTracking(false);
  };

  const handleOneClickTailor = async () => {
    setIsTailoring(true);
    try {
      const res = await generateTailoredResumeAction({
        baseResumeId: resume.id,
        jobId: job.id,
      });

      if (res.success && res.tailoredResumeId) {
        toast({
          title: "Tailored Resume Ready",
          description: `Generated ATS-optimized PDF variant for ${job.company}.`,
        });
        router.push(`/resumes/tailor/${res.tailoredResumeId}`);
      } else if (res.code === "INSUFFICIENT_CREDITS") {
        setLowCreditState({
          open: true,
          required: res.requiredCredits ?? 2,
          balance: res.currentBalance ?? 0,
        });
      } else {
        toast({
          title: "Tailoring Failed",
          description: res.error || "Could not generate tailored resume.",
          variant: "destructive",
        });
      }
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to tailor resume.",
        variant: "destructive",
      });
    } finally {
      setIsTailoring(false);
    }
  };

  const strongMatches = safeParseArray(match?.strongMatches);
  const missingSkills = safeParseArray(match?.missingSkills);
  const missingKeywords = safeParseArray(match?.missingKeywords);
  const recommendations = safeParseArray(match?.recommendations);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <Link href="/jobs">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Live Match Analysis</h1>
            <div className="flex flex-wrap items-center text-sm text-muted-foreground mt-1 gap-2">
              <Link href={`/resumes/${resume.id}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                <FileText size={14} /> {resume.name}
              </Link>
              <ChevronRight size={14} />
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Briefcase size={14} className="text-primary" /> {job.position} @ {job.company}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRunMatch(false)}
            disabled={isAnalyzing}
            className="gap-1.5 text-xs h-8"
          >
            {isAnalyzing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {match ? "Re-Analyze Fit (2 credits)" : "Run Match Analysis (2 credits)"}
          </Button>

          {application ? (
            <Link href={`/applications/${application.id}`}>
              <Button size="sm" variant="secondary" className="gap-1.5 text-xs h-8">
                View Application ({application.status}) <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          ) : (
            <Button
              size="sm"
              onClick={handleTrackApplication}
              disabled={isTracking}
              className="gap-1.5 text-xs h-8"
            >
              {isTracking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <BookmarkPlus className="h-3.5 w-3.5" />
              )}
              Track in Kanban
            </Button>
          )}
        </div>
      </div>

      {/* Loading / Pending Analysis State */}
      {isAnalyzing && !match && (
        <Card className="border-primary/20 bg-primary/5 py-16">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div>
              <h3 className="font-semibold text-lg">Computing Live AI Match Compatibility...</h3>
              <p className="text-sm text-muted-foreground max-w-md mt-1">
                Evaluating your resume skills, portfolio projects, and experience against{" "}
                <strong>{job.company}</strong>&apos;s requirements.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State without Match */}
      {!isAnalyzing && !match && (
        <Card className="border-amber-500/30 bg-amber-500/5 py-12">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <div>
              <h3 className="font-semibold text-lg">Match Score Not Calculated Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mt-1">
                {error || "Click below to analyze your resume compatibility against this job description."}
              </p>
            </div>
            <Button onClick={() => handleRunMatch(false)} className="gap-2">
              <Sparkles className="h-4 w-4" /> Compute Live Match (2 Credits)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Live Match Breakdown */}
      {match && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Score */}
            <Card className="border-primary/20 bg-primary/5 flex flex-col justify-center items-center p-6 text-center">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">
                Overall Match Score
              </CardTitle>
              <div className="relative flex items-center justify-center w-40 h-40">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-muted/30"
                  />
                  <motion.circle
                    initial={{ strokeDasharray: "0 282" }}
                    animate={{ strokeDasharray: `${(match.overallScore / 100) * 282.7} 282.7` }}
                    transition={{ duration: 1.1, ease: "easeOut" }}
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className={
                      match.overallScore >= 80
                        ? "text-emerald-500"
                        : match.overallScore >= 65
                        ? "text-primary"
                        : "text-amber-500"
                    }
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-4xl font-extrabold">{match.overallScore}%</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-5 max-w-[220px]">
                {match.overallScore >= 85
                  ? "Outstanding candidate fit — prioritize direct outreach."
                  : match.overallScore >= 70
                  ? "Strong foundation — address the missing keywords below before applying."
                  : "Targeted resume tailoring recommended to clear ATS filters."}
              </p>
            </Card>

            {/* Dimensional Breakdown */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Match Breakdown</CardTitle>
                <CardDescription>
                  How your background aligns with {job.company}&apos;s role requirements.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Technical Skills Match</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {match.skillsScore}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${match.skillsScore}%` }}
                      transition={{ duration: 0.9 }}
                      className="h-full bg-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Experience &amp; Seniority Alignment</span>
                    <span className="font-bold text-primary">{match.experienceScore}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${match.experienceScore}%` }}
                      transition={{ duration: 0.9, delay: 0.15 }}
                      className="h-full bg-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>ATS Keyword Coverage</span>
                    <span className="font-bold text-blue-500">{match.keywordsScore}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${match.keywordsScore}%` }}
                      transition={{ duration: 0.9, delay: 0.3 }}
                      className="h-full bg-blue-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center gap-2">
                <CheckCircle2 className="text-emerald-500 h-5 w-5" />
                <CardTitle>Strong Matches</CardTitle>
              </CardHeader>
              <CardContent>
                {strongMatches.length > 0 ? (
                  <ul className="space-y-3">
                    {strongMatches.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed">
                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Add more detailed skills and projects to your Profile to boost match detection.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 flex flex-row items-center gap-2">
                <XCircle className="text-destructive h-5 w-5" />
                <CardTitle>Missing Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Skills</p>
                    {missingSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {missingSkills.map((kw, i) => (
                          <Badge
                            key={i}
                            variant="destructive"
                            className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                          >
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        All core technical skills matched!
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                      ATS Keywords to Weave In
                    </p>
                    {missingKeywords.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {missingKeywords.map((kw, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                          >
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No major keyword gaps identified.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-primary/20 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none text-primary">
              <Sparkles size={120} />
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5" />
                Tailoring Plan to Boost Your Match
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 relative z-10">
                {recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-lg bg-background border border-border shadow-2xs flex items-start gap-3"
                  >
                    <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-sm font-bold">
                      {i + 1}
                    </div>
                    <p className="text-sm leading-relaxed">{rec}</p>
                  </div>
                ))}

                <div className="pt-4 flex flex-wrap justify-end gap-3">
                  <Link href={`/coach?role=${encodeURIComponent(job.position)}&jobId=${job.id}`}>
                    <Button variant="outline" className="gap-2">
                      <Mic className="h-4 w-4" /> Practice Role Interview
                    </Button>
                  </Link>
                  <Link href={`/improve?resumeId=${resume.id}&jobId=${job.id}`}>
                    <Button variant="outline" className="gap-2">
                      Open AI Resume Improver
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button onClick={handleOneClickTailor} disabled={isTailoring} className="gap-2 shadow-sm">
                    {isTailoring ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Tailoring Resume...
                      </>
                    ) : (
                      <>
                        <Printer className="h-4 w-4" /> 1-Click Tailor ATS PDF (2 credits)
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <LowCreditsModal
        open={lowCreditState.open}
        onOpenChange={(open) => setLowCreditState((prev) => ({ ...prev, open }))}
        requiredCredits={lowCreditState.required}
        currentBalance={lowCreditState.balance}
        actionName="Live Resume-to-Job Match Analysis"
      />
    </div>
  );
}
