"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  MailCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Calendar,
  AlertCircle,
  RotateCcw,
  PlusCircle,
  Loader2,
} from "lucide-react";
import {
  parseEmailTextAction,
  applyParsedEmailAction,
  ParseEmailResponse,
} from "@/app/actions/email-parser";
import { ParsedEmailResult } from "@/lib/ai/email-parser";

const SAMPLE_EMAILS = [
  {
    label: "📅 Interview Invite",
    text: `Hi Harshit,\n\nThanks for speaking with our team! The engineering leaders at Linear were really impressed by your background and would love to invite you for a 45-minute technical screen for the Senior Fullstack Engineer position.\n\nPlease pick a slot on our hiring team's calendar: https://calendly.com/linear-team/tech-screen\n\nLooking forward to speaking soon,\nSarah Jenkins | Recruiting at Linear`,
  },
  {
    label: "🎉 Offer Letter",
    text: `Dear Harshit,\n\nOn behalf of Stripe, we are thrilled to offer you the position of Senior Frontend Engineer! Your domain expertise and web architecture experience made a stellar impression.\n\nAttached is your formal offer package detailing compensation, equity, and start dates. Please review and let us know your thoughts.\n\nCongratulations and welcome to Stripe!`,
  },
  {
    label: "✉️ Confirmation",
    text: `Thank you for applying to Figma for the Infrastructure Software Engineer position. We have received your application and resume. Our engineering recruiting team will review your qualifications and reach out if there's a match.`,
  },
  {
    label: "🚫 Rejection",
    text: `Hi Harshit,\n\nThank you for taking the time to interview for the Staff Engineer role at Notion. While our team was very impressed by your achievements, we have decided to move forward with another candidate whose background is a closer match for our immediate needs.\n\nWe wish you the best in your job search!`,
  },
];

