"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Zap } from "lucide-react";
import { generateTailoredResumeAction } from "@/app/actions/tailor";
import { LowCreditsModal } from "@/components/credits/low-credits-modal";
import { useToast } from "@/hooks/use-toast";

export interface TailorResumeOption {
  id: string;
  name: string;
  isPrimary?: boolean;
}

export interface TailorJobOption {
  id: string;
  company: string;
  position: string;
  location?: string | null;
}

interface TailorResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumes?: TailorResumeOption[];
  jobs?: TailorJobOption[];
  defaultResumeId?: string;
  defaultJobId?: string;
  defaultCompany?: string;
  defaultRole?: string;
}

function TailorResumeForm({
  onOpenChange,
  onLowCredits,
  resumes = [],
  jobs = [],
  defaultResumeId,
  defaultJobId,
  defaultCompany = "",
  defaultRole = "",
}: Omit<TailorResumeDialogProps, "open"> & {
  onLowCredits: (required: number, balance: number) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [selectedResumeId, setSelectedResumeId] = useState(
    defaultResumeId || resumes.find((r) => r.isPrimary)?.id || resumes[0]?.id || ""
  );
  const [selectedJobId, setSelectedJobId] = useState(
    defaultJobId || (jobs.length > 0 ? jobs[0].id : "custom")
  );
  const [targetCompany, setTargetCompany] = useState(defaultCompany);
  const [targetRole, setTargetRole] = useState(defaultRole);
  const [customJd, setCustomJd] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const isCustomJob = selectedJobId === "custom" || jobs.length === 0;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCustomJob && (!targetCompany.trim() || !targetRole.trim())) {
      toast({
        title: "Role Details Needed",
        description: "Please provide both target company and target role title.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const res = await generateTailoredResumeAction({
        baseResumeId: selectedResumeId || undefined,
        jobId: isCustomJob ? undefined : selectedJobId,
        targetCompany: isCustomJob ? targetCompany.trim() : undefined,
        targetRole: isCustomJob ? targetRole.trim() : undefined,
        customJobDescription: isCustomJob ? customJd.trim() : undefined,
      });

      if (res.success && res.tailoredResumeId) {
        onOpenChange(false);
        toast({
          title: "Tailored Resume Ready",
          description: "Opening the AI Tailored Resume Studio...",
        });
        router.push(`/resumes/tailor/${res.tailoredResumeId}`);
      } else if (res.code === "INSUFFICIENT_CREDITS") {
        onLowCredits(res.requiredCredits ?? 2, res.currentBalance ?? 0);
      } else {
        toast({
          title: "Generation Failed",
          description: res.error || "Could not tailor resume.",
          variant: "destructive",
        });
      }
    } catch (err: unknown) {
      console.error("Tailor resume error:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to generate tailored resume.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <form onSubmit={handleGenerate} className="space-y-4 py-2">
      {resumes.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            Base Resume Profile
          </label>
          <select
            value={selectedResumeId}
            onChange={(e) => setSelectedResumeId(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} {r.isPrimary ? "(Primary)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
          Target Job Posting
        </label>
        <select
          value={selectedJobId}
          onChange={(e) => setSelectedJobId(e.target.value)}
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.position} — {j.company} {j.location ? `(${j.location})` : ""}
            </option>
          ))}
          <option value="custom">+ Custom Role / Paste Job Description</option>
        </select>
      </div>

      {isCustomJob && (
        <div className="space-y-3 p-3.5 rounded-lg border border-border bg-muted/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Company Name</label>
              <Input
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                placeholder="e.g. Stripe"
                className="h-8 text-xs"
                required={isCustomJob}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Target Role</label>
              <Input
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Senior Full Stack Engineer"
                className="h-8 text-xs"
                required={isCustomJob}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Job Description / Key Requirements (Optional)
            </label>
            <Textarea
              value={customJd}
              onChange={(e) => setCustomJd(e.target.value)}
              placeholder="Paste required tech stack or job description text for deeper ATS keyword alignment..."
              className="min-h-[90px] text-xs"
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <Badge
          variant="outline"
          className="text-[11px] gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25"
        >
          <Zap className="h-3 w-3 fill-amber-500 text-amber-500" /> Cost: 2 AI Credits
        </Badge>
      </div>

      <DialogFooter className="gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onOpenChange(false)}
          disabled={isGenerating}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isGenerating} className="gap-1.5">
          {isGenerating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Tailoring Resume...
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" /> Generate Tailored PDF
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function TailorResumeDialog({
  open,
  onOpenChange,
  resumes = [],
  jobs = [],
  defaultResumeId,
  defaultJobId,
  defaultCompany = "",
  defaultRole = "",
}: TailorResumeDialogProps) {
  const [lowCreditState, setLowCreditState] = useState({
    open: false,
    required: 2,
    balance: 0,
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Generate Role-Specific Tailored Resume
            </DialogTitle>
            <DialogDescription className="text-xs">
              AI synthesizes your work history, GitHub proof-of-work projects, and target JD keywords into a clean, single-page printable ATS PDF.
            </DialogDescription>
          </DialogHeader>

          {open && (
            <TailorResumeForm
              key={`${defaultResumeId || "none"}-${defaultJobId || "none"}`}
              onOpenChange={onOpenChange}
              onLowCredits={(required, balance) =>
                setLowCreditState({ open: true, required, balance })
              }
              resumes={resumes}
              jobs={jobs}
              defaultResumeId={defaultResumeId}
              defaultJobId={defaultJobId}
              defaultCompany={defaultCompany}
              defaultRole={defaultRole}
            />
          )}
        </DialogContent>
      </Dialog>

      <LowCreditsModal
        open={lowCreditState.open}
        onOpenChange={(val) => setLowCreditState((prev) => ({ ...prev, open: val }))}
        requiredCredits={lowCreditState.required}
        currentBalance={lowCreditState.balance}
        actionName="AI Role-Specific Resume Tailoring"
      />
    </>
  );
}
