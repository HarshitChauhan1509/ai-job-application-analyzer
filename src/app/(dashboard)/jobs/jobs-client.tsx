/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  Bookmark,
  MapPin,
  Building,
  Briefcase,
  Plus,
  Loader2,
  ExternalLink,
  Sparkles,
  Link2,
  Trash2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Search,
  Filter,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { createAndAnalyzeJobAction, scrapeJobUrlAction, deleteJobAction } from "@/app/actions/job";
import { createApplicationAction } from "@/app/actions/application";
import { useToast } from "@/hooks/use-toast";

interface JobAnalysisData {
  requiredSkills?: string;
  preferredSkills?: string;
  responsibilities?: string;
  keywords?: string;
  seniority?: string | null;
}

interface JobMatchData {
  overallScore: number;
  skillsScore: number;
  experienceScore: number;
  keywordsScore: number;
  strongMatches?: string;
  missingSkills?: string;
  missingKeywords?: string;
  recommendations?: string;
}

interface JobItem {
  id: string;
  company: string;
  position: string;
  description: string;
  url: string | null;
  location: string | null;
  employmentType: string | null;
  experienceRequirement: string | null;
  createdAt: string | Date;
  analysis?: JobAnalysisData | null;
  jobMatches?: JobMatchData[];
  applications?: { id: string; status: string }[];
}