export function QuickEmailLogDialog() {
  const [open, setOpen] = useState(false);
  const [emailText, setEmailText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedEmailResult | null>(null);
  const [parseResponse, setParseResponse] = useState<ParseEmailResponse | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [createNew, setCreateNew] = useState<boolean>(false);

  const { toast } = useToast();
  const router = useRouter();

  const handleReset = () => {
    setEmailText("");
    setParsedData(null);
    setParseResponse(null);
    setSelectedApplicationId(null);
    setCreateNew(false);
    setIsAnalyzing(false);
    setIsApplying(false);
  };

  const handleAnalyze = async () => {
    if (!emailText.trim() || emailText.trim().length < 15) {
      toast({
        title: "Input too short",
        description: "Please paste a recruiter email or message with at least 15 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const res = await parseEmailTextAction(emailText);
      if (!res.success || !res.parsed) {
        toast({
          title: "Analysis Failed",
          description: res.error || "Could not extract metadata from this email snippet.",
          variant: "destructive",
        });
        setIsAnalyzing(false);
        return;
      }

      setParseResponse(res);
      setParsedData(res.parsed);

      if (res.suggestedApplicationId) {
        setSelectedApplicationId(res.suggestedApplicationId);
        setCreateNew(false);
      } else {
        setSelectedApplicationId(null);
        setCreateNew(true);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to communicate with AI analysis server.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = async () => {
    if (!parsedData) return;

    setIsApplying(true);
    try {
      const res = await applyParsedEmailAction({
        applicationId: !createNew && selectedApplicationId ? selectedApplicationId : undefined,
        parsedData,
        createNewIfNoMatch: createNew,
      });

      if (!res.success) {
        toast({
          title: "Update Failed",
          description: res.error || "Could not update your application status.",
          variant: "destructive",
        });
        setIsApplying(false);
        return;
      }

      toast({
        title: res.actionTaken === "CREATED" ? "Application Created! 🚀" : "Pipeline Updated! 🎯",
        description: `${parsedData.company} (${parsedData.role}) is now marked as ${parsedData.statusLabel}.`,
      });

      setOpen(false);
      handleReset();
      router.refresh();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to apply changes to pipeline.",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OFFER":
        return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      case "INTERVIEW":
        return "bg-primary/15 text-primary border-primary/30";
      case "SCREENING":
        return "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30";
      case "REJECTED":
        return "bg-destructive/15 text-destructive border-destructive/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-9 gap-1.5 shadow-sm border-dashed"
      >
        <MailCheck className="h-4 w-4 text-primary" />
        <span className="font-medium text-xs">Sync / Log Recruiter Email</span>
      </Button>

      <Dialog
        open={open}
        onOpenChange={(val) => {
          setOpen(val);
          if (!val) handleReset();
        }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <MailCheck className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg">AI Recruiter Email Sync</DialogTitle>
              <DialogDescription className="text-xs">
                Paste any ATS update, interview invite, or offer letter to instantly advance your pipeline.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!parsedData ? (
          /* STEP 1: INPUT VIEW */
          <div className="space-y-4 pt-2">
            {/* Quick Test Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Quick Test Samples:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_EMAILS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setEmailText(sample.text)}
                    className="text-xs px-2.5 py-1 rounded-full border bg-muted/50 hover:bg-muted text-foreground transition-colors"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Email Textarea */}
            <div className="space-y-1.5">
              <Textarea
                value={emailText}
                onChange={(e) => setEmailText(e.target.value)}
                placeholder="Paste email text, interview invitation link, confirmation, or rejection message here..."
                rows={8}
                className="text-xs font-mono resize-none leading-relaxed"
              />
              <div className="flex justify-between items-center text-[11px] text-muted-foreground px-0.5">
                <span>Supports forwarded emails, ATS templates, and direct recruiter messages.</span>
                <span>{emailText.length} characters</span>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={isAnalyzing}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAnalyze}
                disabled={isAnalyzing || emailText.trim().length < 15}
                className="gap-1.5"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Analyze & Extract Pipeline Updates
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* STEP 2: REVIEW & CONFIRM VIEW */
          <div className="space-y-4 pt-1">
            {/* AI Extraction Highlight Card */}
            <Card className="border border-border/70 bg-card/60 shadow-xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">
                      {parsedData.company.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm leading-tight">{parsedData.company}</h4>
                      <p className="text-xs text-muted-foreground">{parsedData.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className={`font-semibold text-xs px-2.5 py-0.5 ${getStatusColor(parsedData.detectedStatus)}`}>
                      {parsedData.statusLabel}
                    </Badge>
                  </div>
                </div>

                {/* Summary Quote */}
                <div className="bg-muted/40 rounded-md p-2.5 text-xs text-foreground/90 leading-relaxed border border-border/40">
                  <span className="font-semibold text-muted-foreground block text-[10px] uppercase tracking-wider mb-1">
                    AI Summary
                  </span>
                  {parsedData.summary}
                </div>

                {/* Next Step / Action Required Banner */}
                {parsedData.actionRequired && parsedData.actionDetails && (
                  <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-md p-2.5 text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Action Required: </span>
                      {parsedData.actionDetails}
                    </div>
                  </div>
                )}

                {/* Interview Date if present */}
                {parsedData.interviewDate && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>Mentioned Date/Time: <strong className="text-foreground">{parsedData.interviewDate}</strong></span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Target Application Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                Target Pipeline Application:
              </label>

              {parseResponse?.candidateApplications && parseResponse.candidateApplications.length > 0 ? (
                <div className="space-y-1.5">
                  {parseResponse.candidateApplications.map((cand) => (
                    <label
                      key={cand.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        !createNew && selectedApplicationId === cand.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="targetApp"
                          checked={!createNew && selectedApplicationId === cand.id}
                          onChange={() => {
                            setSelectedApplicationId(cand.id);
                            setCreateNew(false);
                          }}
                          className="h-3.5 w-3.5 text-primary"
                        />
                        <div>
                          <span className="font-semibold">{cand.company}</span>
                          <span className="text-muted-foreground"> — {cand.position}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-muted-foreground">Currently: {cand.currentStatus}</span>
                        <ArrowRight size={10} className="text-primary" />
                        <span className="font-bold text-primary">{parsedData.detectedStatus}</span>
                      </div>
                    </label>
                  ))}

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      createNew
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetApp"
                      checked={createNew}
                      onChange={() => {
                        setCreateNew(true);
                        setSelectedApplicationId(null);
                      }}
                      className="h-3.5 w-3.5 text-primary"
                    />
                    <PlusCircle className="h-3.5 w-3.5 text-primary" />
                    <span>Create as a new application for <strong>{parsedData.company}</strong></span>
                  </label>
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-border bg-muted/30 text-xs space-y-1">
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <PlusCircle className="h-3.5 w-3.5 text-primary" />
                    No existing application found for {parsedData.company}.
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    CareerPilot will automatically create a new application for <strong>{parsedData.company}</strong> ({parsedData.role}) at the <strong>{parsedData.statusLabel}</strong> stage.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={isApplying}
                className="gap-1 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Analyze Another
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={isApplying}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleApply}
                  disabled={isApplying || (!createNew && !selectedApplicationId)}
                  className="gap-1.5"
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Updating Pipeline...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Apply & Update Pipeline
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
