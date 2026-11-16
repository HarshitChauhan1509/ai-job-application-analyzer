"use client";

import { useState, useTransition } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Paperclip,
  Sparkles,
  ClipboardPaste,
  Building2,
  Briefcase,
  CheckCircle2,
  ArrowRight,
  Loader2,
  FileText,
  Send,
  MapPin,
  Flame,
  Layers,
} from "lucide-react";
import { clipAndImportJobAction, ClipJobResult } from "@/app/actions/job-clipper";
import { useToast } from "@/hooks/use-toast";
import { OutreachModal } from "./outreach-modal";

const SAMPLE_JOB_PRESETS = [
  {
    name: "Linear • Frontend Engineer",
    text: `Linear is looking for a Senior Frontend Engineer to build world-class, ultra-fast web interfaces.
Requirements:
- 4+ years of deep experience with React, TypeScript, and modern CSS/Tailwind.
- Strong intuition for micro-interactions, keyboard navigation, and optimistic UI updates.
- Experience with WebSockets, state management, and offline-first client architecture.
- Location: Remote (US, Europe). Full-time.`,
  },
  {
    name: "Supabase • Full Stack Engineer",
    text: `Supabase is the open source Firebase alternative. We are hiring a Full Stack Engineer to scale our Cloud Dashboard and developer platform.
Requirements:
- Proficiency with TypeScript, Next.js, PostgreSQL, Node.js, and Docker.
- Experience building REST and GraphQL APIs.
- Passion for open source and developer tooling.
- Location: Remote Worldwide. Full-time.`,
  },
  {
    name: "Anthropic • Systems Engineer",
    text: `Anthropic is an AI safety and research company building reliable, steerable AI systems like Claude.
Requirements:
- Strong software engineering background in Python, Go, or Rust.
- Distributed systems, cloud infrastructure (AWS/GCP), and high-throughput data pipelines.
- Familiarity with LLM evaluation frameworks and container orchestration (Kubernetes).
- Location: San Francisco, CA or Remote. Full-time.`,
  },
];

