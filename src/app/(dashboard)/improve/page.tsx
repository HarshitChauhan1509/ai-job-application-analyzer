"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  Sparkles,
  Check,
  Copy,
  RotateCcw,
  Wand2,
  Building,
  FileText,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Bookmark,
  Trash2,
  ChevronRight,
  Layers,
  ArrowRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  getResumesAndJobsForImproverAction,
  improveBulletMultiAction,
  analyzeBulletStrengthAction,
  CuratedSampleBullet,
} from "@/app/actions/resume-improver";
import { ImprovementAction, BulletVariation, BulletAnalysis } from "@/lib/ai/resume-improver";

interface SavedBulletItem {
  id: string;
  text: string;
  styleLabel: string;
  score: number;
  savedAt: string;
}

export default function ImproveResumePage() {
  const [original, setOriginal] = useState(
    "Worked on a billing system and updated the database to make it faster for users."
  );
  const [selectedAction, setSelectedAction] = useState<ImprovementAction>("ADD_IMPACT");
  const [selectedJobId, setSelectedJobId] = useState<string>("none");
  const [activeTab, setActiveTab] = useState<"samples" | "resumes">("samples");

  // Loaded data
  const [resumes, setResumes] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [samples, setSamples] = useState<CuratedSampleBullet[]>([]);
  const [powerVerbs, setPowerVerbs] = useState<{ category: string; verbs: string[] }[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Improvement output state
  const [isImproving, setIsImproving] = useState(false);
  const [variations, setVariations] = useState<BulletVariation[]>([]);
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Real-time analysis of the input bullet
  const [inputAnalysis, setInputAnalysis] = useState<BulletAnalysis | null>(null);

  // Saved bullets collection (stored in localStorage for fast retrieval)
  const [savedBullets, setSavedBullets] = useState<SavedBulletItem[]>([]);
  const [showSavedModal, setShowSavedModal] = useState(false);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const res = await getResumesAndJobsForImproverAction();
        if (res.success) {
          setResumes(res.resumes || []);
          setJobs(res.jobs || []);
          setSamples(res.samples || []);
          setPowerVerbs(res.powerVerbs || []);
        }
      } catch (e) {
        console.error("Failed to load improver data:", e);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();

    // Load saved bullets from localStorage if available
    try {
      const stored = localStorage.getItem("careerpilot_saved_bullets");
      if (stored) {
        setSavedBullets(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Real-time linting on input change
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (original.trim().length > 3) {
        const res = await analyzeBulletStrengthAction(original);
        if (active && res.success) {
          setInputAnalysis(res.analysis);
        }
      } else {
        setInputAnalysis(null);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [original]);

  // Execute AI Improvement
  const handleImprove = async (actionToUse: ImprovementAction = selectedAction) => {
    if (!original.trim()) return;

    setSelectedAction(actionToUse);
    setIsImproving(true);
    setVariations([]);

    try {
      const res = await improveBulletMultiAction({
        originalBullet: original,
        action: actionToUse,
        jobId: selectedJobId !== "none" ? selectedJobId : undefined,
      });

      if (res.success && res.data) {
        setVariations(res.data.variations);
        if (res.data.variations.length > 0) {
          setSelectedVariationId(res.data.variations[0].id);
        }
      }
    } catch (err) {
      console.error("Improvement generation error:", err);
    } finally {
      setIsImproving(false);
    }
  };

  // Replace opening verb with power verb
  const handleApplyPowerVerb = (verb: string) => {
    const clean = original.trim().replace(/^[-*•]\s*/, "");
    // If starts with weak phrasing or any word ending in ed/ing
    const stripped = clean.replace(
      /^(?:responsible for|worked on|helped with|helped to|assisted in|assisted with|[a-z]+ed|[a-z]+ing)\s+/i,
      ""
    );
    setOriginal(`${verb} ${stripped}`);
  };

  // Copy to clipboard
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Save improved bullet
  const handleSaveBullet = (item: BulletVariation) => {
    const newItem: SavedBulletItem = {
      id: `b-${Date.now()}`,
      text: item.improved,
      styleLabel: item.styleLabel,
      score: item.score,
      savedAt: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    };

    const updated = [newItem, ...savedBullets.filter((b) => b.text !== item.improved)];
    setSavedBullets(updated);
    try {
      localStorage.setItem("careerpilot_saved_bullets", JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const handleDeleteSaved = (id: string) => {
    const updated = savedBullets.filter((b) => b.id !== id);
    setSavedBullets(updated);
    try {
      localStorage.setItem("careerpilot_saved_bullets", JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  // Formula & Enhancement Modes
  const actionOptions: { id: ImprovementAction; label: string; desc: string; icon: string }[] = [
    {
      id: "ADD_IMPACT",
      label: "Google X-Y-Z Formula",
      desc: "Accomplished [X] as measured by [Y], by doing [Z]",
      icon: "📈",
    },
    {
      id: "MORE_TECHNICAL",
      label: "Architectural & Scale",
      desc: "Emphasize tools, async pipelines, and resilience",
      icon: "⚙️",
    },
    {
      id: "MAKE_CONCISE",
      label: "Concise & High-Impact",
      desc: "Eliminate filler words and maximize readability",
      icon: "✂️",
    },
    {
      id: "TAILOR_TO_JOB",
      label: "Tailor to Target Job",
      desc: "Inject relevant ATS keywords and position requirements",
      icon: "🎯",
    },
    {
      id: "LEADERSHIP",
      label: "Leadership & Ownership",
      desc: "Highlight team mentorship and sprint delivery",
      icon: "👑",
    },
  ];

  const activeVariation =
    variations.find((v) => v.id === selectedVariationId) || variations[0];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/resumes">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-bold tracking-tight">AI Resume Improver</h1>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
                <Sparkles className="h-3 w-3 mr-1" /> Multi-Formula Engine
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              Transform passive bullet points into high-impact, metric-driven achievements built for top recruiters.
            </p>
          </div>
        </div>

        {savedBullets.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setShowSavedModal(!showSavedModal)}
            className="gap-2 shrink-0 text-xs sm:text-sm"
          >
            <Bookmark className="h-4 w-4 text-primary" /> Saved Bullets ({savedBullets.length})
          </Button>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Input, Source Selector, Real-time Analysis, and Action Buttons */}
        <div className="lg:col-span-7 space-y-6">
          {/* Bullet Source Selector */}
          <Card className="border-border">
            <CardHeader className="p-4 pb-2 border-b border-border bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" /> Select Source Bullet
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Or pick a sample:</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-3">
              <Tabs
                value={activeTab}
                onValueChange={(val) => setActiveTab(val as any)}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2 mb-3 h-8">
                  <TabsTrigger value="samples" className="text-xs">
                    Curated Role Samples ({samples.length})
                  </TabsTrigger>
                  <TabsTrigger value="resumes" className="text-xs">
                    From My Resumes ({resumes.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="samples" className="space-y-2 mt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {samples.slice(0, 4).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setOriginal(s.bullet);
                          setVariations([]);
                        }}
                        className={`text-left p-2.5 rounded-md border text-xs transition-all hover:border-primary/40 hover:bg-muted/40 ${
                          original === s.bullet
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "border-border bg-card"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-foreground">{s.role}</span>
                          <span className="text-muted-foreground text-[10px]">{s.category}</span>
                        </div>
                        <p className="line-clamp-2 text-muted-foreground">{s.bullet}</p>
                      </button>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="resumes" className="mt-0 space-y-2">
                  {resumes.length === 0 ? (
                    <div className="p-4 rounded-md border border-dashed text-center text-xs text-muted-foreground">
                      No resumes uploaded yet. You can paste any bullet point below directly!
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground mb-1">
                        Select an uploaded resume to load its profile:
                      </p>
                      {resumes.map((r) => (
                        <div
                          key={r.id}
                          onClick={() => {
                            // If recommendations or strengths exist, load one
                            if (r.analysis?.recommendations) {
                              try {
                                const recs = JSON.parse(r.analysis.recommendations);
                                if (recs[0]) setOriginal(recs[0]);
                              } catch {
                                // ignore
                              }
                            }
                          }}
                          className="flex items-center justify-between p-2 rounded-md border border-border hover:border-primary/30 text-xs cursor-pointer"
                        >
                          <span className="font-medium flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-primary" /> {r.name}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            ATS: {r.analysis?.overallScore || 85}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Original Bullet Point Textarea Card */}
          <Card className="border-primary/20 shadow-xs relative overflow-hidden">
            <CardHeader className="bg-muted/20 pb-3 border-b border-border flex flex-row items-center justify-between">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Original Bullet Point
              </CardTitle>
              {inputAnalysis && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {inputAnalysis.wordCount} words
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-xs font-bold ${
                      inputAnalysis.overallScore >= 75
                        ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"
                        : inputAnalysis.overallScore >= 50
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                        : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30"
                    }`}
                  >
                    Strength: {inputAnalysis.overallScore}/100
                  </Badge>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <textarea
                className="w-full min-h-[130px] p-4 bg-transparent border-0 focus:ring-0 resize-none text-sm sm:text-base leading-relaxed placeholder:text-muted-foreground/60"
                value={original}
                onChange={(e) => setOriginal(e.target.value)}
                placeholder="Paste or type a resume bullet point here to enhance..."
                disabled={isImproving}
              />
            </CardContent>

            {/* Real-time Health Diagnostics */}
            {inputAnalysis && (
              <div className="px-4 py-3 bg-muted/30 border-t border-border flex flex-wrap items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  {inputAnalysis.hasStrongVerb ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  {inputAnalysis.hasStrongVerb ? "Power Action Verb" : "Weak Opening Verb"}
                </span>

                <span className="flex items-center gap-1">
                  {inputAnalysis.hasMetrics ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  {inputAnalysis.hasMetrics ? "Quantified Metrics" : "No Metrics Detected"}
                </span>

                <span className="flex items-center gap-1">
                  {inputAnalysis.wordCount >= 14 && inputAnalysis.wordCount <= 32 ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  Optimal Length (14-30w)
                </span>
              </div>
            )}

            {/* Quick Action Verb Swapper */}
            <div className="px-4 py-2.5 bg-muted/10 border-t border-border/60">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Quick Power Verbs:
                </span>
                <span className="text-[10px] text-muted-foreground">Click to replace opening word</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Architected",
                  "Spearheaded",
                  "Engineered",
                  "Accelerated",
                  "Automated",
                  "Orchestrated",
                  "Consolidated",
                  "Pioneered",
                ].map((verb) => (
                  <button
                    key={verb}
                    type="button"
                    onClick={() => handleApplyPowerVerb(verb)}
                    className="text-xs px-2 py-0.5 rounded-md border border-border bg-background hover:bg-primary/10 hover:border-primary/40 text-foreground transition-colors"
                  >
                    + {verb}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Target Job Tailoring Dropdown */}
          {jobs.length > 0 && (
            <div className="p-3.5 rounded-lg bg-card border border-border space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Building className="h-3.5 w-3.5 text-primary" /> Target Saved Job (Optional Alignment)
                </label>
                <span className="text-[11px] text-muted-foreground">Aligns ATS keywords</span>
              </div>
              <Select value={selectedJobId} onValueChange={(val) => setSelectedJobId(val || "none")}>
                <SelectTrigger className="bg-background text-xs h-9">
                  <SelectValue placeholder="Select a job to tailor this bullet point..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None — General Industry Standards</SelectItem>
                  {jobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.position} at {j.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Enhancement Formula Mode Selection */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select Enhancement Formula
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {actionOptions.map((act) => {
                const isSelected = selectedAction === act.id;
                return (
                  <Button
                    key={act.id}
                    type="button"
                    variant="outline"
                    onClick={() => handleImprove(act.id)}
                    disabled={isImproving || !original.trim()}
                    className={`justify-start h-auto p-3 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-base leading-none mt-0.5">{act.icon}</span>
                      <div className="space-y-0.5">
                        <span className="font-semibold text-xs block text-foreground">
                          {act.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground line-clamp-1 block">
                          {act.desc}
                        </span>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: AI Generated Multi-Variations Output */}
        <div className="lg:col-span-5 space-y-6">
          <AnimatePresence mode="wait">
            {variations.length === 0 && !isImproving ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full min-h-[380px] border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center p-8 text-center bg-muted/10"
              >
                <div className="bg-primary/10 p-4 rounded-full mb-3 text-primary">
                  <Sparkles className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-base mb-1">Ready to Enhance</h3>
                <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed mb-4">
                  Select an improvement formula on the left to generate 3 multi-style variations with quantifiable impact and ATS scores.
                </p>
                <Button
                  onClick={() => handleImprove("ADD_IMPACT")}
                  disabled={!original.trim()}
                  size="sm"
                  className="gap-2 shadow-xs"
                >
                  <Wand2 className="h-3.5 w-3.5" /> Generate 3 Variations
                </Button>
              </motion.div>
            ) : isImproving ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full min-h-[380px] border border-primary/20 rounded-xl flex flex-col items-center justify-center p-8 text-center bg-card shadow-xs"
              >
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
                <h4 className="font-semibold text-base">Rewriting with Google X-Y-Z Formula...</h4>
                <p className="text-xs text-muted-foreground max-w-xs mt-1">
                  Injecting quantifiable metrics, power verbs, and architectural depth across 3 distinct angles.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Generated Variations ({variations.length})
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleImprove()}
                    disabled={isImproving}
                    className="h-7 text-xs gap-1 text-muted-foreground"
                  >
                    <RotateCcw className="h-3 w-3" /> Regenerate
                  </Button>
                </div>

                {/* Variation Selection Tabs */}
                <div className="flex flex-col gap-3">
                  {variations.map((v, index) => {
                    const isSelected = selectedVariationId === v.id;
                    const isCopied = copiedId === v.id;

                    return (
                      <Card
                        key={v.id}
                        onClick={() => setSelectedVariationId(v.id)}
                        className={`cursor-pointer transition-all border ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40"
                            : "border-border hover:border-primary/40 bg-card"
                        }`}
                      >
                        <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between border-b border-border/50">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="text-[11px] font-semibold bg-background"
                            >
                              Option {index + 1}: {v.styleLabel}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-xs font-bold text-primary">
                            <TrendingUp className="h-3.5 w-3.5" />
                            <span>{v.score}/100</span>
                          </div>
                        </CardHeader>

                        <CardContent className="p-4 space-y-3">
                          <p className="text-sm font-medium leading-relaxed text-foreground">
                            {v.improved}
                          </p>

                          <div className="p-2.5 rounded-md bg-muted/40 text-xs text-muted-foreground border border-border/40">
                            <span className="font-semibold text-foreground block mb-0.5">
                              Why this stands out:
                            </span>
                            {v.explanation}
                          </div>
                        </CardContent>

                        <CardFooter className="p-3 pt-0 flex items-center justify-between gap-2 border-t border-border/40 bg-muted/10">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOriginal(v.improved);
                            }}
                            className="text-xs h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                          >
                            <ArrowRight className="h-3.5 w-3.5" /> Use as Input
                          </Button>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveBullet(v);
                              }}
                              className="text-xs h-8 gap-1"
                            >
                              <Bookmark className="h-3.5 w-3.5" /> Save
                            </Button>

                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(v.improved, v.id);
                              }}
                              className="text-xs h-8 gap-1.5 shadow-2xs"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-green-400" /> Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5" /> Copy Bullet
                                </>
                              )}
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Saved Bullets Quick Drawer */}
          {savedBullets.length > 0 && showSavedModal && (
            <Card className="border-primary/20 shadow-sm mt-6">
              <CardHeader className="p-4 pb-2 border-b border-border flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <Bookmark className="h-4 w-4 text-primary" /> Saved Polished Bullets
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Your collection of enhanced achievements ready to insert into your resume.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => {
                    const allText = savedBullets.map((b) => `• ${b.text}`).join("\n");
                    handleCopy(allText, "all-saved");
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" /> Copy All
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5 max-h-[300px] overflow-y-auto">
                {savedBullets.map((sb) => (
                  <div
                    key={sb.id}
                    className="p-3 rounded-lg border border-border bg-muted/20 text-xs space-y-2 flex flex-col justify-between"
                  >
                    <p className="text-foreground leading-relaxed font-medium">{sb.text}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-border/40">
                      <Badge variant="outline" className="text-[10px]">
                        {sb.styleLabel} • {sb.score}/100
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => handleCopy(sb.text, sb.id)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteSaved(sb.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
