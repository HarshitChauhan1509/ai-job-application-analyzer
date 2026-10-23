"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Briefcase,
  Search,
  Building2,
  MapPin,
  DollarSign,
  Flame,
  Sparkles,
  ExternalLink,
  Send,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { CuratedJobItem, trackCuratedJobAction } from "@/app/actions/curated-jobs";
import { OutreachModal } from "@/components/dashboard/outreach-modal";

const DEPARTMENTS = ["All", "Frontend", "Backend", "Fullstack", "AI / ML"];
const STAGES = ["All", "Seed", "Series A", "Series B", "Growth"];

export function ExploreClient({
  initialJobs,
  hasPrimaryResume,
}: {
  initialJobs: CuratedJobItem[];
  hasPrimaryResume: boolean;
}) {
  const [jobs, setJobs] = useState<CuratedJobItem[]>(initialJobs);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedStage, setSelectedStage] = useState("All");
  const [trackingId, setTrackingId] = useState<string | null>(null);

  // Outreach Modal state
  const [outreachModalState, setOutreachModalState] = useState<{
    open: boolean;
    applicationId: string;
    companyName: string;
    roleTitle: string;
  } | null>(null);

  const { toast } = useToast();

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Department filter
      if (selectedDept !== "All" && job.department !== selectedDept) {
        return false;
      }
      // Stage filter
      if (selectedStage !== "All" && !job.startupStage?.includes(selectedStage)) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inCompany = job.company.toLowerCase().includes(q);
        const inPos = job.position.toLowerCase().includes(q);
        const inDesc = job.description.toLowerCase().includes(q);
        const inSkills = job.requiredSkills.some((s) => s.toLowerCase().includes(q));
        if (!inCompany && !inPos && !inDesc && !inSkills) {
          return false;
        }
      }
      return true;
    });
  }, [jobs, selectedDept, selectedStage, searchQuery]);

  const handleTrackAndPitch = async (job: CuratedJobItem) => {
    setTrackingId(job.id);
    try {
      const res = await trackCuratedJobAction(job.id);
      if (!res.success || !res.applicationId) {
        toast({
          title: "Tracking Failed",
          description: res.error || "Could not track job in your pipeline.",
          variant: "destructive",
        });
        return;
      }

      // Update local job state
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id
            ? { ...j, applicationId: res.applicationId, applicationStatus: "SAVED" }
            : j
        )
      );

      toast({
        title: "Added to Pipeline! 🎯",
        description: `${job.company} (${job.position}) added to your applications. Opening cold outreach generator...`,
      });

      // Open outreach modal immediately
      setOutreachModalState({
        open: true,
        applicationId: res.applicationId,
        companyName: job.company,
        roleTitle: job.position,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to add job to pipeline.",
        variant: "destructive",
      });
    } finally {
      setTrackingId(null);
    }
  };

  const handleDirectPitch = (job: CuratedJobItem) => {
    if (!job.applicationId) return;
    setOutreachModalState({
      open: true,
      applicationId: job.applicationId,
      companyName: job.company,
      roleTitle: job.position,
    });
  };

  const getStageBadgeColor = (stage: string | null) => {
    if (!stage) return "bg-muted text-muted-foreground";
    if (stage.includes("Seed")) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    if (stage.includes("Series A")) return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    if (stage.includes("Series B")) return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Feed Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Curated Startup Roles</h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1 py-0.5">
              <Flame className="h-3.5 w-3.5 fill-primary text-primary" />
              Hot Engineering Feed
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1.5 max-w-2xl">
            Pre-analyzed roles at high-growth startups and YC companies. Analyze your ATS fit instantly or draft a personalized cold pitch directly to the founding team.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/applications">
            <Button variant="outline" size="sm" className="text-xs h-9">
              View Pipeline
            </Button>
          </Link>
          <Link href="/jobs">
            <Button size="sm" className="text-xs h-9 gap-1.5">
              <Briefcase className="h-3.5 w-3.5" />
              My Custom Jobs
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3 bg-card/60 border rounded-xl p-4 shadow-2xs">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company, title, or skills (e.g. Next.js, vLLM, PostgreSQL)..."
            className="pl-9 h-9 text-xs bg-background"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Department Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">
              Department:
            </span>
            {DEPARTMENTS.map((dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => setSelectedDept(dept)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  selectedDept === dept
                    ? "bg-primary text-primary-foreground border-primary font-medium shadow-xs"
                    : "bg-background text-muted-foreground hover:bg-muted border-border"
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          {/* Stage Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">
              Stage:
            </span>
            {STAGES.map((stage) => (
              <button
                key={stage}
                type="button"
                onClick={() => setSelectedStage(stage)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  selectedStage === stage
                    ? "bg-secondary text-secondary-foreground border-secondary font-medium shadow-xs"
                    : "bg-background text-muted-foreground hover:bg-muted border-border"
                }`}
              >
                {stage}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Jobs Grid */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-card/30">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-semibold">No startup jobs matched your filters</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Try adjusting your search query, or clear your stage and department filters to browse all openings.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setSelectedDept("All");
              setSelectedStage("All");
            }}
            className="mt-4 text-xs"
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredJobs.map((job) => (
            <Card
              key={job.id}
              className="group border border-border/70 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <CardContent className="p-5 space-y-4 flex flex-col h-full justify-between">
                <div>
                  {/* Top Header: Company + Stage + Match */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-base text-primary shadow-xs">
                        {job.company.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base leading-tight group-hover:text-primary transition-colors">
                            {job.company}
                          </h3>
                          <Badge variant="outline" className={`text-[10px] px-2 py-0 font-medium ${getStageBadgeColor(job.startupStage)}`}>
                            {job.startupStage || "Startup"}
                          </Badge>
                        </div>
                        <p className="text-xs font-semibold text-foreground/80 mt-0.5">{job.position}</p>
                      </div>
                    </div>

                    {/* Fit score badge */}
                    <div className="flex flex-col items-end shrink-0">
                      <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-xs font-bold">
                        <Sparkles className="h-3 w-3" />
                        <span>{job.matchScore}% Match</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        {hasPrimaryResume ? "vs. Primary Resume" : "ATS Fit Score"}
                      </span>
                    </div>
                  </div>

                  {/* Compensation & Location Metadata */}
                  <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
                    {job.salaryRange && (
                      <div className="flex items-center gap-1 text-foreground/90 font-medium">
                        <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{job.salaryRange}</span>
                      </div>
                    )}
                    {job.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{job.location}</span>
                      </div>
                    )}
                    {job.department && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {job.department}
                      </Badge>
                    )}
                  </div>

                  {/* Synopsis */}
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-2.5">
                    {job.description}
                  </p>

                  {/* Skill Chips */}
                  {job.requiredSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {job.requiredSkills.slice(0, 5).map((skill, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-medium bg-muted/80 text-foreground px-2 py-0.5 rounded-md border border-border/40"
                        >
                          {skill}
                        </span>
                      ))}
                      {job.requiredSkills.length > 5 && (
                        <span className="text-[10px] text-muted-foreground px-1 py-0.5">
                          +{job.requiredSkills.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2 mt-2">
                  {job.url ? (
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Listing
                    </a>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    {job.applicationId ? (
                      <>
                        <Badge variant="outline" className="text-[11px] gap-1 bg-primary/5 text-primary border-primary/20 py-0.5">
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                          Tracked ({job.applicationStatus || "SAVED"})
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDirectPitch(job)}
                          className="h-8 text-xs gap-1"
                        >
                          <Send className="h-3 w-3 text-primary" />
                          Pitch Founder
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleTrackAndPitch(job)}
                        disabled={trackingId === job.id}
                        className="h-8 text-xs gap-1.5 shadow-xs"
                      >
                        <Send className="h-3 w-3" />
                        {trackingId === job.id ? "Adding..." : "Add to Pipeline & Pitch"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Embedded Outreach Modal */}
      {outreachModalState && (
        <OutreachModal
          open={outreachModalState.open}
          onOpenChange={(open) =>
            !open && setOutreachModalState(null)
          }
          applicationId={outreachModalState.applicationId}
          companyName={outreachModalState.companyName}
          roleTitle={outreachModalState.roleTitle}
        />
      )}
    </div>
  );
}
