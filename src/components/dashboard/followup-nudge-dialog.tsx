"use client";

import { useState, useEffect, useTransition } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Bell,
  Clock,
  SendHorizontal,
  Mail,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Loader2,
  Calendar,
  XCircle,
  Copy,
  Check,
} from "lucide-react";
import {
  getFollowUpNudgesAction,
  generateFollowUpDraftAction,
  sendFollowUpNudgeAction,
  dismissFollowUpAction,
  scheduleFollowUpAction,
  ScheduledFollowUpItem,
} from "@/app/actions/followup";
import { FollowUpNudgeResult } from "@/lib/ai/followup-generator";
import { useToast } from "@/hooks/use-toast";

export function FollowUpNudgeDialog({
  triggerButton,
}: {
  triggerButton?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const [nudges, setNudges] = useState<ScheduledFollowUpItem[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [isLoadingList, setIsLoadingList] = useState(false);

  // Selected item state
  const [selectedNudge, setSelectedNudge] = useState<ScheduledFollowUpItem | null>(null);
  const [drafts, setDrafts] = useState<FollowUpNudgeResult | null>(null);
  const [isDrafting, setIsDrafting] = useState(false);
  const [activeVariation, setActiveVariation] = useState<"A" | "B">("A");
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [copied, setCopied] = useState(false);

  // Load nudges on mount & when dialog opens
  const fetchNudges = () => {
    setIsLoadingList(true);
    getFollowUpNudgesAction()
      .then((res) => {
        setIsLoadingList(false);
        if (res.success) {
          setNudges(res.nudges);
          setOverdueCount(res.overdueCount);
        }
      })
      .catch(() => setIsLoadingList(false));
  };

  useEffect(() => {
    fetchNudges();
  }, []);

  useEffect(() => {
    if (open) {
      fetchNudges();
    } else {
      setSelectedNudge(null);
      setDrafts(null);
    }
  }, [open]);

  const handleSelectNudge = async (nudge: ScheduledFollowUpItem) => {
    setSelectedNudge(nudge);
    setIsDrafting(true);
    setDrafts(null);

    try {
      const res = await generateFollowUpDraftAction({ applicationId: nudge.applicationId });
      setIsDrafting(false);
      if (res.success && res.drafts) {
        setDrafts(res.drafts);
        setCustomSubject(res.drafts.subject);
        setCustomBody(res.drafts.variationA.body);
        setActiveVariation("A");
      } else {
        toast({
          variant: "destructive",
          title: "Drafting Failed",
          description: res.error || "Could not generate follow-up draft.",
        });
      }
    } catch {
      setIsDrafting(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate follow-up draft.",
      });
    }
  };

  const handleSwitchVariation = (v: "A" | "B") => {
    if (!drafts) return;
    setActiveVariation(v);
    setCustomBody(v === "A" ? drafts.variationA.body : drafts.variationB.body);
  };

  const handleSendNudge = () => {
    if (!selectedNudge) return;

    startTransition(async () => {
      const res = await sendFollowUpNudgeAction({
        applicationId: selectedNudge.applicationId,
        recipientEmail: selectedNudge.recipientEmail,
        subject: customSubject,
        body: customBody,
      });

      if (res.success) {
        toast({
          title: "🚀 Follow-Up Dispatched!",
          description: `Sent directly from ${res.sentFrom} to ${selectedNudge.recipientEmail}.${
            res.isSimulated ? " (Demo Simulator Mode)" : ""
          }`,
        });
        fetchNudges();
        setSelectedNudge(null);
        setDrafts(null);
        router.refresh();
      } else {
        if (res.error === "NO_GMAIL_CONNECTED") {
          toast({
            variant: "destructive",
            title: "Gmail Not Connected",
            description: "Please connect your Gmail account in Mailbox Sync to dispatch follow-ups.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Dispatch Failed",
            description: res.error || "Failed to send follow-up via Gmail.",
          });
        }
      }
    });
  };

  const handleReschedule = async (days: number) => {
    if (!selectedNudge) return;
    const res = await scheduleFollowUpAction({
      applicationId: selectedNudge.applicationId,
      dueInDays: days,
      recipientEmail: selectedNudge.recipientEmail,
      recipientName: selectedNudge.recipientName,
      pitchSubject: selectedNudge.lastPitchSubject,
    });

    if (res.success) {
      toast({
        title: "Follow-Up Rescheduled",
        description: `Reminder moved +${days} days into the future.`,
      });
      fetchNudges();
      setSelectedNudge(null);
      setDrafts(null);
    }
  };

  const handleDismiss = async () => {
    if (!selectedNudge) return;
    const res = await dismissFollowUpAction({ applicationId: selectedNudge.applicationId });
    if (res.success) {
      toast({
        title: "Follow-Up Dismissed",
        description: "No further follow-up reminders will be sent for this role.",
      });
      fetchNudges();
      setSelectedNudge(null);
      setDrafts(null);
    }
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(`Subject: ${customSubject}\n\n${customBody}`);
    setCopied(true);
    toast({
      title: "Copied to Clipboard",
      description: "Follow-up pitch ready to paste into any email client.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {triggerButton ? (
        <div onClick={() => setOpen(true)} className="inline-block cursor-pointer">
          {triggerButton}
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="text-xs h-9 gap-1.5 border-border/80 shadow-xs cursor-pointer relative"
        >
          <Bell size={13} className={overdueCount > 0 ? "text-destructive animate-bounce" : "text-amber-500"} />
          <span>Follow-Up Nudges</span>
          {nudges.length > 0 && (
            <Badge
              variant={overdueCount > 0 ? "destructive" : "secondary"}
              className="text-[10px] h-4.5 px-1.5 ml-0.5 rounded-full"
            >
              {overdueCount > 0 ? `${overdueCount} Due` : nudges.length}
            </Badge>
          )}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                <Clock size={16} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  Outreach Follow-Up &amp; Nudge Scheduler
                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30 py-0 font-semibold">
                    70%+ Response Booster
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Track sent pitches and draft respectful follow-up nudges to capture busy founder attention.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedNudge ? (
            /* Follow-Up Editor View */
            <div className="space-y-4 py-1">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50 text-xs">
                <div>
                  <div className="font-bold text-foreground text-sm">
                    {selectedNudge.position} • {selectedNudge.company}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    To: {selectedNudge.recipientName} ({selectedNudge.recipientEmail}) • Follow-Up #{selectedNudge.followUpCount + 1}
                  </div>
                </div>

                <Badge
                  variant={selectedNudge.status === "OVERDUE" ? "destructive" : "secondary"}
                  className="text-[10px] font-semibold"
                >
                  {selectedNudge.status === "OVERDUE" ? "Follow-Up Overdue" : "Scheduled"}
                </Badge>
              </div>

              {isDrafting ? (
                <div className="py-12 text-center space-y-2">
                  <Loader2 className="h-7 w-7 animate-spin text-primary mx-auto" />
                  <p className="text-xs font-semibold text-foreground">
                    Drafting personalized follow-up nudge...
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Analyzing previous outreach context and tailoring a high-converting response.
                  </p>
                </div>
              ) : drafts ? (
                <div className="space-y-3">
                  {/* Variation Switcher */}
                  <div className="grid grid-cols-2 gap-1 p-1 bg-muted/50 rounded-lg border border-border/50 text-xs">
                    <button
                      type="button"
                      onClick={() => handleSwitchVariation("A")}
                      className={`py-1 px-2 rounded-md font-medium transition-all text-center ${
                        activeVariation === "A"
                          ? "bg-card text-foreground shadow-xs font-bold border border-border/50"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {drafts.variationA.label}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchVariation("B")}
                      className={`py-1 px-2 rounded-md font-medium transition-all text-center ${
                        activeVariation === "B"
                          ? "bg-card text-foreground shadow-xs font-bold border border-border/50"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {drafts.variationB.label}
                    </button>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="nudge-subject" className="text-xs font-semibold">
                      Subject Line
                    </Label>
                    <Input
                      id="nudge-subject"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      className="h-8 text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="nudge-body" className="text-xs font-semibold">
                      Message Body
                    </Label>
                    <Textarea
                      id="nudge-body"
                      value={customBody}
                      onChange={(e) => setCustomBody(e.target.value)}
                      rows={6}
                      className="text-xs leading-relaxed font-sans"
                    />
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleReschedule(3)}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                  >
                    +3 Days
                  </button>
                  <span className="text-muted-foreground">•</span>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="text-[11px] text-muted-foreground hover:text-destructive underline cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    disabled={isPending || isDrafting}
                    className="text-xs h-8 gap-1.5"
                  >
                    {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSendNudge}
                    disabled={isPending || isDrafting}
                    className="text-xs h-8 gap-1.5 shadow-sm font-semibold"
                  >
                    {isPending ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <SendHorizontal size={13} />
                    )}
                    <span>Send via Connected Gmail</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Nudges List View */
            <div className="space-y-4 py-2">
              {isLoadingList ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                  <span>Loading scheduled follow-up reminders...</span>
                </div>
              ) : nudges.length === 0 ? (
                <div className="py-12 text-center space-y-2 border border-dashed border-border/60 rounded-xl p-6">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                  <h4 className="font-bold text-sm text-foreground">Inboxes Up to Date!</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    You have no pending or overdue outreach follow-ups. When you send pitches from the Kanban board, follow-ups are automatically scheduled.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Pending Follow-Up Reminders ({nudges.length})
                  </span>

                  {nudges.map((nudge) => (
                    <div
                      key={nudge.applicationId}
                      className="p-3 rounded-lg border border-border/60 hover:border-primary/40 bg-card/60 transition-all flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-xs truncate">
                            {nudge.position}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground truncate">{nudge.company}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          To: {nudge.recipientEmail} • Due: {new Date(nudge.followUpDueAt).toLocaleDateString()}
                          {nudge.status === "OVERDUE" && (
                            <span className="text-destructive font-semibold ml-1.5">
                              ({nudge.daysOverdue === 0 ? "Today" : `${nudge.daysOverdue}d overdue`})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleSelectNudge(nudge)}
                          className="text-xs h-7 gap-1 shadow-xs font-semibold"
                        >
                          <Sparkles size={11} />
                          <span>Draft Nudge</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-border/40">
            {selectedNudge ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedNudge(null);
                  setDrafts(null);
                }}
                className="text-xs h-8"
              >
                Back to Reminders List
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                className="text-xs h-8"
              >
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
