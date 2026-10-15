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
  FileText,
  ListChecks,
  Layers,
  X,
  LayoutGrid,
  List,
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

function formatEmploymentType(val: string | null | undefined): string {
  if (!val) return "Full-Time";
  const clean = val.replace(/_/g, " ").toLowerCase();
  if (clean.includes("full")) return "Full-Time";
  if (clean.includes("part")) return "Part-Time";
  if (clean.includes("contract")) return "Contract";
  if (clean.includes("intern")) return "Internship";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Form states
  const [urlInput, setUrlInput] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [companyInput, setCompanyInput] = useState("");
  const [positionInput, setPositionInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [protectionNotice, setProtectionNotice] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "pipeline" | "unapplied">("all");

  // Detail Modal states
  const [selectedJob, setSelectedJob] = useState<JobItem | null>(null);
  const [detailModalTab, setDetailModalTab] = useState<"overview" | "responsibilities" | "full_jd">("overview");
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

  // Filter jobs by search and tab
  const filteredJobs = jobs.filter((job) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      job.company.toLowerCase().includes(q) ||
      job.position.toLowerCase().includes(q) ||
      (job.location && job.location.toLowerCase().includes(q));

    const isTracked = job.applications && job.applications.length > 0;
    if (filterTab === "pipeline") return matchesSearch && isTracked;
    if (filterTab === "unapplied") return matchesSearch && !isTracked;
    return matchesSearch;
  });

  const pipelineCount = jobs.filter((j) => j.applications && j.applications.length > 0).length;
  const unappliedCount = jobs.length - pipelineCount;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 md:px-6 py-4 pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Saved Jobs & Target Roles</h1>
          <p className="text-sm text-muted-foreground">
            Import from JD links or text, extract requirements, and assess your fit.
          </p>
        </div>
        <Button
          onClick={() => {
            setIsAdding(!isAdding);
            setProtectionNotice(null);
          }}
          className="w-full sm:w-auto shadow-xs shrink-0"
        >
          {isAdding ? (
            <>
              <X className="mr-2 h-4 w-4" />
              Close Form
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Add Job from Link or Text
            </>
          )}
        </Button>
      </div>

      {/* Add Job Form / Card */}
      {isAdding && (
        <Card className="border-primary/30 shadow-lg bg-card/80 backdrop-blur-xs transition-all overflow-hidden">
          <CardHeader className="pb-4 sm:pb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary shrink-0" />
                  Import & Analyze Job Description
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  Import via URL (Indeed, LinkedIn, Greenhouse, Lever, etc.) or paste the text directly.
                </CardDescription>
              </div>

              {/* Responsive Mode Toggle */}
              <div className="w-full sm:w-auto grid grid-cols-2 p-1 rounded-lg bg-muted text-xs font-medium shrink-0">
                <button
                  type="button"
                  onClick={() => setAddMode("url")}
                  className={`px-3 py-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    addMode === "url"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Import from Link
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode("text")}
                  className={`px-3 py-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    addMode === "text"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  Paste Text
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            {addMode === "url" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Job Posting Link
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <Link2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input
                        type="url"
                        placeholder="e.g. https://in.indeed.com/viewjob?jk=6458112800546282 or Greenhouse / Lever link"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                        disabled={isFetchingUrl || isAnalyzing}
                      />
                    </div>
                    <Button
                      onClick={handleFetchUrl}
                      disabled={isFetchingUrl || !urlInput.trim()}
                      className="w-full sm:w-auto shrink-0 h-10 px-5"
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
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-200 text-sm space-y-3 animate-in fade-in-50">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-950 dark:text-amber-100">
                          Anti-Bot Verification Detected
                        </p>
                        <p className="text-xs text-amber-900/90 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                          {protectionNotice}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-amber-500/20">
                      <label className="text-xs font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                        Paste Job Description Text (from your open browser tab):
                      </label>
                      <textarea
                        className="w-full min-h-[160px] p-3 text-sm rounded-lg border border-amber-500/40 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-y leading-relaxed font-sans"
                        placeholder="Select all & copy (Ctrl+A, Ctrl+C) from your open job tab, and paste here (Ctrl+V)..."
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        disabled={isAnalyzing}
                        autoFocus
                      />
                      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto"
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
                          className="w-full sm:w-auto"
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
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      disabled={isAnalyzing}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Job Description Content
                  </label>
                  <textarea
                    className="w-full min-h-[180px] p-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y leading-relaxed font-sans"
                    placeholder="Paste the complete job description text here (including responsibilities, qualifications, requirements)..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    disabled={isAnalyzing}
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setIsAdding(false)}
                    disabled={isAnalyzing}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="w-full sm:w-auto"
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

      {/* Responsive Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        {/* Filter Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-muted text-xs font-medium overflow-x-auto w-full md:w-auto">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              filterTab === "all"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Jobs
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted-foreground/15">
              {jobs.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("pipeline")}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              filterTab === "pipeline"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            In Pipeline
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
              {pipelineCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("unapplied")}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              filterTab === "unapplied"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Unapplied
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted-foreground/15">
              {unappliedCount}
            </span>
          </button>
        </div>

        {/* Search Input & View Switcher */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by role, company, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="flex items-center p-1 rounded-lg bg-muted text-xs">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              title="Grid View"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              title="List View"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === "list"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Jobs Listing */}
      {filteredJobs.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border-2 border-dashed rounded-2xl bg-card/40 px-4">
          <Briefcase className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-base sm:text-lg font-medium text-foreground">No jobs found</h3>
          <p className="text-xs sm:text-sm mt-1 max-w-sm mx-auto text-muted-foreground">
            {searchQuery
              ? "No saved jobs match your current search query."
              : "Add a job posting link or paste a job description to get started!"}
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
      ) : viewMode === "grid" ? (
        /* GRID VIEW: 2 columns on medium/large screens for maximum readability */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredJobs.map((job) => {
            const matchScore =
              job.jobMatches && job.jobMatches.length > 0
                ? job.jobMatches[0].overallScore
                : job.analysis
                ? 82
                : 75;

            const requiredSkills = safeJsonParse(job.analysis?.requiredSkills);
            const seniority = job.analysis?.seniority;
            const isTracked = job.applications && job.applications.length > 0;
            const host = getHostName(job.url);

            return (
              <Card
                key={job.id}
                className="flex flex-col h-full hover:shadow-md hover:border-primary/40 transition-all duration-200 border-border/80 group rounded-xl overflow-hidden bg-card"
              >
                {/* Header Zone */}
                <div className="p-5 pb-3">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/10 via-primary/20 to-primary/30 border border-primary/25 shadow-xs flex items-center justify-center font-bold text-primary shrink-0 text-base">
                        {job.company.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3
                          className="text-base sm:text-lg font-semibold leading-snug line-clamp-2 hover:text-primary cursor-pointer transition-colors break-words"
                          title={job.position}
                          onClick={() => {
                            setSelectedJob(job);
                            setDetailModalTab("overview");
                          }}
                        >
                          {job.position}
                        </h3>
                        <p className="font-medium text-foreground/80 flex items-center gap-1.5 mt-1 text-xs sm:text-sm">
                          <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{job.company}</span>
                        </p>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 -mr-1"
                          />
                        }
                      >
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal size={16} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[170px]">
                        {job.url && (
                          <DropdownMenuItem
                            onClick={() => window.open(job.url!, "_blank", "noopener,noreferrer")}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open Original Link
                          </DropdownMenuItem>
                        )}
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
                </div>

                {/* Badges & Meta Zone */}
                <div className="px-5 pb-3 flex flex-wrap items-center gap-1.5">
                  {seniority && (
                    <Badge variant="secondary" className="text-xs font-normal px-2.5 py-0.5 whitespace-nowrap">
                      {seniority}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs font-normal flex items-center gap-1 px-2.5 py-0.5 whitespace-nowrap">
                    <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span>{job.location || "Remote / Unspecified"}</span>
                  </Badge>
                  {job.employmentType && (
                    <Badge variant="outline" className="text-xs font-normal flex items-center gap-1 px-2.5 py-0.5 whitespace-nowrap">
                      <Briefcase className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span>{formatEmploymentType(job.employmentType)}</span>
                    </Badge>
                  )}
                  {job.experienceRequirement && (
                    <Badge variant="outline" className="text-xs font-normal flex items-center gap-1 px-2.5 py-0.5 whitespace-nowrap">
                      <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span>{job.experienceRequirement}</span>
                    </Badge>
                  )}
                  {job.url && (
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium bg-primary/5 hover:bg-primary/10 px-2.5 py-0.5 rounded-md transition-colors whitespace-nowrap"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span>Source: {host}</span>
                    </a>
                  )}
                </div>

                {/* Skills Zone */}
                <div className="px-5 pb-4 flex-1">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Required Skills
                  </div>
                  <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
                    {requiredSkills.length > 0 ? (
                      <>
                        {requiredSkills.slice(0, 5).map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center text-xs px-2.5 py-1 rounded-md bg-muted text-foreground/90 font-mono whitespace-nowrap"
                          >
                            {skill}
                          </span>
                        ))}
                        {requiredSkills.length > 5 && (
                          <span className="text-xs text-muted-foreground px-1.5 py-1 self-center whitespace-nowrap">
                            +{requiredSkills.length - 5} more
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground italic py-1">
                        Detailed role requirements available in description
                      </span>
                    )}
                  </div>
                </div>

                {/* Match Score Zone - Pinned with mt-auto */}
                <div className="mt-auto px-5 pt-3 pb-3 border-t border-border/50">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-medium text-muted-foreground">Match Fit</span>
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

                {/* Footer Actions */}
                <div className="px-5 py-3.5 border-t border-border/50 bg-muted/20 flex items-center gap-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-9"
                    onClick={() => {
                      setSelectedJob(job);
                      setDetailModalTab("overview");
                    }}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    Details
                  </Button>

                  <Button
                    variant={isTracked ? "secondary" : "default"}
                    size="sm"
                    className="flex-1 text-xs h-9"
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
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW: Responsive horizontal cards */
        <div className="space-y-4">
          {filteredJobs.map((job) => {
            const matchScore =
              job.jobMatches && job.jobMatches.length > 0
                ? job.jobMatches[0].overallScore
                : job.analysis
                ? 82
                : 75;

            const requiredSkills = safeJsonParse(job.analysis?.requiredSkills);
            const seniority = job.analysis?.seniority;
            const isTracked = job.applications && job.applications.length > 0;
            const host = getHostName(job.url);

            return (
              <Card
                key={job.id}
                className="p-4 sm:p-5 hover:shadow-md hover:border-primary/40 transition-all border-border/80 rounded-xl bg-card"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Info & Badges */}
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 via-primary/20 to-primary/30 border border-primary/25 shadow-xs flex items-center justify-center font-bold text-primary shrink-0 text-base">
                      {job.company.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <h3
                          className="text-base sm:text-lg font-semibold leading-snug hover:text-primary cursor-pointer transition-colors break-words"
                          onClick={() => {
                            setSelectedJob(job);
                            setDetailModalTab("overview");
                          }}
                        >
                          {job.position}
                        </h3>
                        <p className="text-xs sm:text-sm font-medium text-foreground/80 flex items-center gap-1.5 mt-0.5">
                          <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{job.company}</span>
                        </p>
                      </div>

                      {/* Meta badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {seniority && (
                          <Badge variant="secondary" className="text-xs font-normal px-2 py-0.5 whitespace-nowrap">
                            {seniority}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs font-normal flex items-center gap-1 px-2 py-0.5 whitespace-nowrap">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span>{job.location || "Remote / Unspecified"}</span>
                        </Badge>
                        {job.employmentType && (
                          <Badge variant="outline" className="text-xs font-normal flex items-center gap-1 px-2 py-0.5 whitespace-nowrap">
                            <Briefcase className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span>{formatEmploymentType(job.employmentType)}</span>
                          </Badge>
                        )}
                        {job.url && (
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium bg-primary/5 hover:bg-primary/10 px-2 py-0.5 rounded-md transition-colors whitespace-nowrap"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            <span>{host}</span>
                          </a>
                        )}
                      </div>

                      {/* Skills */}
                      {requiredSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {requiredSkills.slice(0, 4).map((skill, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center text-xs px-2 py-0.5 rounded-md bg-muted text-foreground/90 font-mono whitespace-nowrap"
                            >
                              {skill}
                            </span>
                          ))}
                          {requiredSkills.length > 4 && (
                            <span className="text-xs text-muted-foreground px-1 py-0.5 self-center">
                              +{requiredSkills.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Match & Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-border/40">
                    <div className="flex items-center gap-2 min-w-[130px]">
                      <div className="text-xs font-medium text-muted-foreground">Match:</div>
                      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            matchScore >= 80 ? "bg-emerald-500" : matchScore >= 70 ? "bg-primary" : "bg-amber-500"
                          }`}
                          style={{ width: `${matchScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold">{matchScore}%</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 px-3"
                        onClick={() => {
                          setSelectedJob(job);
                          setDetailModalTab("overview");
                        }}
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        Details
                      </Button>
                      {job.url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 px-3 gap-1.5"
                          onClick={() => window.open(job.url!, "_blank", "noopener,noreferrer")}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Original Link
                        </Button>
                      )}
                      <Button
                        variant={isTracked ? "secondary" : "default"}
                        size="sm"
                        className="text-xs h-8 px-3"
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
                        <DropdownMenuContent align="end" className="min-w-[170px]">
                          {job.url && (
                            <DropdownMenuItem
                              onClick={() => window.open(job.url!, "_blank", "noopener,noreferrer")}
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Open Original Link
                            </DropdownMenuItem>
                          )}
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
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detailed Inspection Dialog Modal with Responsive Tabs */}
      {selectedJob && (
        <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
          <DialogContent className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pr-8">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 via-primary/20 to-primary/30 border border-primary/25 shadow-xs flex items-center justify-center font-bold text-lg text-primary shrink-0">
                    {selectedJob.company.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-lg sm:text-xl font-bold leading-snug break-words">
                      {selectedJob.position}
                    </DialogTitle>
                    <DialogDescription className="text-sm font-medium text-foreground/80 flex items-center gap-1.5 mt-0.5">
                      <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{selectedJob.company}</span>
                    </DialogDescription>
                  </div>
                </div>

                {selectedJob.url && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 shrink-0 self-start sm:self-auto text-xs"
                    onClick={() => window.open(selectedJob.url!, "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Original Posting
                  </Button>
                )}
              </div>

              {/* Responsive Modal Tabs */}
              <div className="flex items-center gap-1 border-b border-border/40 pt-2 -mb-3 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setDetailModalTab("overview")}
                  className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    detailModalTab === "overview"
                      ? "border-primary text-primary font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  Overview & Skills
                </button>
                <button
                  type="button"
                  onClick={() => setDetailModalTab("responsibilities")}
                  className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    detailModalTab === "responsibilities"
                      ? "border-primary text-primary font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ListChecks className="h-3.5 w-3.5" />
                  Responsibilities
                </button>
                <button
                  type="button"
                  onClick={() => setDetailModalTab("full_jd")}
                  className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    detailModalTab === "full_jd"
                      ? "border-primary text-primary font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Full Description
                </button>
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
              {/* Tab 1: Overview & Skills */}
              {detailModalTab === "overview" && (
                <div className="space-y-5 animate-in fade-in-50 duration-200">
                  {/* Meta Badges */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {selectedJob.analysis?.seniority && (
                      <Badge variant="secondary" className="px-2.5 py-1 whitespace-nowrap">
                        Seniority: {selectedJob.analysis.seniority}
                      </Badge>
                    )}
                    <Badge variant="outline" className="px-2.5 py-1 flex items-center gap-1 whitespace-nowrap">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {selectedJob.location || "Location not specified"}
                    </Badge>
                    <Badge variant="outline" className="px-2.5 py-1 flex items-center gap-1 whitespace-nowrap">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatEmploymentType(selectedJob.employmentType)}
                    </Badge>
                    {selectedJob.experienceRequirement && (
                      <Badge variant="outline" className="px-2.5 py-1 flex items-center gap-1 whitespace-nowrap">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        Experience: {selectedJob.experienceRequirement}
                      </Badge>
                    )}
                  </div>

                  {/* Match Analysis Breakdown */}
                  {selectedJob.jobMatches && selectedJob.jobMatches.length > 0 && (
                    <div className="p-4 rounded-xl border border-primary/25 bg-primary/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Resume Match Compatibility
                        </span>
                        <span className="text-base font-bold text-primary">
                          {selectedJob.jobMatches[0].overallScore}% Match
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-primary/10 text-center">
                        <div className="p-2.5 rounded-lg bg-background/80 border border-primary/10">
                          <div className="text-[11px] text-muted-foreground">Skills Match</div>
                          <div className="text-sm font-bold text-foreground mt-0.5">
                            {selectedJob.jobMatches[0].skillsScore}%
                          </div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-background/80 border border-primary/10">
                          <div className="text-[11px] text-muted-foreground">Experience</div>
                          <div className="text-sm font-bold text-foreground mt-0.5">
                            {selectedJob.jobMatches[0].experienceScore}%
                          </div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-background/80 border border-primary/10">
                          <div className="text-[11px] text-muted-foreground">Keywords</div>
                          <div className="text-sm font-bold text-foreground mt-0.5">
                            {selectedJob.jobMatches[0].keywordsScore}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Required Skills */}
                  <div className="space-y-2.5">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Required Technical Skills
                    </h4>
                    {safeJsonParse(selectedJob.analysis?.requiredSkills).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {safeJsonParse(selectedJob.analysis?.requiredSkills).map((skill, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 font-mono text-xs px-2.5 py-1 whitespace-nowrap"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        No specific tech stack extracted. Check full description.
                      </p>
                    )}
                  </div>

                  {/* Preferred Skills */}
                  {safeJsonParse(selectedJob.analysis?.preferredSkills).length > 0 && (
                    <div className="space-y-2.5">
                      <h4 className="text-sm font-semibold flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Preferred & Bonus Skills
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {safeJsonParse(selectedJob.analysis?.preferredSkills).map((skill, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="border-primary/30 text-primary font-mono text-xs px-2.5 py-1 whitespace-nowrap"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ATS Keywords */}
                  {safeJsonParse(selectedJob.analysis?.keywords).length > 0 && (
                    <div className="space-y-2.5">
                      <h4 className="text-sm font-semibold">ATS Keywords & Competencies</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {safeJsonParse(selectedJob.analysis?.keywords).map((kw, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground whitespace-nowrap"
                          >
                            #{kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Key Responsibilities */}
              {detailModalTab === "responsibilities" && (
                <div className="space-y-3 animate-in fade-in-50 duration-200">
                  <h4 className="text-sm font-semibold">Role Responsibilities</h4>
                  {safeJsonParse(selectedJob.analysis?.responsibilities).length > 0 ? (
                    <ul className="space-y-2 text-sm text-foreground/90">
                      {safeJsonParse(selectedJob.analysis?.responsibilities).map((resp, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/30">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{resp}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Review the full job description tab for complete details.
                    </p>
                  )}
                </div>
              )}

              {/* Tab 3: Full Job Description */}
              {detailModalTab === "full_jd" && (
                <div className="space-y-3 animate-in fade-in-50 duration-200">
                  <h4 className="text-sm font-semibold">Original Job Description Text</h4>
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/50 text-sm leading-relaxed text-foreground/90 whitespace-pre-line break-words font-sans">
                    {selectedJob.description}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-muted/20 flex flex-col-reverse sm:flex-row justify-between items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="w-full sm:w-auto text-xs"
                onClick={() => handleDeleteJob(selectedJob.id, selectedJob.company, selectedJob.position)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete Job
              </Button>

              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-initial text-xs"
                  onClick={() => setSelectedJob(null)}
                >
                  Close
                </Button>

                {!(selectedJob.applications && selectedJob.applications.length > 0) && (
                  <Button
                    size="sm"
                    className="flex-1 sm:flex-initial text-xs"
                    disabled={trackingJobId === selectedJob.id}
                    onClick={() => handleTrackApplication(selectedJob.id)}
                  >
                    {trackingJobId === selectedJob.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Track Application
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
