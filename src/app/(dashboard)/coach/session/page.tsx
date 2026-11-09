"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Mic,
  Square,
  Check,
  MessageSquare,
  Target,
  Lightbulb,
  Volume2,
  VolumeX,
  AlertCircle,
  Sparkles,
  Trophy,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Loader2,
  CheckCircle2,
  Printer,
  Copy,
  CheckCheck,
  Briefcase,
  ExternalLink,
  BookmarkCheck,
  TrendingUp,
  BarChart3,
  Award,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  getInterviewSessionAction,
  submitInterviewAnswerAction,
  createInterviewSessionAction,
  getUserApplicationsForInterviewAction,
  logInterviewToApplicationTimelineAction,
} from "@/app/actions/interview";
import { AudioWaveformVisualizer } from "@/components/coach/audio-waveform-visualizer";
import { SpeechDeliveryTracker } from "@/components/coach/speech-delivery-tracker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface EvaluationScores {
  overall: number;
  technical: number;
  communication: number;
  specificity: number;
}

interface QuestionEvaluation {
  scores: EvaluationScores;
  strengths: string[];
  weaknesses: string[];
  missingConcepts: string[];
  idealStructure: string;
  modelAnswer?: string | null;
  followUpQuestion?: string | null;
}

interface QuestionItem {
  id: string;
  question: string;
  category: string;
  orderIndex: number;
  answer?: {
    id: string;
    answer: string;
    score: number | null;
    feedback: string | null;
  } | null;
  evaluation?: QuestionEvaluation | null;
}

interface SessionData {
  id: string;
  role: string;
  difficulty: string;
  overallScore: number | null;
  feedback?: string | null;
  completedAt?: Date | string | null;
  questions: QuestionItem[];
}

function SessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const fallbackRole = searchParams.get("role") || "Full Stack Developer";
  const fallbackDiff = searchParams.get("diff") || "Intermediate";

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoReadQuestions, setAutoReadQuestions] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [micUnsupported, setMicUnsupported] = useState(false);

  // Completion view state
  const [showSummary, setShowSummary] = useState(false);

  // Pipeline Logging & Benchmark Copy State
  const [applications, setApplications] = useState<
    Array<{ id: string; company: string; position: string; status: string }>
  >([]);
  const [selectedAppId, setSelectedAppId] = useState<string>("");
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [loggedToCompany, setLoggedToCompany] = useState<string | null>(null);
  const [copiedQuestionId, setCopiedQuestionId] = useState<string | null>(null);

  // Fetch active user applications for pipeline logging when summary opens
  useEffect(() => {
    if (showSummary && applications.length === 0) {
      getUserApplicationsForInterviewAction().then((res) => {
        if (res.success && res.applications) {
          setApplications(res.applications);
          if (res.applications.length > 0) {
            setSelectedAppId(res.applications[0].id);
          }
        }
      });
    }
  }, [showSummary, applications.length]);

  const handleLogToApplication = async () => {
    if (!session || !selectedAppId) return;
    setIsLogging(true);
    try {
      const res = await logInterviewToApplicationTimelineAction({
        sessionId: session.id,
        applicationId: selectedAppId,
      });

      if (res.success) {
        const app = applications.find((a) => a.id === selectedAppId);
        setLoggedToCompany(app?.company || "Application");
        setIsLogModalOpen(false);
      } else {
        alert(res.error || "Failed to log practice session");
      }
    } catch (e) {
      console.error("Error logging to pipeline:", e);
      alert("Error logging session to application pipeline.");
    } finally {
      setIsLogging(false);
    }
  };

  const handleCopyModelAnswer = (text: string, qId: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedQuestionId(qId);
      setTimeout(() => setCopiedQuestionId(null), 2500);
    }
  };

  // Recognition ref
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch or initialize session
  useEffect(() => {
    let isMounted = true;

    async function init() {
      setLoading(true);
      setError(null);

      try {
        if (sessionId) {
          const res = await getInterviewSessionAction(sessionId);
          if (res.success && res.session) {
            if (isMounted) {
              setSession(res.session as any);
              // Find first unanswered question or default to 0
              const firstUnanswered = res.session.questions.findIndex((q: any) => !q.answer);
              const initialIndex = firstUnanswered !== -1 ? firstUnanswered : 0;
              setCurrentQIndex(initialIndex);

              const q = res.session.questions[initialIndex];
              if (q?.answer) {
                setAnswer(q.answer.answer || "");
              }

              // If already all answered, allow viewing summary
              const allAnswered = res.session.questions.every((q: any) => !!q.answer);
              if (allAnswered && res.session.questions.length > 0) {
                setShowSummary(true);
              }
            }
            return;
          }
        }

        // Fallback: If no sessionId, create one on the fly with query params
        const createRes = await createInterviewSessionAction({
          role: fallbackRole,
          difficulty: fallbackDiff,
          numQuestions: 3,
          categories: ["System Design", "Behavioral", "Technical"],
        });

        if (createRes.success && createRes.sessionId) {
          router.replace(`/coach/session?sessionId=${createRes.sessionId}`);
        } else {
          if (isMounted) setError(createRes.error || "Failed to load practice session");
        }
      } catch (err) {
        console.error("Session load error:", err);
        if (isMounted) setError("Failed to initialize interview session");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    init();

    return () => {
      isMounted = false;
      stopAudio();
      stopRecording();
    };
  }, [sessionId, fallbackRole, fallbackDiff, router]);

  // Sync answer state when moving between questions
  const currentQuestion = session?.questions[currentQIndex];

  useEffect(() => {
    if (currentQuestion) {
      setAnswer(currentQuestion.answer?.answer || "");
      stopAudio();
      if (autoReadQuestions && !currentQuestion.answer) {
        const timer = setTimeout(() => {
          toggleReadAloud();
        }, 400);
        return () => clearTimeout(timer);
      }
    }
  }, [currentQIndex, currentQuestion, autoReadQuestions]);

  // Speech Recognition (Dictation) Setup
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicUnsupported(true);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      let initialText = answer;

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setAnswer(initialText + (initialText && !initialText.endsWith(" ") ? " " : "") + transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        stopRecording();
      };

      recognition.onend = () => {
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (e) {
      console.warn("Speech recognition initialization error:", e);
      setMicUnsupported(true);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop error
      }
      recognitionRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  // Text-To-Speech (Read Aloud with Natural Voice)
  const toggleReadAloud = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (isSpeaking) {
      stopAudio();
      return;
    }

    if (!currentQuestion) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentQuestion.question);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const englishVoice =
      voices.find(
        (v) =>
          (v.name.includes("Google") ||
            v.name.includes("Natural") ||
            v.name.includes("Samantha") ||
            v.name.includes("Daniel") ||
            v.name.includes("Guy")) &&
          v.lang.startsWith("en")
      ) || voices.find((v) => v.lang.startsWith("en"));

    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const stopAudio = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Submit Answer Action
  const handleSubmit = async () => {
    if (!session || !currentQuestion || answer.trim().length < 5) return;

    stopRecording();
    stopAudio();
    setIsEvaluating(true);

    try {
      const res = await submitInterviewAnswerAction({
        sessionId: session.id,
        questionId: currentQuestion.id,
        answerText: answer.trim(),
      });

      if (res.success && res.evaluation) {
        // Update local session question evaluation
        setSession((prev) => {
          if (!prev) return null;
          const updatedQuestions = [...prev.questions];
          updatedQuestions[currentQIndex] = {
            ...updatedQuestions[currentQIndex],
            answer: {
              id: "temp-ans",
              answer: answer.trim(),
              score: res.evaluation.scores.overall,
              feedback: JSON.stringify(res.evaluation),
            },
            evaluation: res.evaluation,
          };
          return {
            ...prev,
            overallScore: res.sessionScore ?? prev.overallScore,
            questions: updatedQuestions,
          };
        });

        if (res.isCompleted) {
          // If this was the last question, we don't immediately force summary, but user can click Finish
        }
      } else {
        alert(res.error || "Failed to evaluate answer");
      }
    } catch (err) {
      console.error("Evaluation error:", err);
      alert("Error evaluating response. Please try again.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleNext = () => {
    if (!session) return;
    if (currentQIndex < session.questions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
    } else {
      setShowSummary(true);
    }
  };

  const handlePrev = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex((prev) => prev - 1);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div className="text-center">
          <p className="font-semibold text-lg">Initializing Interview Coach...</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Loading tailored questions and setting up real-time AI scoring.
          </p>
        </div>
      </div>
    );
  }

  if (error || !session || !currentQuestion) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-2xl font-bold">Session Not Available</h2>
        <p className="text-muted-foreground">{error || "Could not find or load the requested interview session."}</p>
        <Link href="/coach">
          <Button className="mt-4 gap-2">
            <ArrowLeft className="h-4 w-4" /> Return to Interview Coach
          </Button>
        </Link>
      </div>
    );
  }

  const evaluation = currentQuestion.evaluation;
  const isAnswered = !!currentQuestion.answer;
  const totalQuestions = session.questions.length;
  const answeredCount = session.questions.filter((q) => !!q.answer).length;

  // Session Summary Screen
  if (showSummary) {
    const answeredList = session.questions.filter((q) => !!q.answer && !!q.evaluation);
    const count = answeredList.length || 1;

    const avgScore =
      session.overallScore ??
      (answeredCount > 0
        ? Math.round(
            (session.questions.reduce((acc, q) => acc + (q.evaluation?.scores.overall ?? 7), 0) /
              answeredCount) *
              10
          ) / 10
        : 7.5);

    const avgTechnical =
      Math.round(
        (answeredList.reduce((acc, q) => acc + (q.evaluation?.scores.technical ?? 7), 0) / count) *
          10
      ) / 10;

    const avgCommunication =
      Math.round(
        (answeredList.reduce((acc, q) => acc + (q.evaluation?.scores.communication ?? 7), 0) / count) *
          10
      ) / 10;

    const avgSpecificity =
      Math.round(
        (answeredList.reduce((acc, q) => acc + (q.evaluation?.scores.specificity ?? 7), 0) / count) *
          10
      ) / 10;

    // Diagnostic recommendation based on weakest dimension
    let coachingInsight = "";
    if (avgSpecificity <= avgTechnical && avgSpecificity <= avgCommunication) {
      coachingInsight =
        "Recommendation: Elevate specificity. Quantify your engineering outcomes with concrete metrics (latency reduced by %, team size, DAU volume) rather than purely abstract claims.";
    } else if (avgCommunication <= avgTechnical) {
      coachingInsight =
        "Recommendation: Structure responses using the STAR method (Situation, Task, Action, Result). State the core constraints upfront and articulate trade-offs concisely.";
    } else {
      coachingInsight =
        "Recommendation: Deepen technical precision. Highlight architectural trade-offs, caching invalidation strategies, database indexing, and fault tolerance.";
    }

    const hiringBar =
      avgScore >= 8.5
        ? {
            label: "Hiring Bar Cleared",
            desc: "Exceptional depth, structure, and communication. Ready for Staff/Senior panels.",
            badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          }
        : avgScore >= 7.0
        ? {
            label: "Strong Candidate",
            desc: "Solid domain competence with minor polishing opportunities on metrics.",
            badgeClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
          }
        : {
            label: "Needs Calibration",
            desc: "Focus on articulating concrete engineering decisions and STAR structure.",
            badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
          };

    return (
      <div className="max-w-5xl mx-auto space-y-8 pb-16 print:space-y-4 print:pb-0">
        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            body {
              background-color: white !important;
              color: black !important;
            }
            .no-print, header, nav, aside {
              display: none !important;
            }
            .print-block {
              break-inside: avoid;
            }
          }
        `}</style>

        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
          <Link href="/coach">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to Setup
            </Button>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 text-xs h-8"
              title="Print or export diagnostic report as PDF"
            >
              <Printer className="h-3.5 w-3.5" /> Print / Save PDF
            </Button>
            <Button
              size="sm"
              variant={loggedToCompany ? "outline" : "default"}
              onClick={() => setIsLogModalOpen(true)}
              className="gap-1.5 text-xs h-8 shadow-xs"
            >
              <BookmarkCheck className="h-3.5 w-3.5" />
              {loggedToCompany ? `Logged to ${loggedToCompany}` : "Log to Application Pipeline"}
            </Button>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
              Interview Complete
            </Badge>
          </div>
        </div>

        {/* Notification when logged to application */}
        {loggedToCompany && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-800 dark:text-emerald-300 no-print animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                Diagnostic score (<strong className="font-semibold">{avgScore}/10</strong>) has been linked to the{" "}
                <strong className="font-semibold">{loggedToCompany}</strong> timeline in your Kanban pipeline.
              </span>
            </div>
            <Link href="/applications">
              <Button size="sm" variant="outline" className="gap-1 text-xs h-7 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15">
                Open Kanban Pipeline <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        )}

        {/* Overall Score Header */}
        <Card className="border-primary/20 shadow-sm overflow-hidden print-block">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <Trophy className="h-3.5 w-3.5" /> Comprehensive Diagnostic Scorecard
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {session.role} Simulation
              </h1>
              <p className="text-muted-foreground text-sm">
                Seniority Level: <span className="font-medium text-foreground">{session.difficulty}</span> •{" "}
                {answeredCount} of {totalQuestions} Questions Evaluated
              </p>
              <div className="pt-1">
                <Badge variant="outline" className={`text-xs px-2.5 py-0.5 ${hiringBar.badgeClass}`}>
                  <Award className="h-3.5 w-3.5 mr-1" /> {hiringBar.label} — {hiringBar.desc}
                </Badge>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-background border border-primary/20 shadow-sm shrink-0 min-w-[150px]">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Overall Score
              </span>
              <span className="text-4xl md:text-5xl font-extrabold text-primary my-1">
                {avgScore}
              </span>
              <span className="text-xs text-muted-foreground">out of 10.0</span>
            </div>
          </div>
        </Card>

        {/* Multi-Dimension Diagnostic Grid */}
        <div className="space-y-3 print-block">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold tracking-tight">Dimensional Evaluation Breakdown</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Technical Precision */}
            <Card className="border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                  Technical Precision
                </span>
                <span className="text-lg font-bold text-blue-500">{avgTechnical}/10</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(avgTechnical / 10) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Evaluates algorithmic rigor, distributed systems trade-offs, caching, and database design.
              </p>
            </Card>

            {/* Communication & Delivery */}
            <Card className="border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                  Communication & Flow
                </span>
                <span className="text-lg font-bold text-emerald-500">{avgCommunication}/10</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(avgCommunication / 10) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Evaluates articulate pacing, structured STAR exposition, and avoiding cognitive clutter.
              </p>
            </Card>

            {/* Specificity & Metrics */}
            <Card className="border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                  Specificity & Metrics
                </span>
                <span className="text-lg font-bold text-amber-500">{avgSpecificity}/10</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(avgSpecificity / 10) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Evaluates quantifiable business KPIs, latency/throughput gains, and concrete architectural decisions.
              </p>
            </Card>
          </div>

          {/* Diagnostic Coach Recommendation Callout */}
          <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-2.5 text-xs text-foreground/90">
            <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">{coachingInsight}</p>
          </div>
        </div>

        {/* Detailed Question Evaluations & Model Answer Comparison */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">
              Candidate Answers vs. Staff Engineer STAR Benchmarks
            </h2>
            <Badge variant="secondary" className="text-xs">
              {session.questions.length} Questions
            </Badge>
          </div>

          <div className="space-y-6">
            {session.questions.map((q, idx) => {
              const qEval = q.evaluation;
              const benchmarkText = qEval?.modelAnswer || qEval?.idealStructure;

              return (
                <Card key={q.id} className="border-border overflow-hidden print-block">
                  <CardHeader className="bg-muted/20 pb-3 border-b border-border/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Q{idx + 1}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {q.category}
                        </Badge>
                      </div>
                      {qEval?.scores?.overall !== undefined && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Score:</span>
                          <span className="font-bold text-primary text-sm">
                            {qEval.scores.overall}/10
                          </span>
                        </div>
                      )}
                    </div>
                    <CardTitle className="text-base font-semibold pt-1">
                      {q.question}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="pt-5 pb-6 space-y-4">
                    {/* Side-by-Side Comparison */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                      {/* Left: Candidate Answer */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase font-semibold text-muted-foreground">
                            Candidate&apos;s Answer
                          </span>
                          <span className="text-[11px] text-muted-foreground">Actual Response</span>
                        </div>

                        {q.answer ? (
                          <div className="p-3.5 rounded-lg bg-muted/40 border border-border/60 text-xs sm:text-sm text-foreground italic leading-relaxed min-h-[120px]">
                            &quot;{q.answer.answer}&quot;
                          </div>
                        ) : (
                          <div className="p-4 rounded-lg bg-muted/20 border border-dashed border-border text-xs text-muted-foreground italic text-center">
                            Question was skipped.
                          </div>
                        )}

                        {qEval && (
                          <div className="space-y-2 pt-1">
                            {qEval.strengths?.length > 0 && (
                              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-1">
                                <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Key Strengths
                                </span>
                                <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                                  {qEval.strengths.map((s, i) => (
                                    <li key={i}>{s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {qEval.weaknesses?.length > 0 && (
                              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs space-y-1">
                                <span className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                  <AlertCircle className="h-3.5 w-3.5" /> Areas to Polish
                                </span>
                                <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                                  {qEval.weaknesses.map((w, i) => (
                                    <li key={i}>{w}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: Staff Engineer Benchmark (STAR) */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase font-semibold text-primary flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5" /> Staff Engineer Benchmark (STAR)
                          </span>
                          {benchmarkText && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyModelAnswer(benchmarkText, q.id)}
                              className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground no-print cursor-pointer"
                            >
                              {copiedQuestionId === q.id ? (
                                <>
                                  <CheckCheck className="h-3 w-3 text-emerald-500" /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" /> Copy Benchmark
                                </>
                              )}
                            </Button>
                          )}
                        </div>

                        {benchmarkText ? (
                          <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/20 text-xs sm:text-sm text-foreground leading-relaxed min-h-[120px] font-mono">
                            {benchmarkText}
                          </div>
                        ) : (
                          <div className="p-4 rounded-lg bg-muted/20 border border-dashed border-border text-xs text-muted-foreground italic text-center">
                            Benchmark not available.
                          </div>
                        )}

                        {qEval?.missingConcepts && qEval.missingConcepts.length > 0 && (
                          <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-xs space-y-1.5">
                            <span className="font-semibold text-muted-foreground uppercase text-[10px]">
                              Recommended Core Concepts:
                            </span>
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {qEval.missingConcepts.map((concept, i) => (
                                <Badge key={i} variant="outline" className="text-[11px] bg-background">
                                  {concept}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {qEval?.followUpQuestion && (
                          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-300 text-xs">
                            <span className="font-semibold flex items-center gap-1 text-[11px] uppercase tracking-wider mb-0.5 opacity-80">
                              <MessageSquare className="h-3 w-3" /> Potential Interviewer Follow-Up:
                            </span>
                            <p className="leading-relaxed">{qEval.followUpQuestion}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border no-print">
          <Button variant="outline" onClick={() => setShowSummary(false)} className="w-full sm:w-auto">
            <RotateCcw className="h-4 w-4 mr-2" /> Review Questions in Session
          </Button>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              onClick={() => setIsLogModalOpen(true)}
              className="gap-2 w-full sm:w-auto"
            >
              <BookmarkCheck className="h-4 w-4" />
              {loggedToCompany ? `Linked to ${loggedToCompany}` : "Log to Application Timeline"}
            </Button>
            <Link href="/coach" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto shadow-md gap-2">
                <Sparkles className="h-4 w-4" /> Practice Another Role
              </Button>
            </Link>
          </div>
        </div>

        {/* 1-Click Pipeline Logging Modal */}
        <Dialog open={isLogModalOpen} onOpenChange={setIsLogModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <BookmarkCheck className="h-5 w-5 text-primary" /> Log to Application Timeline
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Attach this mock interview scorecard ({avgScore}/10) directly to one of your active job applications in the Kanban pipeline.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {applications.length > 0 ? (
                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Choose Target Job Application:
                  </label>
                  <select
                    value={selectedAppId}
                    onChange={(e) => setSelectedAppId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {applications.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.company} — {app.position} ({app.status})
                      </option>
                    ))}
                  </select>

                  <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-1 text-muted-foreground">
                    <p className="font-semibold text-foreground">Timeline Event Preview:</p>
                    <p>
                      • Type: <code className="text-primary font-mono text-[11px]">MOCK_INTERVIEW_PRACTICE</code>
                    </p>
                    <p>
                      • Details: Score {avgScore}/10 for {session.role} ({session.difficulty} difficulty) across {answeredCount} questions.
                    </p>
                    <p>• Updates application notes with session timestamp and performance.</p>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center space-y-3 border border-dashed border-border rounded-lg bg-muted/20">
                  <Briefcase className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-sm font-semibold">No Applications Found</p>
                  <p className="text-xs text-muted-foreground">
                    You don&apos;t have any active job applications in your Kanban board yet.
                  </p>
                  <Link href="/jobs">
                    <Button size="sm" variant="outline" className="mt-2 text-xs">
                      Explore & Save Jobs
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsLogModalOpen(false)}>
                Cancel
              </Button>
              {applications.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleLogToApplication}
                  disabled={isLogging || !selectedAppId}
                  className="gap-1.5"
                >
                  {isLogging ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" /> Save to Pipeline
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Active Session View
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/coach">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Interview Simulator</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {session.role} • <span className="font-medium text-foreground">{session.difficulty}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs sm:text-sm font-medium">
            Question {currentQIndex + 1} of {totalQuestions}
          </span>
          <div className="w-28 sm:w-36 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((currentQIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
          {answeredCount === totalQuestions && (
            <Button size="sm" variant="outline" onClick={() => setShowSummary(true)} className="text-xs gap-1">
              <Trophy className="h-3.5 w-3.5 text-primary" /> Report
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Column Question & Input | Right Column Evaluation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Question Display Card */}
          <Card className="border-border shadow-xs">
            <CardHeader className="bg-muted/30 pb-3 border-b border-border">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-background text-xs">
                    {currentQuestion.category}
                  </Badge>
                  {isSpeaking && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-primary animate-pulse bg-primary/10 px-2.5 py-0.5 rounded-full">
                      <Volume2 className="h-3 w-3" /> Interviewer Speaking...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAutoReadQuestions((prev) => !prev)}
                    className={`text-[10px] px-2 py-1 rounded-md border transition-all cursor-pointer ${
                      autoReadQuestions
                        ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                        : "text-muted-foreground border-border/60 hover:text-foreground"
                    }`}
                    title="Automatically read each new question aloud when loading"
                  >
                    ⚡ Auto-Voice: {autoReadQuestions ? "ON" : "OFF"}
                  </button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleReadAloud}
                    className={`text-xs gap-1.5 h-7 px-2.5 ${
                      isSpeaking
                        ? "text-red-500 hover:text-red-600 bg-red-500/10"
                        : "text-primary hover:text-primary bg-primary/10 hover:bg-primary/15"
                    }`}
                  >
                    {isSpeaking ? (
                      <>
                        <VolumeX className="h-3.5 w-3.5" /> Stop Voice
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-3.5 w-3.5" /> Listen to Voice
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 pb-6 text-center min-h-[140px] flex flex-col justify-center">
              <h2 className="text-xl sm:text-2xl font-semibold leading-relaxed">
                {currentQuestion.question}
              </h2>
            </CardContent>
          </Card>

          {/* Answer Input Card */}
          <Card className="border-primary/20 shadow-xs relative">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Your Answer
                </CardTitle>
                {isRecording && (
                  <span className="flex items-center gap-1.5 text-red-500 font-medium text-xs normal-case animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-red-500 block" /> Listening... {formatSeconds(recordingSeconds)}
                  </span>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <textarea
                className="w-full min-h-[200px] p-4 bg-transparent border-0 focus:ring-0 resize-none text-sm sm:text-base leading-relaxed placeholder:text-muted-foreground/60"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer clearly, or click 'Speak Answer' to speak your response natively..."
                disabled={isEvaluating}
              />
              <SpeechDeliveryTracker
                text={answer}
                recordingSeconds={recordingSeconds}
                isRecording={isRecording}
              />
            </CardContent>

            {micUnsupported && (
              <div className="px-4 py-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs border-t border-amber-500/20">
                Microphone speech recognition is not supported in this browser. Please type your response or use Chrome/Edge.
              </div>
            )}

            <CardFooter className="bg-muted/20 border-t border-border p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Button
                  variant={isRecording ? "destructive" : "outline"}
                  size="sm"
                  onClick={toggleRecording}
                  disabled={isEvaluating}
                  className="gap-1.5 text-xs transition-all shrink-0"
                >
                  {isRecording ? (
                    <>
                      <Square className="h-3.5 w-3.5 fill-current" /> Stop Dictation
                    </>
                  ) : (
                    <>
                      <Mic className="h-3.5 w-3.5" /> Speak Answer
                    </>
                  )}
                </Button>

                {isRecording && (
                  <div className="flex items-center gap-2">
                    <AudioWaveformVisualizer isRecording={isRecording} className="h-8 max-w-[180px]" />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSubmit}
                  disabled={answer.trim().length < 5 || isEvaluating || isRecording}
                  size="sm"
                  className="gap-1.5 text-xs shadow-xs"
                >
                  {isEvaluating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Evaluating...
                    </>
                  ) : isAnswered ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Re-Evaluate Answer
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" /> Submit Answer
                    </>
                  )}
                </Button>
              </div>
            </CardFooter>

            {isEvaluating && (
              <div className="absolute inset-0 bg-background/85 backdrop-blur-xs z-10 flex flex-col items-center justify-center rounded-xl border border-primary/20 p-6 text-center">
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
                <p className="font-semibold text-base">Evaluating your response with AI...</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Analyzing technical precision, communication flow, structure, and identifying missing core concepts.
                </p>
              </div>
            )}
          </Card>

          {/* Quick Step Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={currentQIndex === 0}
              className="gap-1 text-xs"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <span className="text-xs text-muted-foreground font-medium">
              {currentQIndex + 1} / {totalQuestions}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              className="gap-1 text-xs"
            >
              {currentQIndex < totalQuestions - 1 ? (
                <>
                  Next <ChevronRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Finish Interview <Trophy className="h-3.5 w-3.5 ml-1 text-primary" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Column: AI Evaluation */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {!evaluation ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full min-h-[360px] border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center p-8 text-center bg-muted/10"
              >
                <div className="bg-primary/10 p-4 rounded-full mb-3 text-primary">
                  <Target className="h-7 w-7" />
                </div>
                <h3 className="font-semibold text-base mb-1">Awaiting Your Answer</h3>
                <p className="text-xs text-muted-foreground max-w-[300px] leading-relaxed">
                  Type or dictate your response to Question {currentQIndex + 1} and click Submit. Our AI will analyze your technical depth, clarity, and highlight key strengths.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={`eval-${currentQIndex}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Score Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Overall", score: evaluation.scores.overall, color: "text-primary" },
                    { label: "Technical", score: evaluation.scores.technical, color: "text-blue-500" },
                    { label: "Clarity", score: evaluation.scores.communication, color: "text-green-500" },
                    { label: "Specificity", score: evaluation.scores.specificity, color: "text-amber-500" },
                  ].map((s) => (
                    <Card key={s.label} className="text-center p-3 shadow-2xs">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5 font-semibold">
                        {s.label}
                      </p>
                      <p className={`text-2xl font-bold ${s.color}`}>
                        {s.score}
                        <span className="text-xs text-muted-foreground font-normal">/10</span>
                      </p>
                    </Card>
                  ))}
                </div>

                {/* Feedback Card */}
                <Card className="border-border shadow-xs overflow-hidden">
                  <CardContent className="p-0 divide-y divide-border/60">
                    {/* Strengths */}
                    {evaluation.strengths && evaluation.strengths.length > 0 && (
                      <div className="p-4 bg-green-500/5">
                        <h4 className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm text-green-700 dark:text-green-400 mb-2">
                          <Check className="h-4 w-4" /> Strong Aspects
                        </h4>
                        <ul className="space-y-1.5">
                          {evaluation.strengths.map((str, i) => (
                            <li key={i} className="text-xs sm:text-sm flex items-start gap-2 text-foreground/90">
                              <span className="text-green-500 font-bold">•</span>
                              <span>{str}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Weaknesses */}
                    {evaluation.weaknesses && evaluation.weaknesses.length > 0 && (
                      <div className="p-4 bg-amber-500/5">
                        <h4 className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm text-amber-700 dark:text-amber-400 mb-2">
                          <AlertCircle className="h-4 w-4" /> Areas for Improvement
                        </h4>
                        <ul className="space-y-1.5">
                          {evaluation.weaknesses.map((w, i) => (
                            <li key={i} className="text-xs sm:text-sm flex items-start gap-2 text-foreground/90">
                              <span className="text-amber-500 font-bold">•</span>
                              <span>{w}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Ideal Answer Structure */}
                    {evaluation.idealStructure && (
                      <div className="p-4 bg-muted/20">
                        <h4 className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm text-foreground mb-2">
                          <Lightbulb className="h-4 w-4 text-primary" /> Recommended Answer Structure
                        </h4>
                        <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                          {evaluation.idealStructure}
                        </p>

                        {evaluation.missingConcepts && evaluation.missingConcepts.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/40">
                            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                              Recommended concepts to mention:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {evaluation.missingConcepts.map((concept, i) => (
                                <Badge key={i} variant="outline" className="text-xs bg-background">
                                  {concept}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Staff Engineer STAR Benchmark (Model Answer) */}
                    {(evaluation.modelAnswer || evaluation.idealStructure) && (
                      <div className="p-4 bg-primary/5 border-t border-primary/20 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm text-primary">
                            <Sparkles className="h-4 w-4" /> Staff Engineer Benchmark (STAR)
                          </h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleCopyModelAnswer(
                                evaluation.modelAnswer || evaluation.idealStructure,
                                currentQuestion.id
                              )
                            }
                            className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            {copiedQuestionId === currentQuestion.id ? (
                              <>
                                <CheckCheck className="h-3 w-3 text-emerald-500" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" /> Copy Benchmark
                              </>
                            )}
                          </Button>
                        </div>
                        <p className="text-xs sm:text-sm leading-relaxed text-foreground bg-background/80 p-3 rounded-md border border-border/60 font-mono">
                          {evaluation.modelAnswer || evaluation.idealStructure}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Follow-up question if any */}
                {evaluation.followUpQuestion && (
                  <div className="p-3.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-300">
                    <div className="flex items-start gap-2.5">
                      <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider mb-0.5 opacity-75">
                          Follow-up Question
                        </p>
                        <p className="text-xs sm:text-sm font-medium">{evaluation.followUpQuestion}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Next Question / Finish Action */}
                <div className="flex justify-end pt-2">
                  <Button onClick={handleNext} className="w-full sm:w-auto shadow-sm gap-2">
                    {currentQIndex < totalQuestions - 1 ? (
                      <>
                        Next Question <ChevronRight className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        View Full Interview Report <Trophy className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function SessionLoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading session...</p>
    </div>
  );
}

export default function InterviewSessionPage() {
  return (
    <Suspense fallback={<SessionLoadingSkeleton />}>
      <SessionContent />
    </Suspense>
  );
}
