"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Building,
  MapPin,
  Calendar,
  Play,
  FileText,
  Send,
  Sparkles,
  ExternalLink,
  Save,
  Plus,
  Loader2,
  Trash2,
  Mail,
  Mic,
  CheckCircle2,
  TrendingUp,
  MessageSquare,
  Target,
  Briefcase,
} from "lucide-react";
import { OutreachModal } from "@/components/dashboard/outreach-modal";
import {
  updateApplicationStatusAction,
  updateApplicationDetailsAction,
  addApplicationNoteAction,
  deleteApplicationAction,
} from "@/app/actions/application";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/format-date";

interface JobMatchSummary {
  id: string;
  resumeId: string;
  jobId: string;
  overallScore: number;
  skillsScore: number;
  experienceScore: number;
  keywordsScore: number;
}

interface ApplicationEventItem {
  id: string;
  type: string;
  description: string | null;
  date: string | Date;
  createdAt: string | Date;
}

interface SyncedEmailItem {
  id: string;
  sender: string;
  subject: string;
  company: string | null;
  role: string | null;
  detectedStage: string | null;
  actionTaken: string;
  receivedAt: string | Date;
}

export interface ApplicationDetailData {
  id: string;
  status: string;
  notes: string | null;
  resumeId: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  job: {
    id: string;
    company: string;
    position: string;
    description: string;
    url: string | null;
    location: string | null;
    employmentType: string | null;
    salaryRange: string | null;
    startupStage: string | null;
    jobMatches: JobMatchSummary[];
  };
  resume: {
    id: string;
    name: string;
    resumeType: string | null;
  } | null;
  events: ApplicationEventItem[];
  syncedEmails: SyncedEmailItem[];
}

export interface UserResumeOption {
  id: string;
  name: string;
  isPrimary: boolean;
  resumeType: string | null;
}

