"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Mic,
  Briefcase,
  ChevronRight,
  Play,
  History,
  Sparkles,
  Loader2,
  Trash2,
  Calendar,
  CheckCircle2,
  Building,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createInterviewSessionAction,
  getSavedJobsForInterviewAction,
  getPastInterviewSessionsAction,
  deleteInterviewSessionAction,
} from "@/app/actions/interview";

interface SavedJob {
  id: string;
  company: string;
  position: string;
  description: string;
  location?: string | null;
}

interface PastSession {
  id: string;
  role: string;
  difficulty: string;
  totalQuestions: number;
  answeredQuestions: number;
  overallScore: number | null;
  isCompleted: boolean;
  createdAt: Date | string;
}

export default function InterviewCoachSetupPage() {
  const router = useRouter();

  const [role, setRole] = useState("Full Stack Developer");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [numQuestions, setNumQuestions] = useState(3);
  const [selectedJobId, setSelectedJobId] = useState<string>("none");
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const [categories, setCategories] = useState<Record<string, boolean>>({
    "System Design": true,
    "JavaScript": true,
    "React": true,
    "Node.js": false,
    "Behavioral": true,
    "Leadership": false,
    "DevOps": false,
    "HR": false,
  });

  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Past Sessions Modal
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Active template tag
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);

  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await getSavedJobsForInterviewAction();
        if (res.success && res.jobs) {
          setSavedJobs(res.jobs);
        }
      } catch (err) {
        console.error("Failed to load jobs", err);
      } finally {
        setLoadingJobs(false);
      }
    }
    loadJobs();
  }, []);

  const handleToggle = (cat: string) => {
    setCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleJobSelect = (jobId: string | null) => {
    if (!jobId) return;
    setSelectedJobId(jobId);
    if (jobId === "none") return;

    const matchedJob = savedJobs.find((j) => j.id === jobId);
    if (matchedJob) {
      setRole(`${matchedJob.position} (${matchedJob.company})`);
      setActiveTemplate(null);
    }
  };

  const applyTemplate = (
    templateName: string,
    templateRole: string,
    templateDifficulty: string,
    templateCategories: string[],
    templateCount: number
  ) => {
    setActiveTemplate(templateName);
    setRole(templateRole);
    setDifficulty(templateDifficulty);
    setNumQuestions(templateCount);
    setSelectedJobId("none");

    const newCats: Record<string, boolean> = {
      "System Design": false,
      "JavaScript": false,
      "React": false,
      "Node.js": false,
      "Behavioral": false,
      "Leadership": false,
      "DevOps": false,
      "HR": false,
    };
    templateCategories.forEach((cat) => {
      newCats[cat] = true;
    });
    setCategories(newCats);
  };

  const handleStart = async () => {
    setError(null);
    const activeCats = Object.keys(categories).filter((k) => categories[k]);

    if (!role.trim()) {
      setError("Please specify a target role");
      return;
    }

    if (activeCats.length === 0) {
      setError("Please select at least one focus category");
      return;
    }

    setIsStarting(true);
    try {
      const res = await createInterviewSessionAction({
        role: role.trim(),
        difficulty,
        numQuestions,
        categories: activeCats,
        jobId: selectedJobId !== "none" ? selectedJobId : undefined,
      });

      if (res.success && res.sessionId) {
        // Navigates directly to /coach/session?sessionId=...
        router.push(`/coach/session?sessionId=${res.sessionId}`);
      } else {
        setError(res.error || "Failed to initialize interview session");
        setIsStarting(false);
      }
    } catch (err) {
      console.error("Start interview error:", err);
      setError("An unexpected error occurred while starting the session");
      setIsStarting(false);
    }
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    setLoadingHistory(true);
    try {
      const res = await getPastInterviewSessionsAction();
      if (res.success && res.sessions) {
        setPastSessions(res.sessions);
      }
    } catch (err) {
      console.error("Error loading past sessions", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteInterviewSessionAction(sessionId);
      setPastSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">AI Interview Coach</h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs py-0.5">
              <Sparkles className="h-3 w-3 mr-1" /> Interactive Simulator
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Simulate high-stakes technical & behavioral interviews with instant real-time AI scoring, audio read-aloud, and voice dictation.
          </p>
        </div>
        <Button variant="outline" onClick={openHistory} className="gap-2 shrink-0">
          <History className="h-4 w-4" /> Past Sessions
        </Button>
      </div>

      {/* Quick Mock Templates */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Quick Mock Templates
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              id: "system-design",
              title: "System Design Mock",
              subtitle: "Senior • Architecture & Scaling",
              role: "Senior Systems Architect",
              diff: "Senior",
              cats: ["System Design", "Node.js", "DevOps"],
              count: 5,
            },
            {
              id: "behavioral",
              title: "Behavioral & STAR",
              subtitle: "Leadership & Conflict Handling",
              role: "Engineering Lead",
              diff: "Senior",
              cats: ["Behavioral", "Leadership", "HR"],
              count: 3,
            },
            {
              id: "frontend",
              title: "Frontend Specialist",
              subtitle: "React, DOM & Web Performance",
              role: "Frontend Engineer",
              diff: "Intermediate",
              cats: ["React", "JavaScript"],
              count: 5,
            },
            {
              id: "fullstack",
              title: "Full-Stack Core",
              subtitle: "Modern APIs & Architecture",
              role: "Full Stack Developer",
              diff: "Intermediate",
              cats: ["JavaScript", "React", "Node.js", "System Design"],
              count: 5,
            },
          ].map((tmpl) => {
            const isSelected = activeTemplate === tmpl.id;
            return (
              <Card
                key={tmpl.id}
                onClick={() => applyTemplate(tmpl.id, tmpl.role, tmpl.diff, tmpl.cats, tmpl.count)}
                className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm ${
                  isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border"
                }`}
              >
                <CardContent className="p-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm leading-snug">{tmpl.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{tmpl.subtitle}</p>
                  </div>
                  <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isSelected ? "text-primary translate-x-0.5" : "text-muted-foreground"}`} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Main Configuration Card */}
      <Card className="border-primary/20 shadow-sm">
        <CardHeader className="bg-primary/5 pb-4 border-b border-primary/10">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Mic className="text-primary h-5 w-5" />
            Interview Session Configuration
          </CardTitle>
          <CardDescription>
            Customize your practice session parameters or tether it to a specific saved job application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {error && (
            <div className="p-3 text-sm rounded-md bg-destructive/10 text-destructive border border-destructive/20">
              {error}
            </div>
          )}

          {/* Job Association Picker */}
          {savedJobs.length > 0 && (
            <div className="space-y-2 p-3.5 rounded-lg bg-muted/40 border border-border">
              <div className="flex items-center justify-between">
                <Label htmlFor="saved-job" className="flex items-center gap-1.5 text-sm font-semibold">
                  <Building className="h-4 w-4 text-primary" /> Target Saved Job (Optional)
                </Label>
                <span className="text-xs text-muted-foreground">Tailor questions to job requirements</span>
              </div>
              <Select value={selectedJobId} onValueChange={handleJobSelect}>
                <SelectTrigger id="saved-job" className="bg-background">
                  <SelectValue placeholder="Select a saved job description..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None — General Role Simulation</SelectItem>
                  {savedJobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.position} at {job.company} {job.location ? `• ${job.location}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Role & Difficulty */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="role">Target Role / Title</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="role"
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    setActiveTemplate(null);
                  }}
                  placeholder="e.g. Senior Backend Engineer"
                  className="pl-9"
                  disabled={isStarting}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {["Full Stack", "Backend", "Frontend", "DevOps / SRE", "Engineering Lead"].map((quickRole) => (
                  <button
                    key={quickRole}
                    type="button"
                    onClick={() => {
                      setRole(quickRole);
                      setActiveTemplate(null);
                    }}
                    className="text-xs px-2 py-0.5 rounded-full border border-border bg-background hover:bg-muted text-muted-foreground transition-colors"
                  >
                    {quickRole}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Seniority / Difficulty Level</Label>
              <Select
                value={difficulty}
                onValueChange={(val) => {
                  if (val) setDifficulty(val);
                  setActiveTemplate(null);
                }}
                disabled={isStarting}
              >
                <SelectTrigger id="difficulty">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Junior">Junior (Fundamentals & problem-solving)</SelectItem>
                  <SelectItem value="Intermediate">Intermediate / Mid-level (Production patterns)</SelectItem>
                  <SelectItem value="Senior">Senior (Architecture, trade-offs & scaling)</SelectItem>
                  <SelectItem value="Lead">Lead / Staff (Strategy, leadership & systems)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Focus Categories */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label>Focus Areas (Categories)</Label>
              <span className="text-xs text-muted-foreground">Select all topics you wish to practice</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {Object.keys(categories).map((cat) => {
                const checked = categories[cat];
                return (
                  <div
                    key={cat}
                    className={`flex items-center space-x-2 border rounded-lg p-2.5 transition-all cursor-pointer ${
                      checked
                        ? "bg-primary/10 border-primary/40 text-foreground font-medium shadow-2xs"
                        : "hover:bg-muted/50 border-border text-muted-foreground"
                    }`}
                    onClick={() => handleToggle(cat)}
                  >
                    <Checkbox
                      id={`cat-${cat}`}
                      checked={checked}
                      onCheckedChange={() => handleToggle(cat)}
                      disabled={isStarting}
                    />
                    <Label htmlFor={`cat-${cat}`} className="cursor-pointer text-xs sm:text-sm font-medium">
                      {cat}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Question Count */}
          <div className="space-y-2 pt-2">
            <Label htmlFor="numQuestions">Interview Session Length</Label>
            <Select
              value={String(numQuestions)}
              onValueChange={(val) => setNumQuestions(Number(val))}
              disabled={isStarting}
            >
              <SelectTrigger id="numQuestions">
                <SelectValue placeholder="Select question count" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Quick Sprint (3 Questions • ~10 mins)</SelectItem>
                <SelectItem value="5">Standard Mock (5 Questions • ~20 mins)</SelectItem>
                <SelectItem value="8">In-Depth Simulation (8 Questions • ~35 mins)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>

        <CardFooter className="bg-muted/20 border-t border-border p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button variant="ghost" onClick={openHistory} className="text-muted-foreground w-full sm:w-auto">
            <History className="h-4 w-4 mr-2" /> View Past Sessions ({pastSessions.length || "History"})
          </Button>

          <Button
            onClick={handleStart}
            disabled={isStarting}
            className="w-full sm:w-auto px-8 shadow-md gap-2"
          >
            {isStarting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Preparing Interview...
              </>
            ) : (
              <>
                Start Practice Interview <Play className="h-4 w-4 fill-current ml-1" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Past Sessions History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" /> Past Practice Sessions
            </DialogTitle>
            <DialogDescription>
              Review your past interview simulations, AI feedback reports, and performance scores.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm">Loading session history...</p>
              </div>
            ) : pastSessions.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-lg bg-muted/20">
                <Mic className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="font-medium text-sm">No practice sessions found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure your target role above and launch your first mock interview!
                </p>
              </div>
            ) : (
              pastSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => {
                    setHistoryOpen(false);
                    router.push(`/coach/session?sessionId=${session.id}`);
                  }}
                  className="p-4 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-muted/30 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{session.role}</p>
                      <Badge variant="outline" className="text-xs">
                        {session.difficulty}
                      </Badge>
                      {session.isCompleted ? (
                        <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-0 text-xs flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          In Progress ({session.answeredQuestions}/{session.totalQuestions})
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(session.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span>{session.totalQuestions} Questions</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {session.overallScore !== null && (
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block">Score</span>
                        <span className="text-base font-bold text-primary">
                          {session.overallScore}/10
                        </span>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => {
                        setHistoryOpen(false);
                        router.push(`/coach/session?sessionId=${session.id}`);
                      }}
                    >
                      {session.isCompleted ? "Review" : "Resume"} <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive h-8 w-8"
                      onClick={(e) => handleDeleteSession(session.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
