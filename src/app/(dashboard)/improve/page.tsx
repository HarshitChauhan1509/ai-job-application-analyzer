"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Sparkles, Check, X, RefreshCw, Wand2 } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { improveBulletAction } from "@/app/actions/ai";
import { ImprovementAction } from "@/lib/ai/resume-improver";

// Mock resume bullet for demo
const initialBullet = "Worked on a billing system and updated the database to make it faster for users.";

export default function ImproveResumePage() {
  const [original, setOriginal] = useState(initialBullet);
  const [improved, setImproved] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isImproving, setIsImproving] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ImprovementAction | null>(null);

  const handleImprove = async (action: ImprovementAction) => {
    setIsImproving(true);
    setSelectedAction(action);
    setImproved(null);
    
    try {
      const res = await improveBulletAction(original, action, "Senior Frontend Engineer at Google");
      if (res.success && res.improvement) {
        setImproved(res.improvement.improved);
        setExplanation(res.improvement.explanation);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsImproving(false);
    }
  };

  const actions: { id: ImprovementAction, label: string, desc: string }[] = [
    { id: "ADD_IMPACT", label: "Add Impact", desc: "Focus on measurable results (X-Y-Z formula)" },
    { id: "MAKE_CONCISE", label: "Make Concise", desc: "Shorten without losing meaning" },
    { id: "MORE_TECHNICAL", label: "More Technical", desc: "Emphasize tools and architecture" },
    { id: "TAILOR_TO_JOB", label: "Tailor to Job", desc: "Align with the target job description" },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/resumes">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Resume Improver</h1>
          <p className="text-muted-foreground mt-1">Select a bullet point from your resume to enhance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Input and Actions */}
        <div className="space-y-6">
          <Card className="border-border shadow-sm relative overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4 border-b border-border">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Original Bullet Point</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <textarea
                className="w-full min-h-[120px] p-4 bg-transparent border-0 focus:ring-0 resize-none text-base leading-relaxed"
                value={original}
                onChange={(e) => setOriginal(e.target.value)}
                placeholder="Paste a resume bullet point here..."
              />
            </CardContent>
          </Card>

          <div>
            <h3 className="text-sm font-semibold mb-3">Improvement Type</h3>
            <div className="grid grid-cols-1 gap-2">
              {actions.map((act) => (
                <Button
                  key={act.id}
                  variant="outline"
                  className={`justify-start h-auto py-3 px-4 ${selectedAction === act.id && isImproving ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => handleImprove(act.id)}
                  disabled={isImproving || !original.trim()}
                >
                  <div className="flex flex-col items-start text-left">
                    <span className="font-semibold flex items-center gap-2">
                      {selectedAction === act.id && isImproving ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
                      ) : (
                        <Wand2 className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      {act.label}
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5">{act.desc}</span>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Output */}
        <div className="space-y-6 h-full">
          <AnimatePresence mode="wait">
            {!improved && !isImproving ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="h-full min-h-[300px] border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center p-8 text-center bg-muted/20"
              >
                <div className="bg-primary/10 p-4 rounded-full mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Ready to improve</h3>
                <p className="text-sm text-muted-foreground max-w-[250px]">
                  Select an improvement type on the left to see AI suggestions here.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <Card className="border-primary/30 shadow-md relative overflow-hidden h-full flex flex-col">
                  {isImproving && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
                      <p className="text-sm font-medium animate-pulse">Generating improvement...</p>
                    </div>
                  )}
                  
                  <CardHeader className="bg-primary/5 pb-4 border-b border-primary/10">
                    <CardTitle className="text-sm text-primary uppercase tracking-wider font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Improved Bullet Point
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 flex-1">
                    <p className="text-base leading-relaxed font-medium">
                      {improved}
                    </p>
                    
                    {explanation && (
                      <div className="mt-6 p-4 rounded-md bg-muted/50 text-sm text-muted-foreground border border-border/50">
                        <span className="font-semibold text-foreground block mb-1">Why this is better:</span>
                        {explanation}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="border-t border-border/50 bg-muted/20 p-4 flex gap-2">
                    <Button variant="default" className="flex-1" disabled={isImproving}>
                      <Check className="mr-2 h-4 w-4" /> Accept & Copy
                    </Button>
                    <Button variant="outline" className="flex-1" disabled={isImproving} onClick={() => setImproved(null)}>
                      <X className="mr-2 h-4 w-4" /> Reject
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