const PIPELINE_STATUSES = [
  { value: "SAVED", label: "Saved", badgeClass: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30" },
  { value: "APPLIED", label: "Applied", badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  { value: "SCREENING", label: "Screening", badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  { value: "INTERVIEW", label: "Interview", badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30" },
  { value: "OFFER", label: "Offer", badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  { value: "REJECTED", label: "Rejected", badgeClass: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30" },
];

function getEventBadgeInfo(type: string) {
  switch (type) {
    case "MOCK_INTERVIEW_PRACTICE":
      return { icon: Mic, color: "bg-indigo-500 text-white", label: "Mock Interview" };
    case "EMAIL_RECEIVED":
    case "GMAIL_SYNC":
      return { icon: Mail, color: "bg-emerald-500 text-white", label: "Recruiter Email" };
    case "OUTREACH_GENERATED":
      return { icon: Send, color: "bg-blue-500 text-white", label: "Outreach Pitch" };
    case "STATUS_CHANGE":
      return { icon: TrendingUp, color: "bg-purple-500 text-white", label: "Stage Update" };
    case "NOTE_ADDED":
      return { icon: MessageSquare, color: "bg-amber-500 text-white", label: "Note" };
    default:
      return { icon: CheckCircle2, color: "bg-primary text-primary-foreground", label: "Milestone" };
  }
}

export function ApplicationDetailClient({
  application: initialApplication,
  userResumes,
}: {
  application: ApplicationDetailData;
  userResumes: UserResumeOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [status, setStatus] = useState(initialApplication.status || "SAVED");
  const [notes, setNotes] = useState(initialApplication.notes || "");
  const [resumeId, setResumeId] = useState(initialApplication.resumeId || "");
  const [events, setEvents] = useState<ApplicationEventItem[]>(initialApplication.events || []);

  const [newTimelineNote, setNewTimelineNote] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingResume, setIsUpdatingResume] = useState(false);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [outreachOpen, setOutreachOpen] = useState(false);

  const statusMeta = PIPELINE_STATUSES.find((s) => s.value === status) || PIPELINE_STATUSES[0];

  // Resolve active resume and best match score
  const effectiveResumeId = resumeId || userResumes[0]?.id || "";
  const activeMatch =
    initialApplication.job.jobMatches.find((m) => m.resumeId === effectiveResumeId) ||
    initialApplication.job.jobMatches[0] ||
    null;

  const handleStatusChange = async (nextStatus: string) => {
    if (nextStatus === status) return;
    const prev = status;
    setStatus(nextStatus);
    setIsUpdatingStatus(true);

    const res = await updateApplicationStatusAction(initialApplication.id, nextStatus);
    if (res.success) {
      if (res.event) {
        setEvents((curr) => [res.event as ApplicationEventItem, ...curr]);
      }
      toast({
        title: "Pipeline Stage Updated",
        description: `Moved ${initialApplication.job.company} to ${nextStatus}.`,
      });
      router.refresh();
    } else {
      setStatus(prev);
      toast({
        title: "Update Failed",
        description: res.error || "Could not update status.",
        variant: "destructive",
      });
    }
    setIsUpdatingStatus(false);
  };

  const handleResumeChange = async (nextResumeId: string) => {
    setResumeId(nextResumeId);
    setIsUpdatingResume(true);
    const res = await updateApplicationDetailsAction(initialApplication.id, {
      resumeId: nextResumeId || null,
    });
    if (res.success) {
      toast({
        title: "Attached Resume Updated",
        description: "Application resume association saved.",
      });
      router.refresh();
    } else {
      toast({
        title: "Update Failed",
        description: res.error || "Could not update attached resume.",
        variant: "destructive",
      });
    }
    setIsUpdatingResume(false);
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    const res = await updateApplicationDetailsAction(initialApplication.id, {
      notes,
    });
    if (res.success) {
      toast({
        title: "Notes Saved",
        description: "Your application notes have been updated.",
      });
      router.refresh();
    } else {
      toast({
        title: "Save Failed",
        description: res.error || "Failed to save notes.",
        variant: "destructive",
      });
    }
    setIsSavingNotes(false);
  };

  const handleAddTimelineEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTimelineNote.trim()) return;
    setIsAddingEvent(true);
    const res = await addApplicationNoteAction(initialApplication.id, newTimelineNote);
    if (res.success && res.event) {
      setEvents((curr) => [res.event as ApplicationEventItem, ...curr]);
      setNewTimelineNote("");
      toast({
        title: "Timeline Updated",
        description: "Added note to your application timeline.",
      });
      router.refresh();
    } else {
      toast({
        title: "Failed",
        description: res.error || "Could not add timeline note.",
        variant: "destructive",
      });
    }
    setIsAddingEvent(false);
  };

  const handleDeleteApplication = async () => {
    setIsDeleting(true);
    const res = await deleteApplicationAction(initialApplication.id);
    if (res.success) {
      toast({
        title: "Application Removed",
        description: `${initialApplication.job.position} @ ${initialApplication.job.company} removed from pipeline.`,
      });
      router.push("/applications");
      router.refresh();
    } else {
      setIsDeleting(false);
      toast({
        title: "Delete Failed",
        description: res.error || "Could not delete application.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <Link href="/applications">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight">{initialApplication.job.position}</h1>
              <Badge variant="outline" className={statusMeta.badgeClass}>
                {statusMeta.label}
              </Badge>
              {initialApplication.job.startupStage && (
                <Badge variant="secondary" className="text-[11px]">
                  {initialApplication.job.startupStage}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center text-sm text-muted-foreground mt-1 gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Building size={14} className="text-primary" /> {initialApplication.job.company}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={14} /> {initialApplication.job.location || "Remote / Flexible"}
              </span>
              {initialApplication.job.salaryRange && (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-xs">
                  <Briefcase size={13} /> {initialApplication.job.salaryRange}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={isUpdatingStatus}
              className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Application pipeline stage"
            >
              {PIPELINE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  Stage: {s.label}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={() => setOutreachOpen(true)}
            className="gap-1.5 shadow-sm bg-primary text-primary-foreground text-xs h-9 px-3.5"
          >
            <Sparkles size={14} /> Pitch Founder / Lead
          </Button>

          {!confirmDelete ? (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setConfirmDelete(true)}
              className="h-9 w-9 text-muted-foreground hover:text-destructive hover:border-destructive/40"
              title="Remove application from tracker"
            >
              <Trash2 size={15} />
            </Button>
          ) : (
            <div className="flex items-center gap-1 bg-destructive/10 border border-destructive/30 rounded-md px-2 py-1">
              <span className="text-[11px] font-semibold text-destructive">Delete?</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteApplication}
                disabled={isDeleting}
                className="h-6 px-2 text-[11px]"
              >
                {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(false)}
                className="h-6 px-2 text-[11px]"
              >
                No
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Application Details & Notes Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Application Workspace</CardTitle>
              <CardDescription className="text-xs">
                Manage the resume attached to this role, external posting links, and interview prep notes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Tracked Since
                  </p>
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Calendar size={14} className="text-muted-foreground" />
                    {formatDate(initialApplication.createdAt)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Attached Resume
                  </p>
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-primary shrink-0" />
                    <select
                      value={resumeId}
                      onChange={(e) => handleResumeChange(e.target.value)}
                      disabled={isUpdatingResume}
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">-- Select resume for this job --</option>
                      {userResumes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} {r.isPrimary ? "(Primary)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {initialApplication.job.url && (
                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Job Posting URL
                    </p>
                    <a
                      href={initialApplication.job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1.5 break-all"
                    >
                      {initialApplication.job.url} <ExternalLink size={13} className="shrink-0" />
                    </a>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Personal Notes & Interview Reminders
                  </label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    className="h-7 px-2.5 text-xs gap-1.5"
                  >
                    {isSavingNotes ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                    Save Notes
                  </Button>
                </div>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Write referral names, recruiter feedback, salary expectations, or technical interview topics..."
                  className="min-h-[110px] text-sm leading-relaxed"
                />
              </div>
            </CardContent>
          </Card>

          {/* AI Match Analysis Card */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3 border-b border-border/50 bg-primary/5">
              <div className="flex justify-between items-center gap-2">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" /> AI Resume Match Compatibility
                </CardTitle>
                {activeMatch ? (
                  <Badge
                    className={
                      activeMatch.overallScore >= 85
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                        : activeMatch.overallScore >= 70
                        ? "bg-primary text-primary-foreground"
                        : "bg-amber-500 hover:bg-amber-600 text-white"
                    }
                  >
                    {activeMatch.overallScore}% Match
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    Not Scored Yet
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {activeMatch ? (
                <>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                      <p className="text-[11px] text-muted-foreground uppercase font-semibold">Skills Fit</p>
                      <p className="text-lg font-bold text-foreground mt-0.5">{activeMatch.skillsScore}%</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                      <p className="text-[11px] text-muted-foreground uppercase font-semibold">Experience</p>
                      <p className="text-lg font-bold text-foreground mt-0.5">{activeMatch.experienceScore}%</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                      <p className="text-[11px] text-muted-foreground uppercase font-semibold">ATS Keywords</p>
                      <p className="text-lg font-bold text-foreground mt-0.5">{activeMatch.keywordsScore}%</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center pt-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Explore missing skills, ATS keywords, and bullet-point tailoring tips for this role.
                    </p>
                    <Link href={`/match/${activeMatch.resumeId}/${initialApplication.job.id}`}>
                      <Button variant="outline" size="sm" className="shrink-0 gap-1.5 text-xs">
                        View Full Match Report <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <p className="text-sm text-muted-foreground">
                    {effectiveResumeId
                      ? "Run our live ATS compatibility engine to see your exact skills match, missing keywords, and improvement plan."
                      : "Upload a resume first to score your fit against this job description."}
                  </p>
                  {effectiveResumeId ? (
                    <Link href={`/match/${effectiveResumeId}/${initialApplication.job.id}`}>
                      <Button size="sm" className="shrink-0 gap-1.5 text-xs">
                        <Sparkles className="h-3.5 w-3.5" /> Run Live Match Analysis
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/resumes">
                      <Button variant="outline" size="sm" className="shrink-0 text-xs">
                        Upload Resume
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Direct Founder & Recruiter Outreach Card */}
          <Card className="border-primary/25 bg-gradient-to-r from-primary/5 via-card to-background shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <Send size={14} />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">Direct Founder &amp; Recruiter Outreach</CardTitle>
                    <CardDescription className="text-xs">
                      Bypass ATS queues with tailored cold emails &amp; LinkedIn InMail drafts grounded in your projects.
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                  Autopilot
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Generate 3 custom pitches (Founder Cold Email, Tech Lead InMail, and a concise LinkedIn Note) tailored for {initialApplication.job.company}.
              </p>
              <Button
                size="sm"
                onClick={() => setOutreachOpen(true)}
                className="gap-1.5 shrink-0 text-xs shadow-xs"
              >
                <Sparkles size={13} />
                Draft Outreach
              </Button>
            </CardContent>
          </Card>

          {/* Synced Recruiter Emails Card (when present from Gmail Sync) */}
          {initialApplication.syncedEmails.length > 0 && (
            <Card className="border-emerald-500/20">
              <CardHeader className="pb-3 bg-emerald-500/5 border-b border-emerald-500/15">
                <CardTitle className="text-base flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <Mail className="h-4 w-4" /> Synced Recruiter Emails ({initialApplication.syncedEmails.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {initialApplication.syncedEmails.map((email) => (
                  <div key={email.id} className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground">{email.subject}</span>
                      {email.detectedStage && (
                        <Badge variant="outline" className="text-[10px]">
                          Stage: {email.detectedStage}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      From: {email.sender} • {formatDate(email.receivedAt)}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                      {email.role && <span>Role: {email.role}</span>}
                      <span>Action: {email.actionTaken}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* AI Interview Coach Prompt */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 overflow-hidden relative">
            <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-5 items-center">
                <div className="h-14 w-14 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
                  <Play className="h-6 w-6 text-blue-600 dark:text-blue-400 fill-current ml-0.5" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="font-semibold text-base sm:text-lg text-blue-900 dark:text-blue-100">
                    Prepare for your {initialApplication.job.company} interview
                  </h3>
                  <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 mt-1 mb-4 leading-relaxed">
                    Launch an interactive voice mock interview customized specifically to this{" "}
                    <strong>{initialApplication.job.position}</strong> description and log your score directly here.
                  </p>
                  <Link
                    href={`/coach?role=${encodeURIComponent(initialApplication.job.position)}&jobId=${initialApplication.job.id}`}
                  >
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs sm:text-sm">
                      Start AI Mock Interview
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Timeline */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Activity Timeline</CardTitle>
              <CardDescription className="text-xs">
                Automatic stage updates, Gmail detections, mock interviews &amp; custom milestones.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Quick Add Timeline Note */}
              <form onSubmit={handleAddTimelineEvent} className="flex gap-2">
                <Input
                  value={newTimelineNote}
                  onChange={(e) => setNewTimelineNote(e.target.value)}
                  placeholder="Log an update (e.g. Chatted with CTO)..."
                  className="h-8 text-xs"
                  disabled={isAddingEvent}
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  disabled={isAddingEvent || !newTimelineNote.trim()}
                  className="h-8 px-2.5 shrink-0"
                  title="Add timeline entry"
                >
                  {isAddingEvent ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                </Button>
              </form>

              <Separator />

              {events.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4 italic">
                  No timeline events recorded yet.
                </p>
              ) : (
                <div className="relative border-l border-border ml-3 space-y-5 pt-1">
                  {events.map((item, i) => {
                    const meta = getEventBadgeInfo(item.type);
                    const Icon = meta.icon;
                    return (
                      <div key={item.id} className="relative pl-6">
                        <div
                          className={`absolute -left-3 mt-0.5 h-6 w-6 rounded-full flex items-center justify-center ring-4 ring-background ${meta.color}`}
                        >
                          <Icon className="h-3 w-3" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              {meta.label}
                            </span>
                            <span className="text-[11px] text-muted-foreground" suppressHydrationWarning>
                              {formatDate(item.date || item.createdAt)}
                            </span>
                          </div>
                          <p
                            className={`text-xs sm:text-sm leading-relaxed ${
                              i === 0 ? "font-medium text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {item.description || item.type}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <OutreachModal
        open={outreachOpen}
        onOpenChange={setOutreachOpen}
        applicationId={initialApplication.id}
        companyName={initialApplication.job.company}
        roleTitle={initialApplication.job.position}
      />
    </div>
  );
}
