/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileUploader } from "@/components/dashboard/file-uploader";
import { quickCreateApplicationAction } from "@/app/actions/application";
import {
  FileText,
  Briefcase,
  KanbanSquare,
  MessageSquare,
  ArrowRight,
  Zap,
  AlertCircle,
  Plus,
  Upload,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface PipelineStage {
  label: string;
  status: string;
  count: number;
  color: string;
  percent: number;
}

interface DashboardClientProps {
  userId: string;
  stats: {
    resumesCount: number;
    jobsCount: number;
    activeApplicationsCount: number;
    upcomingInterviewsCount: number;
  };
  recentApplications: any[];
  pipeline: PipelineStage[];
  missingSkills: string[];
  recommendation: {
    title: string;
    description: string;
    actionText: string;
    actionLink: string;
  };
}

export default function DashboardClient({
  userId,
  stats,
  recentApplications,
  pipeline,
  missingSkills,
  recommendation,
}: DashboardClientProps) {
  const router = useRouter();

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAddAppOpen, setIsAddAppOpen] = useState(false);

  // Add application form state
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("APPLIED");
  const [notes, setNotes] = useState("");
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !position.trim()) {
      setAppError("Company and Position are required.");
      return;
    }

    setIsSubmittingApp(true);
    setAppError(null);

    try {
      const res = await quickCreateApplicationAction({
        company,
        position,
        location,
        status,
        notes,
      });

      if (res.success) {
        setIsAddAppOpen(false);
        setCompany("");
        setPosition("");
        setLocation("");
        setStatus("APPLIED");
        setNotes("");
        router.refresh();
      } else {
        setAppError(res.error || "Failed to create application.");
      }
    } catch (err: any) {
      setAppError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmittingApp(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">Here is what&apos;s happening with your job search today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 shadow-sm"
          >
            <Upload size={16} />
            Upload Resume
          </Button>
          <Button
            onClick={() => setIsAddAppOpen(true)}
            className="flex items-center gap-2 shadow-sm"
          >
            <Plus size={16} />
            Add Application
          </Button>
        </div>
      </div>

      {/* Stats Row - Clickable Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/resumes" className="group">
          <Card className="h-full hover:shadow-md hover:border-primary/40 transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                Total Resumes
              </CardTitle>
              <div className="p-2 bg-primary/10 rounded-full text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <FileText size={16} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.resumesCount}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                Manage resumes <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/jobs" className="group">
          <Card className="h-full hover:shadow-md hover:border-blue-500/40 transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                Saved Jobs
              </CardTitle>
              <div className="p-2 bg-blue-500/10 rounded-full text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <Briefcase size={16} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.jobsCount}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                Target opportunities <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/applications" className="group">
          <Card className="h-full hover:shadow-md hover:border-amber-500/40 transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                Active Applications
              </CardTitle>
              <div className="p-2 bg-amber-500/10 rounded-full text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <KanbanSquare size={16} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.activeApplicationsCount}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                In progress on Kanban <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/coach" className="group">
          <Card className="h-full hover:shadow-md hover:border-purple-500/40 transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                Upcoming Interviews
              </CardTitle>
              <div className="p-2 bg-purple-500/10 rounded-full text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                <MessageSquare size={16} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.upcomingInterviewsCount}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                Practice with AI Coach <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-7 lg:grid-cols-3">
        {/* Main Content Area */}
        <div className="md:col-span-4 lg:col-span-2 space-y-6">
          {/* Dynamic AI Recommendation */}
          <Card className="border-primary/20 bg-primary/5 shadow-sm">
            <CardContent className="p-6">
              <div className="flex gap-4 items-start">
                <div className="mt-1 bg-background p-2.5 rounded-xl text-primary shadow-sm shrink-0 border border-primary/10">
                  <Zap size={22} />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{recommendation.title}</h3>
                    <Badge variant="secondary" className="text-[10px] bg-primary/15 text-primary border-0 font-medium">
                      AI INSIGHT
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {recommendation.description}
                  </p>
                  <div className="pt-2">
                    <Link href={recommendation.actionLink}>
                      <Button variant="outline" size="sm" className="bg-background shadow-xs hover:bg-muted/80">
                        {recommendation.actionText}
                        <ArrowRight size={14} className="ml-1.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Applications */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="space-y-1">
                <CardTitle>Recent Applications</CardTitle>
                <CardDescription>Your latest tracked job opportunities</CardDescription>
              </div>
              <Link href="/applications" className="text-sm text-primary hover:underline flex items-center font-medium">
                View all <ArrowRight size={15} className="ml-1" />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentApplications.length === 0 ? (
                  <div className="py-8 text-center rounded-lg border border-dashed border-border/70 p-6">
                    <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
                      <Briefcase size={20} />
                    </div>
                    <p className="text-sm font-medium text-foreground">No applications tracked yet</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      Start tracking opportunities to monitor your interviews, notes, and progress.
                    </p>
                    <div className="mt-4 flex justify-center gap-3">
                      <Button size="sm" onClick={() => setIsAddAppOpen(true)}>
                        <Plus size={14} className="mr-1" />
                        Add Application
                      </Button>
                      <Link href="/jobs">
                        <Button size="sm" variant="outline">
                          Browse Saved Jobs
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  recentApplications.map((app) => (
                    <Link
                      key={app.id}
                      href="/applications"
                      className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:border-primary/30 hover:bg-muted/40 transition-all group"
                    >
                      <div className="flex gap-3 items-center min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/10">
                          {app.job?.company?.charAt(0) || "U"}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                            {app.job?.position || "Position"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {app.job?.company || "Company"} {app.job?.location ? `• ${app.job.location}` : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-semibold">
                          {app.status}
                        </Badge>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(app.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar / Pipeline Column */}
        <div className="md:col-span-3 lg:col-span-1 space-y-6">
          {/* Pipeline Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Pipeline</CardTitle>
                <CardDescription>Live application breakdown</CardDescription>
              </div>
              <Link href="/applications" className="text-xs text-primary hover:underline flex items-center">
                Kanban <ExternalLink size={12} className="ml-1" />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pipeline.map((stage) => (
                  <Link
                    key={stage.status}
                    href="/applications"
                    className="block space-y-1.5 group p-1 -m-1 rounded-md hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                        {stage.label}
                      </span>
                      <span className="font-bold text-foreground">
                        {stage.count} <span className="text-xs text-muted-foreground font-normal">({stage.percent}%)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.max(stage.percent, stage.count > 0 ? 8 : 0)}%` }}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Missing Skills Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Skill Insights</CardTitle>
              <CardDescription>Key skills identified across target roles</CardDescription>
            </CardHeader>
            <CardContent>
              {missingSkills.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  <p>No skill gaps detected yet.</p>
                  <Link href="/jobs" className="mt-2 inline-block">
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                      Analyze a job to detect skills &rarr;
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {missingSkills.map((skill) => (
                      <Link key={skill} href="/improve">
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1.5 px-3 py-1 cursor-pointer hover:bg-primary/10 hover:border-primary/40 transition-colors"
                        >
                          <AlertCircle size={12} className="text-amber-500 shrink-0" />
                          <span>{skill}</span>
                        </Badge>
                      </Link>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Click any skill to optimize your resume bullets in the AI Improver.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload Resume Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Resume</DialogTitle>
            <DialogDescription>
              Upload a PDF resume (up to 10MB). Our AI will analyze your skills and ATS score.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <FileUploader
              userId={userId}
              onUploadComplete={() => {
                setIsUploadOpen(false);
                router.refresh();
              }}
              onCancel={() => setIsUploadOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Application Dialog */}
      <Dialog open={isAddAppOpen} onOpenChange={setIsAddAppOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Track New Application</DialogTitle>
            <DialogDescription>
              Add a company and role to your application tracking board.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateApplication} className="space-y-4 pt-2">
            {appError && (
              <div className="p-3 text-xs bg-destructive/15 text-destructive rounded-md flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{appError}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="company">Company *</Label>
              <Input
                id="company"
                placeholder="e.g. Stripe, Google, Linear"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="position">Position *</Label>
              <Input
                id="position"
                placeholder="e.g. Senior Frontend Engineer"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g. Remote, San Francisco, CA"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Pipeline Stage</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="SAVED">Saved</option>
                <option value="APPLIED">Applied</option>
                <option value="SCREENING">Screening</option>
                <option value="INTERVIEW">Interview</option>
                <option value="OFFER">Offer</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                placeholder="e.g. Applied via referral, follow up next Monday"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddAppOpen(false)}
                disabled={isSubmittingApp}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingApp}>
                {isSubmittingApp ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Tracking...
                  </>
                ) : (
                  "Track Application"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
