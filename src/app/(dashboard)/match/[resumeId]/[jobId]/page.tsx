"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, XCircle, FileText, Briefcase, Sparkles, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";

// Mock data
const mockMatch = {
  overallScore: 87,
  skillsScore: 92,
  experienceScore: 81,
  keywordsScore: 88,
  strongMatches: [
    "5+ years of React experience perfectly aligns with the requirement",
    "System design experience at scale",
    "Previous fintech background is highly relevant"
  ],
  missingSkills: [
    "GraphQL (Required)",
    "Redis (Preferred)"
  ],
  missingKeywords: [
    "Micro-frontends",
    "CI/CD pipelines",
    "A/B Testing"
  ],
  recommendations: [
    "Highlight your API design experience to bridge the GraphQL gap",
    "Add specific examples of deployment pipelines you've built",
    "Quantify your impact on conversion rates to address A/B testing"
  ]
};

export default function MatchPage() {
  const params = useParams();

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/jobs">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Match Analysis</h1>
          <div className="flex items-center text-sm text-muted-foreground mt-1 gap-2">
            <span className="flex items-center gap-1.5"><FileText size={14} /> Software Engineer Resume</span>
            <ChevronRight size={14} />
            <span className="flex items-center gap-1.5 font-medium text-foreground"><Briefcase size={14} /> Senior Frontend Engineer @ Google</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Score */}
        <Card className="border-primary/20 bg-primary/5 flex flex-col justify-center items-center p-6 text-center">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6">Overall Match</CardTitle>
          <div className="relative flex items-center justify-center w-40 h-40">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
              <motion.circle 
                initial={{ strokeDasharray: "0 282" }}
                animate={{ strokeDasharray: `${mockMatch.overallScore * 2.82} 282` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                cx="50" cy="50" r="45" 
                fill="none" stroke="currentColor" strokeWidth="8" 
                className="text-primary" 
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-5xl font-bold">{mockMatch.overallScore}%</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-6 max-w-[200px]">
            You are a very strong candidate for this role.
          </p>
        </Card>

        {/* Breakdown */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Match Breakdown</CardTitle>
            <CardDescription>How your resume aligns with specific job requirements.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Skills</span>
                <span className="text-green-600">{mockMatch.skillsScore}%</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${mockMatch.skillsScore}%` }} transition={{ duration: 1 }} className="h-full bg-green-500" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Experience</span>
                <span>{mockMatch.experienceScore}%</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${mockMatch.experienceScore}%` }} transition={{ duration: 1, delay: 0.2 }} className="h-full bg-primary" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Keywords</span>
                <span>{mockMatch.keywordsScore}%</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${mockMatch.keywordsScore}%` }} transition={{ duration: 1, delay: 0.4 }} className="h-full bg-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center gap-2">
            <CheckCircle2 className="text-green-500 h-5 w-5" />
            <CardTitle>Strong Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {mockMatch.strongMatches.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center gap-2">
            <XCircle className="text-destructive h-5 w-5" />
            <CardTitle>Missing Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {mockMatch.missingSkills.map((kw, i) => (
                    <Badge key={i} variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {mockMatch.missingKeywords.map((kw, i) => (
                    <Badge key={i} variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none text-primary">
          <Sparkles size={120} />
        </div>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            How to improve your chances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 relative z-10">
            {mockMatch.recommendations.map((rec, i) => (
              <div key={i} className="p-4 rounded-lg bg-background border border-border shadow-sm flex items-start gap-3">
                <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-sm font-bold">
                  {i + 1}
                </div>
                <p className="text-sm leading-relaxed">{rec}</p>
              </div>
            ))}
            <div className="pt-4 flex justify-end">
              <Link href={`/dashboard/improve?resumeId=${params.resumeId}&jobId=${params.jobId}`}>
                <Button>
                  Open AI Resume Improver
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Ensure the icon exists or import it properly if missing above
import { ArrowRight } from "lucide-react";
