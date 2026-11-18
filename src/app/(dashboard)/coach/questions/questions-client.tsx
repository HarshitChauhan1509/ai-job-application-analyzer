"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Mic,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowLeft,
  Building,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Clock,
  Layers,
  Flame,
  Loader2,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { QuestionBankItem } from "@/lib/interview-questions-bank";
import { startSessionFromQuestionAction, QuestionBankSummary } from "@/app/actions/questions-bank";
import { LowCreditsModal } from "@/components/credits/low-credits-modal";

interface QuestionsClientProps {
  initialData: QuestionBankSummary;
}

export function QuestionsClient({ initialData }: QuestionsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("ALL");

  const [expandedRubrics, setExpandedRubrics] = useState<Record<string, boolean>>({});
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [startingSessionId, setStartingSessionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lowCreditsOpen, setLowCreditsOpen] = useState(false);

  // Client-side filtering for instantaneous reactivity
  const filteredQuestions: QuestionBankItem[] = initialData.questions.filter((q: QuestionBankItem) => {
    if (selectedCompany !== "ALL" && q.company.toLowerCase() !== selectedCompany.toLowerCase()) {
      return false;
    }
    if (selectedCategory !== "ALL" && q.category.toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }
    if (selectedDifficulty !== "ALL" && q.difficulty.toLowerCase() !== selectedDifficulty.toLowerCase()) {
      return false;
    }
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      const matchesText =
        q.question.toLowerCase().includes(query) ||
        q.company.toLowerCase().includes(query) ||
        q.role.toLowerCase().includes(query) ||
        q.context.toLowerCase().includes(query) ||
        q.tags.some((t: string) => t.toLowerCase().includes(query));
      if (!matchesText) return false;
    }
    return true;
  });

  const toggleRubric = (id: string) => {
    setExpandedRubrics((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAnswer = (id: string) => {
    setExpandedAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyQuestion = (q: QuestionBankItem) => {
    const text = `[${q.company} - ${q.role}] ${q.question}\n\nCategory: ${q.category} (${q.difficulty})\n\nContext:\n${q.context}`;
    navigator.clipboard.writeText(text);
    setCopiedId(q.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handlePracticeWithVoiceCoach = (questionId: string) => {
    setStartingSessionId(questionId);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const res = await startSessionFromQuestionAction(questionId);
        if (res.success && res.sessionId) {
          router.push(`/coach/session?sessionId=${res.sessionId}`);
        } else {
          if (res.insufficientCredits) {
            setLowCreditsOpen(true);
          } else {
            setErrorMessage(res.error || "Failed to initialize practice session");
          }
          setStartingSessionId(null);
        }
      } catch (err) {
        console.error("Practice session launch error:", err);
        setErrorMessage("An unexpected error occurred while launching Voice Coach");
        setStartingSessionId(null);
      }
    });
  };

  const allCompanies = ["ALL", ...initialData.companies.map((c: { name: string; count: number }) => c.name)];
  const allCategories = [
    "ALL",
    "System Design",
    "Distributed Systems",
    "Frontend & Architecture",
    "Behavioral & Leadership",
    "AI & Data Engineering",
  ];
  const allDifficulties = ["ALL", "Junior", "Mid", "Senior", "Staff"];

  const getCompanyColorClasses = (company: string) => {
    switch (company.toLowerCase()) {
      case "stripe":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
      case "linear":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "supabase":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "vercel":
        return "bg-sky-500/10 text-sky-400 border-sky-500/30";
      case "posthog":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "resend":
        return "bg-pink-500/10 text-pink-400 border-pink-500/30";
      case "openai":
        return "bg-teal-500/10 text-teal-400 border-teal-500/30";
      case "yc startups":
        return "bg-orange-500/10 text-orange-400 border-orange-500/30";
      default:
        return "bg-primary/10 text-primary border-primary/30";
    }
  };

  return (
    <div className="flex-1 space-y-8 p-6 md:p-8 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link
              href="/coach"
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors group"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Interview Coach</span>
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Company Question Bank</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <BookOpen size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Company Interview Question Bank</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Real-world technical & behavioral interview questions asked at Stripe, Linear, Supabase, Vercel, and YC startups.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 text-xs gap-1.5 border-primary/30 bg-primary/5 text-primary">
            <Sparkles size={12} />
            <span>1-Click Voice Coach Integration</span>
          </Badge>
          <Link href="/coach">
            <Button variant="outline" size="sm" className="gap-2">
              <Mic size={14} />
              Custom Mock Session
            </Button>
          </Link>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-center gap-3">
          <AlertTriangle size={18} className="shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <Button variant="ghost" size="sm" onClick={() => setErrorMessage(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="space-y-4 bg-card/60 backdrop-blur-sm border border-border/80 p-5 rounded-2xl shadow-sm">
        {/* Search Bar */}
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions, companies, frameworks, or concepts (e.g., 'Idempotency', 'Linear', 'Kafka', 'STAR')..."
            className="pl-10 pr-4 h-11 bg-background/80 text-sm rounded-xl border-border/80 focus-visible:ring-primary/30"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground bg-muted px-2 py-0.5 rounded-md"
            >
              Clear
            </button>
          )}
        </div>

        {/* Company Filter Pills */}
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
            <Building size={12} />
            <span>Target Company</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allCompanies.map((comp) => {
              const isSelected = selectedCompany.toLowerCase() === comp.toLowerCase();
              return (
                <button
                  key={comp}
                  onClick={() => setSelectedCompany(comp)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm scale-102"
                      : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {comp === "ALL" ? `All Companies (${initialData.totalCount})` : comp}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category & Difficulty Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/50">
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <Layers size={12} />
              <span>Domain / Category</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allCategories.map((cat) => {
                const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                      isSelected
                        ? "bg-secondary text-secondary-foreground font-semibold border border-primary/30"
                        : "bg-background/80 text-muted-foreground hover:text-foreground border border-border/60"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <Flame size={12} />
              <span>Seniority Bar</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allDifficulties.map((diff) => {
                const isSelected = selectedDifficulty.toLowerCase() === diff.toLowerCase();
                return (
                  <button
                    key={diff}
                    onClick={() => setSelectedDifficulty(diff)}
                    className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                      isSelected
                        ? "bg-secondary text-secondary-foreground font-semibold border border-primary/30"
                        : "bg-background/80 text-muted-foreground hover:text-foreground border border-border/60"
                    }`}
                  >
                    {diff}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Results Count Summary */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Showing <strong className="text-foreground">{filteredQuestions.length}</strong> of{" "}
          <strong className="text-foreground">{initialData.totalCount}</strong> curated questions
        </span>
        {(selectedCompany !== "ALL" || selectedCategory !== "ALL" || selectedDifficulty !== "ALL" || search) && (
          <button
            onClick={() => {
              setSelectedCompany("ALL");
              setSelectedCategory("ALL");
              setSelectedDifficulty("ALL");
              setSearch("");
            }}
            className="text-primary hover:underline font-medium"
          >
            Reset all filters
          </button>
        )}
      </div>

      {/* Question Cards Grid */}
      {filteredQuestions.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card/40 space-y-3">
          <BookOpen className="mx-auto text-muted-foreground/60" size={36} />
          <h3 className="text-base font-semibold">No interview questions matched your filters</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Try adjusting your search keywords, clearing company selections, or broadening the seniority level.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedCompany("ALL");
              setSelectedCategory("ALL");
              setSelectedDifficulty("ALL");
              setSearch("");
            }}
          >
            Clear All Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredQuestions.map((q: QuestionBankItem) => {
            const isRubricExpanded = !!expandedRubrics[q.id];
            const isAnswerExpanded = !!expandedAnswers[q.id];
            const isCopied = copiedId === q.id;
            const isStarting = startingSessionId === q.id && isPending;

            return (
              <Card
                key={q.id}
                className="overflow-hidden border border-border/80 hover:border-primary/40 transition-all bg-card/90 shadow-sm hover:shadow-md"
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={`font-semibold px-2.5 py-0.5 text-xs ${getCompanyColorClasses(q.company)}`}>
                        {q.company}
                      </Badge>
                      <Badge variant="secondary" className="text-xs px-2 py-0.5">
                        {q.companyTier}
                      </Badge>
                      <Badge variant="outline" className="text-xs border-border/60 text-muted-foreground">
                        {q.category}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          q.difficulty === "Staff"
                            ? "border-red-500/40 text-red-400 bg-red-500/5"
                            : q.difficulty === "Senior"
                            ? "border-amber-500/40 text-amber-400 bg-amber-500/5"
                            : "border-blue-500/40 text-blue-400 bg-blue-500/5"
                        }`}
                      >
                        {q.difficulty}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock size={13} />
                      <span>~{q.estimatedMinutes} min practice</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Target Role: <span className="text-foreground font-semibold">{q.role}</span>
                    </div>
                    <CardTitle className="text-lg md:text-xl font-bold tracking-tight text-foreground leading-snug">
                      &ldquo;{q.question}&rdquo;
                    </CardTitle>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-1 space-y-4">
                  {/* Context Banner */}
                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground leading-relaxed flex items-start gap-2.5">
                    <Sparkles size={16} className="text-primary shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground font-semibold">Why {q.company} asks this: </strong>
                      {q.context}
                    </div>
                  </div>

                  {/* Expandable Key Evaluation Rubric */}
                  <div className="border border-border/60 rounded-xl overflow-hidden bg-background/50">
                    <button
                      onClick={() => toggleRubric(q.id)}
                      className="w-full flex items-center justify-between p-3.5 text-xs font-semibold text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <span>Key Evaluation Rubric & What Interviewers Look For ({q.keyRubrics.length} signals)</span>
                      </span>
                      {isRubricExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>

                    {isRubricExpanded && (
                      <div className="p-4 pt-1 border-t border-border/50 bg-muted/10 space-y-2 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground mb-1.5">
                          High-scoring answers clearly demonstrate knowledge of:
                        </p>
                        <ul className="space-y-1.5 pl-1">
                          {q.keyRubrics.map((rubric: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-emerald-500 font-bold shrink-0">✓</span>
                              <span className="leading-relaxed">{rubric}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Expandable Model Answer & Pitfalls */}
                  <div className="border border-border/60 rounded-xl overflow-hidden bg-background/50">
                    <button
                      onClick={() => toggleAnswer(q.id)}
                      className="w-full flex items-center justify-between p-3.5 text-xs font-semibold text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Flame size={14} className="text-amber-500" />
                        <span>Staff Engineer Model Answer Outline & Common Pitfalls</span>
                      </span>
                      {isAnswerExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>

                    {isAnswerExpanded && (
                      <div className="p-4 pt-2 border-t border-border/50 bg-muted/10 space-y-3.5 text-xs">
                        <div>
                          <div className="font-semibold text-foreground mb-1 text-xs">
                            💡 High-Signal Model Answer Blueprint:
                          </div>
                          <p className="text-muted-foreground leading-relaxed bg-background/80 p-3 rounded-lg border border-border/60">
                            {q.modelAnswerSummary}
                          </p>
                        </div>

                        <div>
                          <div className="font-semibold text-destructive mb-1 text-xs flex items-center gap-1.5">
                            <AlertTriangle size={13} />
                            <span>Common Candidate Pitfalls & Red Flags:</span>
                          </div>
                          <ul className="space-y-1 pl-1 text-muted-foreground">
                            {q.commonPitfalls.map((pitfall: string, pIdx: number) => (
                              <li key={pIdx} className="flex items-start gap-2">
                                <span className="text-destructive font-bold shrink-0">✗</span>
                                <span>{pitfall}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {q.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md text-[11px] bg-muted/60 text-muted-foreground font-mono"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </CardContent>

                <CardFooter className="p-5 pt-0 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 mt-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-[11px] font-mono">
                      Targeted Sprint • 5 Credits
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyQuestion(q)}
                      className="gap-1.5 text-xs h-9"
                    >
                      {isCopied ? (
                        <>
                          <Check size={14} className="text-emerald-500" />
                          <span className="text-emerald-500">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copy Prompt</span>
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handlePracticeWithVoiceCoach(q.id)}
                      disabled={isStarting}
                      className="gap-2 text-xs font-semibold h-9 shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {isStarting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Launching Session...</span>
                        </>
                      ) : (
                        <>
                          <Mic size={14} />
                          <span>Practice with Voice Coach</span>
                        </>
                      )}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Low Credits Modal */}
      <LowCreditsModal
        open={lowCreditsOpen}
        onOpenChange={setLowCreditsOpen}
        requiredCredits={5}
        actionName="Targeted Company Interview Practice"
      />
    </div>
  );
}