export function QuickJobClipDialog({
  triggerButton,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  triggerButton?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (setControlledOpen) setControlledOpen(val);
    else setInternalOpen(val);
  };

  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  // Form states
  const [rawText, setRawText] = useState("");
  const [url, setUrl] = useState("");
  const [targetStage, setTargetStage] = useState<"SAVED" | "APPLIED">("SAVED");
  const [customCompany, setCustomCompany] = useState("");
  const [customPosition, setCustomPosition] = useState("");

  // Result state
  const [clippedResult, setClippedResult] = useState<ClipJobResult | null>(null);

  // Outreach modal launcher state
  const [outreachOpen, setOutreachOpen] = useState(false);

  const handlePasteClipboard = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setRawText(text);
          toast({
            title: "Pasted from Clipboard",
            description: "Job description text pasted into the importer.",
          });
        }
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Clipboard Access Blocked",
        description: "Please paste your job text manually using Ctrl+V / Cmd+V.",
      });
    }
  };

  const handleClipJob = () => {
    if (!rawText.trim() || rawText.trim().length < 30) {
      toast({
        variant: "destructive",
        title: "Job Description Required",
        description: "Please enter or paste at least 30 characters of job text.",
      });
      return;
    }

    startTransition(async () => {
      const res = await clipAndImportJobAction({
        rawText,
        url: url.trim() || undefined,
        targetStage,
        customCompany: customCompany.trim() || undefined,
        customPosition: customPosition.trim() || undefined,
      });

      if (res.success) {
        setClippedResult(res);
        toast({
          title: "🎉 Job Clipped to Pipeline!",
          description: `Added "${res.position}" at ${res.company} to your ${targetStage} column.`,
        });
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Clipping Failed",
          description: res.error || "Could not parse and clip job.",
        });
      }
    });
  };

  const handleReset = () => {
    setClippedResult(null);
    setRawText("");
    setUrl("");
    setCustomCompany("");
    setCustomPosition("");
    setTargetStage("SAVED");
  };

  return (
    <>
      {triggerButton === null ? null : triggerButton ? (
        <div onClick={() => setOpen(true)} className="inline-block cursor-pointer">
          {triggerButton}
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="text-xs h-9 gap-1.5 border-primary/30 hover:border-primary/60 text-foreground shadow-xs cursor-pointer"
        >
          <Paperclip size={13} className="text-primary" />
          <span>Clip Job</span>
        </Button>
      )}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) handleReset();
        }}
      >
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <Sparkles size={16} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  1-Click Job Description Clipper
                  <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary py-0">
                    Smart Importer
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Paste any job posting from LinkedIn, Indeed, Ashby, or Greenhouse to extract skills, calculate ATS match, and add to Kanban.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {clippedResult ? (
            /* Post-Import Hub View */
            <div className="space-y-5 py-2">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/30">
                      {clippedResult.company?.charAt(0) || "J"}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">
                        {clippedResult.position}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {clippedResult.company} • {clippedResult.location || "Remote"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      ATS Match
                    </span>
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                      {clippedResult.matchScore}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 text-xs">
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                    <CheckCircle2 size={11} className="mr-1 inline" /> Added to {targetStage} Column
                  </Badge>
                  {clippedResult.employmentType && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      {clippedResult.employmentType}
                    </Badge>
                  )}
                </div>

                {clippedResult.requiredSkills && clippedResult.requiredSkills.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Extracted Core Skills:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {clippedResult.requiredSkills.slice(0, 6).map((skill) => (
                        <span
                          key={skill}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-background border border-border/60 text-foreground font-mono"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Instant Next Steps */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Next High-Impact Steps
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <Button
                    variant="outline"
                    className="h-auto py-2.5 px-3 flex items-center justify-between border-border/60 hover:border-primary/40 text-left"
                    onClick={() => {
                      setOpen(false);
                      setOutreachOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Send size={14} className="text-blue-500 shrink-0" />
                      <div>
                        <div className="font-semibold text-foreground">Draft Outreach Pitch</div>
                        <div className="text-[10px] text-muted-foreground">Founder &amp; Recruiter emails</div>
                      </div>
                    </div>
                    <ArrowRight size={13} className="text-muted-foreground" />
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto py-2.5 px-3 flex items-center justify-between border-border/60 hover:border-primary/40 text-left"
                    onClick={() => {
                      setOpen(false);
                      router.push(`/applications/${clippedResult.applicationId}`);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Layers size={14} className="text-primary shrink-0" />
                      <div>
                        <div className="font-semibold text-foreground">Open Application</div>
                        <div className="text-[10px] text-muted-foreground">Manage notes &amp; stages</div>
                      </div>
                    </div>
                    <ArrowRight size={13} className="text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Input View */
            <div className="space-y-4 pt-1">
              {/* Presets & Clipboard Toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-muted-foreground font-medium">Test Presets:</span>
                  {SAMPLE_JOB_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setRawText(preset.text)}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted/60 hover:bg-primary/10 hover:text-primary transition-colors border border-border/50 cursor-pointer"
                    >
                      {preset.name.split("•")[0].trim()}
                    </button>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePasteClipboard}
                  className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground shrink-0"
                >
                  <ClipboardPaste size={12} />
                  <span>Paste Clipboard</span>
                </Button>
              </div>

              {/* Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <Label htmlFor="job-raw-text" className="font-semibold">
                    Job Description Content
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    {rawText.length} characters
                  </span>
                </div>
                <Textarea
                  id="job-raw-text"
                  placeholder="Paste the full job posting, requirements, responsibilities, or LinkedIn / Indeed description here..."
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={7}
                  className="text-xs leading-relaxed font-sans"
                />
              </div>

              {/* Pipeline Target Column */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Target Kanban Stage</Label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setTargetStage("SAVED")}
                    className={`py-2 px-3 rounded-lg border font-medium transition-all text-left flex items-center justify-between ${
                      targetStage === "SAVED"
                        ? "bg-primary/10 border-primary text-foreground shadow-xs font-semibold"
                        : "bg-muted/30 border-border/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>Bookmark in Saved</span>
                    <Badge variant="outline" className="text-[10px] py-0">SAVED</Badge>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetStage("APPLIED")}
                    className={`py-2 px-3 rounded-lg border font-medium transition-all text-left flex items-center justify-between ${
                      targetStage === "APPLIED"
                        ? "bg-primary/10 border-primary text-foreground shadow-xs font-semibold"
                        : "bg-muted/30 border-border/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>Already Applied</span>
                    <Badge variant="outline" className="text-[10px] py-0">APPLIED</Badge>
                  </button>
                </div>
              </div>

              {/* Optional Job URL */}
              <div className="space-y-1">
                <Label htmlFor="job-url" className="text-[11px] font-semibold text-muted-foreground">
                  Job Posting URL (optional)
                </Label>
                <Input
                  id="job-url"
                  placeholder="https://jobs.lever.co/company/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-border/50 gap-2 sm:gap-0">
            {clippedResult ? (
              <div className="flex items-center justify-between w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="text-xs h-8"
                >
                  Clip Another Role
                </Button>
                <Button
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="text-xs h-8 shadow-xs"
                >
                  Done
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>

                <Button
                  size="sm"
                  onClick={handleClipJob}
                  disabled={isPending || !rawText.trim()}
                  className="text-xs h-8 gap-1.5 shadow-sm font-semibold"
                >
                  {isPending ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Sparkles size={13} />
                  )}
                  <span>{isPending ? "Analyzing & Clipping..." : "Clip to Kanban"}</span>
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Embedded Outreach Modal for Instant Cold Pitches */}
      {clippedResult && (
        <OutreachModal
          open={outreachOpen}
          onOpenChange={setOutreachOpen}
          applicationId={clippedResult.applicationId}
          companyName={clippedResult.company || "Startup"}
          roleTitle={clippedResult.position || "Software Engineer"}
          jobDescription={rawText}
        />
      )}
    </>
  );
}
