"use client";

import { useState, useTransition, useEffect } from "react";
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
  Send,
  Mail,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  Loader2,
  RefreshCw,
  Building2,
  Briefcase,
  Lightbulb,
  UserCheck,
  CheckCircle2,
  Globe,
  SendHorizontal,
} from "lucide-react";
import {
  generateOutreachPitchAction,
  getConnectedEmailAction,
  sendDirectOutreachEmailAction,
} from "@/app/actions/outreach";
import { OutreachPitchResult } from "@/lib/ai/outreach-generator";
import { useToast } from "@/hooks/use-toast";
import { LowCreditsModal } from "@/components/credits/low-credits-modal";

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

interface OutreachModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId?: string;
  companyName: string;
  roleTitle: string;
  jobDescription?: string;
  recipientEmail?: string;
  initialRecipientName?: string;
}

export function OutreachModal({
  open,
  onOpenChange,
  applicationId,
  companyName,
  roleTitle,
  jobDescription,
  recipientEmail: initialRecipientEmail,
  initialRecipientName,
}: OutreachModalProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<"founder" | "recruiter" | "linkedin">("founder");
  const [recipientName, setRecipientName] = useState(initialRecipientName || "Founder / Hiring Lead");
  const [recipientEmail, setRecipientEmail] = useState(initialRecipientEmail || "");

  const [pitches, setPitches] = useState<OutreachPitchResult | null>(null);
  const [founderSubject, setFounderSubject] = useState("");
  const [founderBody, setFounderBody] = useState("");
  const [recruiterSubject, setRecruiterSubject] = useState("");
  const [recruiterBody, setRecruiterBody] = useState("");
  const [linkedInText, setLinkedInText] = useState("");

  const [copied, setCopied] = useState(false);
  const [lowCreditsOpen, setLowCreditsOpen] = useState(false);

  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [includePortfolio, setIncludePortfolio] = useState(true);
  const [isSendingDirect, setIsSendingDirect] = useState(false);
  const [directSentSuccess, setDirectSentSuccess] = useState(false);

  // Check connected Gmail account when modal opens
  useEffect(() => {
    if (open) {
      setIsCheckingEmail(true);
      setDirectSentSuccess(false);
      getConnectedEmailAction()
        .then((res) => {
          setIsCheckingEmail(false);
          if (res.isConnected && res.email) {
            setConnectedEmail(res.email);
          } else {
            setConnectedEmail(null);
          }
        })
        .catch(() => {
          setIsCheckingEmail(false);
        });
    }
  }, [open]);

  // Generate pitches when modal opens if not generated yet
  useEffect(() => {
    if (open && !pitches) {
      handleGenerate();
    }
  }, [open]);

  const handleGenerate = () => {
    startTransition(async () => {
      const res = await generateOutreachPitchAction({
        applicationId,
        companyName,
        roleTitle,
        jobDescription,
        recipientName: recipientName.trim() || undefined,
      });

      if (res.success && res.pitches) {
        setPitches(res.pitches);
        setFounderSubject(res.pitches.founderPitch.subject);
        setFounderBody(res.pitches.founderPitch.body);
        setRecruiterSubject(res.pitches.hiringManagerPitch.subject);
        setRecruiterBody(res.pitches.hiringManagerPitch.body);
        setLinkedInText(res.pitches.linkedInNote.text);
      } else {
        if (res.error?.toLowerCase().includes("credit") || res.error?.toLowerCase().includes("balance")) {
          setLowCreditsOpen(true);
        } else {
          toast({
            variant: "destructive",
            title: "Generation Failed",
            description: res.error || "Could not generate pitches.",
          });
        }
      }
    });
  };

  const handleCopyCurrent = () => {
    let textToCopy = "";
    if (activeTab === "founder") {
      textToCopy = `Subject: ${founderSubject}\n\n${founderBody}`;
    } else if (activeTab === "recruiter") {
      textToCopy = `Subject: ${recruiterSubject}\n\n${recruiterBody}`;
    } else {
      textToCopy = linkedInText;
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
    }
    setCopied(true);
    toast({
      title: "Outreach Copied",
      description: "Pitch copied to clipboard ready to send.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLaunchEmail = () => {
    const subject = activeTab === "founder" ? founderSubject : recruiterSubject;
    const body = activeTab === "founder" ? founderBody : recruiterBody;
    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail.trim())}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    window.open(mailtoUrl, "_blank");
    toast({
      title: "Opening Email Client",
      description: "Drafting message in your default mail app.",
    });
  };

  const handleSendDirectGmail = async () => {
    if (!recipientEmail || !recipientEmail.trim() || !recipientEmail.includes("@")) {
      toast({
        variant: "destructive",
        title: "Recipient Email Required",
        description: "Please specify a valid recipient email address to send directly via Gmail.",
      });
      return;
    }

    const subject = activeTab === "founder" ? founderSubject : recruiterSubject;
    const body = activeTab === "founder" ? founderBody : recruiterBody;

    setIsSendingDirect(true);
    try {
      const res = await sendDirectOutreachEmailAction({
        applicationId,
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName.trim() || undefined,
        subject,
        body,
        pitchType: activeTab as "founder" | "recruiter",
        includePortfolioLink: includePortfolio,
      });

      if (res.success) {
        setDirectSentSuccess(true);
        toast({
          title: "🚀 Outreach Dispatched Successfully!",
          description: `Sent directly from ${res.sentFrom} to ${recipientEmail.trim()}.${
            res.autoUpdatedStatus
              ? ' Application automatically moved to "APPLIED"!'
              : ""
          }${res.isSimulated ? " (Demo Simulator Mode)" : ""}`,
        });
      } else {
        if (res.error === "NO_GMAIL_CONNECTED") {
          toast({
            variant: "destructive",
            title: "Gmail Not Connected",
            description:
              "Please connect your Gmail account in the Mailbox Sync dialog on the Kanban board to enable 1-click dispatch.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Dispatch Failed",
            description: res.error || "Failed to dispatch email via Gmail API.",
          });
        }
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Dispatch Error",
        description: "An unexpected error occurred while sending the email.",
      });
    } finally {
      setIsSendingDirect(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="pb-2 border-b border-border/50">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <Sparkles size={16} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  Founder &amp; Recruiter Outreach
                  <Badge variant="outline" className="text-[10px] font-semibold py-0 px-1.5 bg-primary/5 text-primary">
                    AI Autopilot
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  High-converting direct pitches for <span className="font-semibold text-foreground">{roleTitle}</span> at <span className="font-semibold text-foreground">{companyName}</span>
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerate}
              disabled={isPending}
              className="text-xs h-8 gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
              title="Regenerate pitches with fresh variations"
            >
              <RefreshCw size={12} className={isPending ? "animate-spin text-primary" : ""} />
              <span className="hidden sm:inline">Regenerate</span>
            </Button>
          </div>
        </DialogHeader>

        {isPending && !pitches ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-xs font-medium text-foreground">
              Analyzing company product &amp; crafting custom pitches...
            </p>
            <p className="text-[11px] text-muted-foreground">
              Matching your top proof-of-work achievements against {companyName}'s engineering needs.
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {/* Format Selector Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-muted/50 rounded-lg border border-border/50 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("founder")}
                className={`py-1.5 px-2 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "founder"
                    ? "bg-card text-foreground shadow-xs border border-border/50 font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Building2 size={13} className="text-primary" />
                <span>Founder Pitch</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("recruiter")}
                className={`py-1.5 px-2 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "recruiter"
                    ? "bg-card text-foreground shadow-xs border border-border/50 font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Briefcase size={13} className="text-blue-500" />
                <span>Tech Lead / InMail</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("linkedin")}
                className={`py-1.5 px-2 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "linkedin"
                    ? "bg-card text-foreground shadow-xs border border-border/50 font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LinkedinIcon className="text-blue-600" />
                <span>LinkedIn Note</span>
              </button>
            </div>

            {/* Recipient Details & Mailbox Connection */}
            {activeTab !== "linkedin" && (
              <div className="space-y-3">
                {/* Mailbox Connection Status Bar */}
                {isCheckingEmail ? (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/40 border border-border/50 text-[11px] text-muted-foreground animate-pulse">
                    <Loader2 size={12} className="animate-spin" />
                    <span>Checking connected Gmail mailbox...</span>
                  </div>
                ) : connectedEmail ? (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-[11px] text-foreground font-medium">
                        Connected Mailbox: <strong className="font-semibold text-emerald-600 dark:text-emerald-400">{connectedEmail}</strong>
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold py-0">
                      1-Click Send Ready
                    </Badge>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                    <div className="flex items-center gap-2 text-[11px]">
                      <Mail size={13} className="shrink-0" />
                      <span>No Gmail inbox connected yet. You can still send via your desktop mail app or connect in Kanban toolbar.</span>
                    </div>
                  </div>
                )}

                {/* Recipient Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <Label htmlFor="pitch-recipient-name" className="text-[11px] font-semibold text-muted-foreground">
                      Recipient Name / Title
                    </Label>
                    <Input
                      id="pitch-recipient-name"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="e.g. Alex (CEO) or Hiring Team"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="pitch-recipient-email" className="text-[11px] font-semibold text-muted-foreground">
                      Recipient Email {connectedEmail ? <span className="text-primary font-bold">(required for 1-click send)</span> : "(optional)"}
                    </Label>
                    <Input
                      id="pitch-recipient-email"
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="e.g. alex@startup.com"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Portfolio Link Inclusion Toggle */}
                <div className="flex items-center justify-between p-2 rounded-md bg-muted/40 border border-border/50 text-xs">
                  <div className="flex items-center gap-2">
                    <Globe size={13} className="text-primary" />
                    <span className="text-[11px] font-medium text-foreground">Attach candidate public portfolio &amp; proof-of-work link</span>
                  </div>
                  <input
                    type="checkbox"
                    id="include-portfolio"
                    checked={includePortfolio}
                    onChange={(e) => setIncludePortfolio(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Content Display: Founder Email Tab */}
            {activeTab === "founder" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="founder-subject" className="text-xs font-semibold">
                    Subject Line
                  </Label>
                  <Input
                    id="founder-subject"
                    value={founderSubject}
                    onChange={(e) => setFounderSubject(e.target.value)}
                    className="text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="founder-body" className="text-xs font-semibold">
                    Email Body
                  </Label>
                  <Textarea
                    id="founder-body"
                    value={founderBody}
                    onChange={(e) => setFounderBody(e.target.value)}
                    rows={8}
                    className="text-xs leading-relaxed font-sans"
                  />
                </div>

                {pitches?.founderPitch.tips && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-[11px] text-muted-foreground">
                    <Lightbulb size={13} className="text-amber-500 shrink-0 mt-0.5" />
                    <span>{pitches.founderPitch.tips}</span>
                  </div>
                )}
              </div>
            )}

            {/* Content Display: Recruiter InMail Tab */}
            {activeTab === "recruiter" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="recruiter-subject" className="text-xs font-semibold">
                    Subject Line
                  </Label>
                  <Input
                    id="recruiter-subject"
                    value={recruiterSubject}
                    onChange={(e) => setRecruiterSubject(e.target.value)}
                    className="text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="recruiter-body" className="text-xs font-semibold">
                    Email / InMail Body
                  </Label>
                  <Textarea
                    id="recruiter-body"
                    value={recruiterBody}
                    onChange={(e) => setRecruiterBody(e.target.value)}
                    rows={8}
                    className="text-xs leading-relaxed font-sans"
                  />
                </div>

                {pitches?.hiringManagerPitch.tips && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-[11px] text-muted-foreground">
                    <Lightbulb size={13} className="text-amber-500 shrink-0 mt-0.5" />
                    <span>{pitches.hiringManagerPitch.tips}</span>
                  </div>
                )}
              </div>
            )}

            {/* Content Display: LinkedIn Note Tab */}
            {activeTab === "linkedin" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <Label htmlFor="linkedin-text" className="font-semibold">
                    Connection Invitation Message
                  </Label>
                  <span
                    className={`font-mono text-[11px] ${
                      linkedInText.length > 295
                        ? "text-destructive font-bold"
                        : linkedInText.length > 270
                        ? "text-amber-500 font-semibold"
                        : "text-muted-foreground"
                    }`}
                  >
                    {linkedInText.length} / 300 characters
                  </span>
                </div>

                <Textarea
                  id="linkedin-text"
                  value={linkedInText}
                  onChange={(e) => setLinkedInText(e.target.value)}
                  rows={4}
                  className="text-xs leading-relaxed"
                />

                {pitches?.linkedInNote.tips && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-[11px] text-muted-foreground">
                    <Lightbulb size={13} className="text-blue-500 shrink-0 mt-0.5" />
                    <span>{pitches.linkedInNote.tips}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="pt-3 border-t border-border/50 gap-2 sm:gap-0">
          <div className="flex items-center justify-between w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8"
            >
              Close
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyCurrent}
                disabled={isPending || !pitches || isSendingDirect}
                className="text-xs h-8 gap-1.5"
              >
                {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy"}
              </Button>

              {activeTab !== "linkedin" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleLaunchEmail}
                    disabled={isPending || !pitches || isSendingDirect}
                    className="text-xs h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                    title="Draft in default email client (mailto:)"
                  >
                    <Mail size={13} />
                    <span className="hidden sm:inline">Mail Client</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSendDirectGmail}
                    disabled={isPending || !pitches || isSendingDirect || !connectedEmail}
                    className={`text-xs h-8 gap-1.5 font-semibold text-white shadow-sm transition-all ${
                      directSentSuccess
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-primary hover:bg-primary/90"
                    }`}
                    title={
                      !connectedEmail
                        ? "Connect Gmail in Kanban toolbar to enable 1-click dispatch"
                        : "Send directly from your verified Gmail address"
                    }
                  >
                    {isSendingDirect ? (
                      <Loader2 size={13} className="animate-spin text-white" />
                    ) : directSentSuccess ? (
                      <CheckCircle2 size={13} className="text-white" />
                    ) : (
                      <SendHorizontal size={13} />
                    )}
                    <span>
                      {isSendingDirect
                        ? "Sending..."
                        : directSentSuccess
                        ? "Dispatched!"
                        : "Send via Connected Gmail"}
                    </span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>

      <LowCreditsModal
        open={lowCreditsOpen}
        onOpenChange={setLowCreditsOpen}
        actionName="Founder Outreach Pitch"
        requiredCredits={3}
      />
    </Dialog>
  );
}
