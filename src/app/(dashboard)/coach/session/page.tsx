"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Mic, Square, Check, MessageSquare, Target, Lightbulb, Play, AlertCircle } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// Mock Session State
const mockQuestions = [
  { id: "q1", question: "How would you design a scalable notification system?", category: "System Design" },
  { id: "q2", question: "Explain the virtual DOM in React and why it improves performance.", category: "React" },
  { id: "q3", question: "Tell me about a time you disagreed with a product decision. How did you handle it?", category: "Behavioral" },
];

export default function InterviewSessionPage() {
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<any | null>(null);

  const currentQuestion = mockQuestions[currentQIndex];

  const handleSubmit = () => {
    setIsEvaluating(true);
    
    // Simulate API Call for evaluation
    setTimeout(() => {
      setIsEvaluating(false);
      setEvaluation({
        scores: { technical: 8, communication: 7, specificity: 6, overall: 7 },
        strengths: ["Clear high-level overview", "Good mention of message queues"],
        weaknesses: ["Didn't discuss database schemas", "Missed discussing retry mechanisms for failed notifications"],
        missingConcepts: ["Idempotency", "Rate limiting", "Dead letter queues"],
        idealStructure: "1. Clarify requirements (scale, latency). 2. High-level architecture (API, Queues, Workers). 3. Database choices. 4. Edge cases (failures, retries).",
        followUpQuestion: "How would you ensure that a user doesn't receive the exact same notification twice?"
      });
    }, 2000);
  };

  const handleNext = () => {
    if (currentQIndex < mockQuestions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
      setAnswer("");
      setEvaluation(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/coach">
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Interview Session</h1>
            <p className="text-sm text-muted-foreground">Full Stack Developer • Intermediate</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Question {currentQIndex + 1} of {mockQuestions.length}</span>
          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${((currentQIndex + 1) / mockQuestions.length) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Question & Input */}
        <div className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-muted/30 pb-4 border-b border-border">
              <div className="flex justify-between items-start">
                <Badge variant="outline" className="bg-background">{currentQuestion.category}</Badge>
                <Badge className="bg-primary/10 text-primary border-0 hover:bg-primary/20 flex gap-1">
                  <Play className="h-3 w-3 fill-current" /> Read Aloud
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 pb-8 text-center min-h-[160px] flex flex-col justify-center">
              <h2 className="text-2xl md:text-3xl font-semibold leading-tight">{currentQuestion.question}</h2>
            </CardContent>
          </Card>

          <Card className="border-primary/20 shadow-sm relative">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                Your Answer
                {isRecording && (
                  <span className="flex items-center gap-2 text-red-500 font-medium text-xs normal-case animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-red-500 block" /> Recording... 01:24
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <textarea
                className="w-full min-h-[240px] p-4 bg-transparent border-0 focus:ring-0 resize-none text-base leading-relaxed"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer here, or use the microphone to dictate..."
                disabled={!!evaluation || isEvaluating}
              />
            </CardContent>
            {!evaluation && !isEvaluating && (
              <CardFooter className="bg-muted/20 border-t border-border p-4 flex justify-between">
                <Button 
                  variant={isRecording ? "destructive" : "outline"} 
                  onClick={() => setIsRecording(!isRecording)}
                  className="gap-2 transition-all w-[140px]"
                >
                  {isRecording ? <><Square className="h-4 w-4 fill-current" /> Stop Recording</> : <><Mic className="h-4 w-4" /> Use Microphone</>}
                </Button>
                <Button onClick={handleSubmit} disabled={answer.trim().length < 10 || isRecording}>
                  Submit Answer <Check className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            )}
            
            {isEvaluating && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-xl border border-primary/20">
                <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
                <p className="font-medium text-lg">AI is evaluating your response...</p>
                <p className="text-sm text-muted-foreground mt-1">Analyzing technical depth and communication.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: AI Evaluation */}
        <div className="space-y-6 h-full">
          <AnimatePresence mode="wait">
            {!evaluation ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="h-full min-h-[400px] border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center p-8 text-center bg-muted/10"
              >
                <div className="bg-muted p-4 rounded-full mb-4">
                  <Target className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Awaiting your answer</h3>
                <p className="text-sm text-muted-foreground max-w-[280px]">
                  Submit your response on the left, and our AI will provide detailed feedback, scoring, and ideal structuring.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="evaluation"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Scores */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Overall", score: evaluation.scores.overall, color: "text-primary" },
                    { label: "Technical", score: evaluation.scores.technical, color: "text-blue-500" },
                    { label: "Clarity", score: evaluation.scores.communication, color: "text-green-500" },
                    { label: "Details", score: evaluation.scores.specificity, color: "text-amber-500" },
                  ].map((s) => (
                    <Card key={s.label} className="text-center p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">{s.label}</p>
                      <p className={`text-3xl font-bold ${s.color}`}>{s.score}<span className="text-sm text-muted-foreground font-normal">/10</span></p>
                    </Card>
                  ))}
                </div>

                {/* Feedback */}
                <Card className="border-border">
                  <CardContent className="p-0 divide-y divide-border/50">
                    <div className="p-5">
                      <h4 className="flex items-center gap-2 font-semibold mb-3 text-green-600"><Check className="h-4 w-4" /> What you did well</h4>
                      <ul className="space-y-2">
                        {evaluation.strengths.map((s: string, i: number) => (
                          <li key={i} className="text-sm flex items-start gap-2"><span className="text-green-500 mt-1">•</span> {s}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="p-5">
                      <h4 className="flex items-center gap-2 font-semibold mb-3 text-amber-600"><AlertCircle className="h-4 w-4" /> Areas to improve</h4>
                      <ul className="space-y-2">
                        {evaluation.weaknesses.map((s: string, i: number) => (
                          <li key={i} className="text-sm flex items-start gap-2"><span className="text-amber-500 mt-1">•</span> {s}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-5 bg-muted/20">
                      <h4 className="flex items-center gap-2 font-semibold mb-3"><Lightbulb className="h-4 w-4 text-primary" /> Ideal Answer Structure</h4>
                      <p className="text-sm leading-relaxed text-muted-foreground">{evaluation.idealStructure}</p>
                      
                      {evaluation.missingConcepts.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Key concepts to mention next time:</p>
                          <div className="flex flex-wrap gap-2">
                            {evaluation.missingConcepts.map((c: string, i: number) => (
                              <Badge key={i} variant="outline" className="bg-background">{c}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Follow up & Navigation */}
                {evaluation.followUpQuestion && (
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="h-5 w-5 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-70">Interviewer Follow-up</p>
                        <p className="text-sm font-medium">{evaluation.followUpQuestion}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button size="lg" onClick={handleNext} className="w-full sm:w-auto shadow-md">
                    {currentQIndex < mockQuestions.length - 1 ? "Next Question" : "Finish Interview"}
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