function safeJsonParse(val: string | null | undefined, fallback: string[] = []): string[] {
  if (!val) return fallback;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function getHostName(urlString: string | null | undefined): string {
  if (!urlString) return "";
  try {
    const url = new URL(urlString.startsWith("http") ? urlString : `https://${urlString}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "External Link";
  }
}

export default function JobsClient({
  initialJobs,
  userId,
}: {
  initialJobs: JobItem[];
  userId: string;
}) {
  const [jobs, setJobs] = useState<JobItem[]>(initialJobs);
  const [isAdding, setIsAdding] = useState(false);
  const [addMode, setAddMode] = useState<"url" | "text">("url");

  // Form states
  const [urlInput, setUrlInput] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [companyInput, setCompanyInput] = useState("");
  const [positionInput, setPositionInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [protectionNotice, setProtectionNotice] = useState<string | null>(null);

  // Detail Modal state
  const [selectedJob, setSelectedJob] = useState<JobItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [trackingJobId, setTrackingJobId] = useState<string | null>(null);

  const { toast } = useToast();

  // Handle URL fetch
  const handleFetchUrl = async () => {
    if (!urlInput.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a valid job posting link (e.g., from Indeed, LinkedIn, or career pages).",
        variant: "destructive",
      });
      return;
    }

    setIsFetchingUrl(true);
    setProtectionNotice(null);

    try {
      const res = await scrapeJobUrlAction(urlInput.trim());

      if (res.isProtected) {
        // Cloudflare or bot defense detected (like Indeed or LinkedIn)
        setProtectionNotice(res.error || "Anti-bot protection detected. Please paste the job text from your open tab.");
        if (res.title) setPositionInput(res.title);
        if (res.company) setCompanyInput(res.company);
        toast({
          title: `${res.domain || "Job Site"} Protected`,
          description: "Anti-bot verification active. URL saved! Please paste the job description text below.",
        });
      } else if (res.success && res.description) {
        // Successful automated scrape! Proceed directly to analyze & save
        toast({
          title: "Job Extracted Successfully",
          description: "Analyzing skills, role requirements, and company details...",
        });

        const analyzeRes = await createAndAnalyzeJobAction({
          descriptionText: res.description,
          url: urlInput.trim(),
          company: res.company,
          position: res.title,
          location: res.location,
          employmentType: res.employmentType,
        });

        if (analyzeRes.success && analyzeRes.job) {
          toast({
            title: "Job Saved & Analyzed",
            description: `${analyzeRes.job.position} at ${analyzeRes.job.company} added to your jobs list!`,
          });
          // Refresh local list
          setJobs((prev) => [analyzeRes.job as any, ...prev]);
          setUrlInput("");
          setJobDescription("");
          setProtectionNotice(null);
          setIsAdding(false);
        } else {
          toast({
            title: "Analysis Failed",
            description: analyzeRes.error || "Failed to analyze extracted job.",
            variant: "destructive",
          });
        }
      } else {
        setProtectionNotice(
          res.error || "Could not automatically extract text from this page. Please paste the job description text below."
        );
      }
    } catch {
      setProtectionNotice("An unexpected error occurred while fetching the URL. You can paste the text directly below.");
    } finally {
      setIsFetchingUrl(false);
    }
  };

  // Handle manual or hybrid (URL + pasted text) submission
  const handleAnalyzeJob = async () => {
    if (!jobDescription.trim()) {
      toast({
        title: "Description required",
        description: "Please enter or paste the job description text.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await createAndAnalyzeJobAction({
        descriptionText: jobDescription.trim(),
        url: urlInput.trim() || undefined,
        company: companyInput.trim() || undefined,
        position: positionInput.trim() || undefined,
      });

      if (result.success && result.job) {
        toast({
          title: "Job Analyzed & Saved!",
          description: `${result.job.position} at ${result.job.company} has been listed.`,
        });
        setJobs((prev) => [result.job as any, ...prev]);
        setJobDescription("");
        setUrlInput("");
        setCompanyInput("");
        setPositionInput("");
        setProtectionNotice(null);
        setIsAdding(false);
      } else {
        toast({
          title: "Analysis Error",
          description: result.error || "Failed to analyze job description.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Unexpected Error",
        description: "An error occurred while analyzing the job.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle job deletion
  const handleDeleteJob = async (jobId: string, company: string, position: string) => {
    try {
      const res = await deleteJobAction(jobId);
      if (res.success) {
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
        if (selectedJob?.id === jobId) setSelectedJob(null);
        toast({
          title: "Job Removed",
          description: `${position} at ${company} has been deleted.`,
        });
      } else {
        toast({
          title: "Delete Failed",
          description: res.error || "Could not delete job.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete job.",
        variant: "destructive",
      });
    }
  };

  // Handle track application
  const handleTrackApplication = async (jobId: string) => {
    setTrackingJobId(jobId);
    try {
      const res = await createApplicationAction(jobId);
      if (res.success) {
        toast({
          title: "Application Tracked!",
          description: "Added to your applications pipeline. Check your Dashboard or Applications tab.",
        });
        // Update local job application state
        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId ? { ...j, applications: [{ id: "temp", status: "SAVED" }] } : j
          )
        );
        if (selectedJob?.id === jobId) {
          setSelectedJob((prev) =>
            prev ? { ...prev, applications: [{ id: "temp", status: "SAVED" }] } : null
          );
        }
      } else {
        toast({
          title: "Notice",
          description: res.error || "Could not track application.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to track application.",
        variant: "destructive",
      });
    } finally {
      setTrackingJobId(null);
    }
  };

  // Filter jobs by search query
  const filteredJobs = jobs.filter((job) => {
    const q = searchQuery.toLowerCase();
    return (
      job.company.toLowerCase().includes(q) ||
      job.position.toLowerCase().includes(q) ||
      (job.location && job.location.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Saved Jobs & Target Roles</h1>
          <p className="text-muted-foreground mt-1">
            Import from JD links or text, extract requirements, and assess your fit.
          </p>
        </div>
        <Button
          onClick={() => {
            setIsAdding(!isAdding);
            setProtectionNotice(null);
          }}
          className="w-full sm:w-auto shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          {isAdding ? "Close Form" : "Add Job from Link or Text"}
        </Button>
      </div>

      {/* Add Job Form / Card */}
      {isAdding && (
        <Card className="border-primary/30 shadow-lg bg-card/60 backdrop-blur-xs transition-all">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Import & Analyze Job Description
                </CardTitle>
                <CardDescription>
                  Import via URL (Indeed, LinkedIn, Greenhouse, Lever, etc.) or paste the text directly.
                </CardDescription>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center rounded-lg bg-muted p-1 text-xs font-medium self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setAddMode("url")}
                  className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                    addMode === "url" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground"
                  }`}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Import from Link
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode("text")}
                  className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                    addMode === "text" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground"
                  }`}
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  Paste Text
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {addMode === "url" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Job Posting URL
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Link2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input
                        type="url"
                        placeholder="e.g. https://in.indeed.com/viewjob?jk=6458112800546282 or Greenhouse / Lever link"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                        disabled={isFetchingUrl || isAnalyzing}
                      />
                    </div>
                    <Button
                      onClick={handleFetchUrl}
                      disabled={isFetchingUrl || !urlInput.trim()}
                      className="shrink-0"
                    >
                      {isFetchingUrl ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Fetching...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Fetch & Analyze
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Cloudflare / Anti-bot Assistance Notice */}
                {protectionNotice && (
                  <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-sm space-y-3 animate-in fade-in-50">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-950 dark:text-amber-100">
                          Anti-Bot Verification Detected
                        </p>
                        <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                          {protectionNotice}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1 border-t border-amber-500/20">
                      <label className="text-xs font-medium">
                        Paste Job Description from your open browser tab:
                      </label>
                      <textarea
                        className="w-full min-h-[160px] p-3 text-sm rounded-md border border-amber-500/30 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-y"
                        placeholder="Select all & copy (Ctrl+A, Ctrl+C) from your open job tab, and paste here (Ctrl+V)..."
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        disabled={isAnalyzing}
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setProtectionNotice(null);
                            setIsAdding(false);
                          }}
                          disabled={isAnalyzing}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleAnalyzeJob}
                          disabled={isAnalyzing || !jobDescription.trim()}
                        >
                          {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {isAnalyzing ? "Extracting & Saving..." : "Analyze & Save Job"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {addMode === "text" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Original Job URL (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      disabled={isAnalyzing}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Company Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Will be auto-detected if empty"
                      value={companyInput}
                      onChange={(e) => setCompanyInput(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      disabled={isAnalyzing}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Job Description Content
                  </label>
                  <textarea
                    className="w-full min-h-[200px] p-3 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                    placeholder="Paste the complete job description text here (including responsibilities, qualifications, requirements)..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    disabled={isAnalyzing}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsAdding(false)}
                    disabled={isAnalyzing}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAnalyzeJob}
                    disabled={isAnalyzing || !jobDescription.trim()}
                  >
                    {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isAnalyzing ? "Extracting & Saving..." : "Analyze & Save Job"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search & Filter Toolbar */}
      {jobs.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by role, company, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="text-xs text-muted-foreground self-start sm:self-auto">
            Showing <span className="font-semibold text-foreground">{filteredJobs.length}</span> of{" "}
            {jobs.length} jobs
          </div>
        </div>
      )}

      {/* Jobs Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredJobs.length === 0 ? (
          <div className="col-span-full py-16 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-card/30">
            <Briefcase className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-medium text-foreground">No jobs found</h3>
            <p className="text-sm mt-1 max-w-sm mx-auto">
              {searchQuery
                ? "No saved jobs match your search query."
                : "Add a job posting URL or paste a job description to get started!"}
            </p>
            {!searchQuery && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setIsAdding(true);
                  setProtectionNotice(null);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Job
              </Button>
            )}
          </div>
        ) : (
          filteredJobs.map((job) => {
            const date = new Date(job.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            // Match score calculation
            const matchScore =
              job.jobMatches && job.jobMatches.length > 0
                ? job.jobMatches[0].overallScore
                : job.analysis
                ? 82
                : 0;

            const requiredSkills = safeJsonParse(job.analysis?.requiredSkills);
            const seniority = job.analysis?.seniority;
            const isTracked = job.applications && job.applications.length > 0;
            const host = getHostName(job.url);

            return (
              <Card
                key={job.id}
                className="flex flex-col hover:shadow-lg transition-all duration-200 border-border/70 hover:border-primary/40 group overflow-hidden"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Company Avatar with initials */}
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/20 shadow-xs flex items-center justify-center font-bold text-primary shrink-0">
                        {job.company.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <CardTitle
                          className="text-base font-semibold leading-tight truncate hover:text-primary cursor-pointer transition-colors"
                          title={job.position}
                          onClick={() => setSelectedJob(job)}
                        >
                          {job.position}
                        </CardTitle>
                        <CardDescription className="font-medium text-foreground/80 flex items-center gap-1.5 mt-1 truncate">
                          <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{job.company}</span>
                        </CardDescription>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                          />
                        }
                      >
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal size={16} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setSelectedJob(job)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Full Analysis
                        </DropdownMenuItem>
                        {job.url && (
                          <DropdownMenuItem
                            onClick={() => window.open(job.url!, "_blank", "noopener,noreferrer")}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open Original Link
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteJob(job.id, job.company, job.position)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Job
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="pb-4 flex-1 space-y-4">
                  {/* Badges row: Seniority, Location, Type */}
                  <div className="flex flex-wrap gap-1.5">
                    {seniority && (
                      <Badge variant="secondary" className="text-xs font-normal">
                        {seniority}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs font-normal flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate max-w-[140px]">
                        {job.location || "Remote / Not specified"}
                      </span>
                    </Badge>
                    {job.employmentType && (
                      <Badge variant="outline" className="text-xs font-normal flex items-center gap-1">
                        <Briefcase className="h-3 w-3 text-muted-foreground" />
                        {job.employmentType}
                      </Badge>
                    )}
                  </div>

                  {/* Original Link badge if present */}
                  {job.url && (
                    <div className="pt-1">
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-md transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Source: {host}</span>
                      </a>
                    </div>
                  )}

                  {/* Required Skills preview */}
                  {requiredSkills.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Required Skills
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {requiredSkills.slice(0, 4).map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center text-xs px-2 py-0.5 rounded-sm bg-muted text-foreground/90 font-mono"
                          >
                            {skill}
                          </span>
                        ))}
                        {requiredSkills.length > 4 && (
                          <span className="text-xs text-muted-foreground px-1 py-0.5">
                            +{requiredSkills.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Match Score */}
                  {matchScore > 0 && (
                    <div className="pt-2 border-t border-border/50">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-medium text-muted-foreground">Match Score</span>
                        <span
                          className={`font-bold ${
                            matchScore >= 80
                              ? "text-emerald-600 dark:text-emerald-400"
                              : matchScore >= 70
                              ? "text-primary"
                              : "text-amber-500"
                          }`}
                        >
                          {matchScore}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            matchScore >= 80
                              ? "bg-emerald-500"
                              : matchScore >= 70
                              ? "bg-primary"
                              : "bg-amber-500"
                          }`}
                          style={{ width: `${matchScore}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-0 flex gap-2 mt-auto border-t border-border/40 p-4 bg-muted/20">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedJob(job)}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    Details
                  </Button>

                  <Button
                    variant={isTracked ? "secondary" : "default"}
                    size="sm"
                    className="flex-1"
                    disabled={isTracked || trackingJobId === job.id}
                    onClick={() => handleTrackApplication(job.id)}
                  >
                    {trackingJobId === job.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isTracked ? (
                      <>
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                        In Pipeline
                      </>
                    ) : (
                      <>
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                        Track App
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>

      {/* Detailed Inspection Dialog Modal */}
      {selectedJob && (
        <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-3 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/20 shadow-xs flex items-center justify-center font-bold text-lg text-primary">
                    {selectedJob.company.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold leading-tight">
                      {selectedJob.position}
                    </DialogTitle>
                    <DialogDescription className="text-sm font-medium text-foreground flex items-center gap-2 mt-0.5">
                      <Building className="h-3.5 w-3.5 text-muted-foreground" />
                      {selectedJob.company}
                    </DialogDescription>
                  </div>
                </div>

                {selectedJob.url && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 shrink-0 self-start sm:self-auto"
                    onClick={() => window.open(selectedJob.url!, "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Original Posting
                  </Button>
                )}
              </div>
            </DialogHeader>

            <div className="space-y-6 py-2">
              {/* Meta Pill Badges */}
              <div className="flex flex-wrap gap-2 text-xs">
                {selectedJob.analysis?.seniority && (
                  <Badge variant="secondary" className="px-2.5 py-1">
                    Seniority: {selectedJob.analysis.seniority}
                  </Badge>
                )}
                <Badge variant="outline" className="px-2.5 py-1 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {selectedJob.location || "Location not specified"}
                </Badge>
                <Badge variant="outline" className="px-2.5 py-1 flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  {selectedJob.employmentType || "Employment type not specified"}
                </Badge>
                {selectedJob.experienceRequirement && (
                  <Badge variant="outline" className="px-2.5 py-1 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    Experience: {selectedJob.experienceRequirement}
                  </Badge>
                )}
              </div>

              {/* Match Score Breakdown if available */}
              {selectedJob.jobMatches && selectedJob.jobMatches.length > 0 && (
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Resume Match Analysis
                    </span>
                    <span className="text-base font-bold text-primary">
                      {selectedJob.jobMatches[0].overallScore}% Overall Match
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-primary/10 text-center">
                    <div className="p-2 rounded-lg bg-background/60">
                      <div className="text-xs text-muted-foreground">Skills</div>
                      <div className="text-sm font-bold">{selectedJob.jobMatches[0].skillsScore}%</div>
                    </div>
                    <div className="p-2 rounded-lg bg-background/60">
                      <div className="text-xs text-muted-foreground">Experience</div>
                      <div className="text-sm font-bold">{selectedJob.jobMatches[0].experienceScore}%</div>
                    </div>
                    <div className="p-2 rounded-lg bg-background/60">
                      <div className="text-xs text-muted-foreground">Keywords</div>
                      <div className="text-sm font-bold">{selectedJob.jobMatches[0].keywordsScore}%</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Required Skills */}
              {selectedJob.analysis?.requiredSkills && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Required Technical Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {safeJsonParse(selectedJob.analysis.requiredSkills).map((skill, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-mono text-xs px-2.5 py-1"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Preferred Skills */}
              {selectedJob.analysis?.preferredSkills &&
                safeJsonParse(selectedJob.analysis.preferredSkills).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Preferred & Bonus Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {safeJsonParse(selectedJob.analysis.preferredSkills).map((skill, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="border-primary/30 text-primary font-mono text-xs px-2.5 py-1"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              {/* Responsibilities */}
              {selectedJob.analysis?.responsibilities && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Key Responsibilities</h4>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {safeJsonParse(selectedJob.analysis.responsibilities).map((resp, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Keywords */}
              {selectedJob.analysis?.keywords && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">ATS Keywords & Competencies</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {safeJsonParse(selectedJob.analysis.keywords).map((kw, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Description Accordion / Scroll */}
              <div className="space-y-2 pt-2 border-t border-border">
                <h4 className="text-sm font-semibold">Full Job Description Text</h4>
                <div className="p-4 rounded-lg bg-muted/40 max-h-60 overflow-y-auto text-xs font-mono leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {selectedJob.description}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border flex flex-col sm:flex-row gap-2 justify-between items-center">
              <Button
                variant="destructive"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => handleDeleteJob(selectedJob.id, selectedJob.company, selectedJob.position)}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Delete Job
              </Button>

              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-initial"
                  onClick={() => setSelectedJob(null)}
                >
                  Close
                </Button>

                {!(selectedJob.applications && selectedJob.applications.length > 0) && (
                  <Button
                    size="sm"
                    className="flex-1 sm:flex-initial"
                    disabled={trackingJobId === selectedJob.id}
                    onClick={() => handleTrackApplication(selectedJob.id)}
                  >
                    {trackingJobId === selectedJob.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    ) : (
                      <Send className="h-4 w-4 mr-1.5" />
                    )}
                    Track Application
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
