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
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  getInterviewSessionAction,
  submitInterviewAnswerAction,
  createInterviewSessionAction,
} from "@/app/actions/interview";

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
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [micUnsupported, setMicUnsupported] = useState(false);

  // Completion view state
  const [showSummary, setShowSummary] = useState(false);

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
    }
  }, [currentQIndex, currentQuestion]);

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

  // Text-To-Speech (Read Aloud)
  const toggleReadAloud = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (isSpeaking) {
      stopAudio();
      return;
    }

    if (!currentQuestion) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentQuestion.question);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

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
    const avgScore =
      session.overallScore ??
      (answeredCount > 0
        ? Math.round(
            (session.questions.reduce((acc, q) => acc + (q.evaluation?.scores.overall ?? 7), 0) /
              answeredCount) *
              10
          ) / 10
        : 7.5);

    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-16">
        <div className="flex items-center justify-between">
          <Link href="/coach">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to Setup
            </Button>
          </Link>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
            Interview Complete
          </Badge>
        </div>

        {/* Overall Score Header */}
        <Card className="border-primary/20 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <Trophy className="h-3.5 w-3.5" /> Performance Summary
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {session.role} Simulation
              </h1>
              <p className="text-muted-foreground text-sm">
                Seniority Level: <span className="font-medium text-foreground">{session.difficulty}</span> •{" "}
                {answeredCount} of {totalQuestions} Questions Evaluated
              </p>
            </div>

            <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-background border border-primary/20 shadow-sm shrink-0 min-w-[140px]">
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

        {/* Question Breakdown List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold tracking-tight">Detailed Question Evaluations</h2>
          <div className="space-y-4">
            {session.questions.map((q, idx) => {
              const qEval = q.evaluation;
              return (
                <Card key={q.id} className="border-border">
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
                  <CardContent className="pt-4 space-y-4 text-sm">
                    {q.answer ? (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                          Your Response:
                        </p>
                        <p className="p-3 rounded-md bg-muted/40 text-foreground italic leading-relaxed">
                          &quot;{q.answer.answer}&quot;
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic text-xs">Question was skipped.</p>
                    )}

                    {qEval && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        {qEval.strengths?.length > 0 && (
                          <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20 text-xs space-y-1">
                            <span className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-1">
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => setShowSummary(false)} className="w-full sm:w-auto">
            <RotateCcw className="h-4 w-4 mr-2" /> Review Questions in Session
          </Button>
          <Link href="/coach" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto shadow-md gap-2">
              <Sparkles className="h-4 w-4" /> Practice Another Role
            </Button>
          </Link>
        </div>
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
              <div className="flex justify-between items-center">
                <Badge variant="outline" className="bg-background text-xs">
                  {currentQuestion.category}
                </Badge>
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
                      <VolumeX className="h-3.5 w-3.5" /> Stop Audio
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-3.5 w-3.5" /> Read Aloud
                    </>
                  )}
                </Button>
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
                className="w-full min-h-[220px] p-4 bg-transparent border-0 focus:ring-0 resize-none text-sm sm:text-base leading-relaxed placeholder:text-muted-foreground/60"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer clearly, or click 'Use Microphone' to speak your answer natively..."
                disabled={isEvaluating}
              />
            </CardContent>

            {micUnsupported && (
              <div className="px-4 py-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs border-t border-amber-500/20">
                Microphone speech recognition is not supported in this browser. Please type your response or use Chrome/Edge.
              </div>
            )}

            <CardFooter className="bg-muted/20 border-t border-border p-3.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant={isRecording ? "destructive" : "outline"}
                  size="sm"
                  onClick={toggleRecording}
                  disabled={isEvaluating}
                  className="gap-1.5 text-xs transition-all"
                >
                  {isRecording ? (
                    <>
                      <Square className="h-3.5 w-3.5 fill-current" /> Stop Dictation
                    </>
                  ) : (
                    <>
                      <Mic className="h-3.5 w-3.5" /> Use Microphone
                    </>
                  )}
                </Button>
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
