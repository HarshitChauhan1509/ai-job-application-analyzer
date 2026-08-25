"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Lightbulb, FileText } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

// Mock data representing AI analysis output
const mockAnalysis = {
  overallScore: 87,
  atsScore: 92,
  skillsScore: 85,
  experienceScore: 84,
  strengths: [
    "Strong quantifiable impact in recent roles",
    "Excellent technical skill coverage",
    "Clear career progression"
  ],
  weaknesses: [
    "Missing some modern frontend tooling keywords",
    "Education section lacks detail",
    "Some bullet points are too long"
  ],
  missingKeywords: ["GraphQL", "CI/CD", "WebSockets"],
  recommendations: [
    "Add specific metrics to your education projects",
    "Break down the 4-line bullet point in your last role into two concise points",
    "Include specific CI/CD tools you have used (e.g., GitHub Actions)"
  ]
};

export default function ResumeAnalysisPage() {
  const params = useParams();
  
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/resumes">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Software Engineer Resume</h1>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-0">Primary</Badge>
          </div>
          <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-1">
            <CheckCircle2 size={14} className="text-green-500" />
            Analysis completed 2 hours ago
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Overall Score Card */}
        <Card className="md:col-span-1 border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Overall Score</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-4 pb-6">
            <div className="relative flex items-center justify-center w-32 h-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                <circle 
                  cx="50" cy="50" r="45" 
                  fill="none" stroke="currentColor" strokeWidth="8" 
                  strokeDasharray={`${mockAnalysis.overallScore * 2.82} 282`} 
                  className="text-primary" 
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-4xl font-bold">{mockAnalysis.overallScore}</span>
              </div>
            </div>
            <Button className="w-full mt-6" variant="default">Improve Resume</Button>
          </CardContent>
        </Card>

        {/* Breakdown Scores */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Score Breakdown</CardTitle>
            <CardDescription>Detailed analysis of different resume components.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>ATS Compatibility</span>
                <span className={mockAnalysis.atsScore >= 90 ? "text-green-600" : ""}>{mockAnalysis.atsScore}/100</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${mockAnalysis.atsScore >= 90 ? "bg-green-500" : "bg-primary"}`} style={{ width: `${mockAnalysis.atsScore}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">Formats correctly in major applicant tracking systems.</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Skills Representation</span>
                <span>{mockAnalysis.skillsScore}/100</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${mockAnalysis.skillsScore}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">Technical skills are clearly identifiable and categorized.</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Experience Impact</span>
                <span>{mockAnalysis.experienceScore}/100</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-amber-500" style={{ width: `${mockAnalysis.experienceScore}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">Could use more quantifiable metrics in older roles.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center gap-2">
            <CheckCircle2 className="text-green-500 h-5 w-5" />
            <div>
              <CardTitle>Strengths</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {mockAnalysis.strengths.map((item, i) => (
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
            <div>
              <CardTitle>Weaknesses</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {mockAnalysis.weaknesses.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader className="pb-3 flex flex-row items-center gap-2">
            <AlertTriangle className="text-amber-500 h-5 w-5" />
            <CardTitle>Missing Keywords</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {mockAnalysis.missingKeywords.map((kw, i) => (
                <Badge key={i} variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20">
                  {kw}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">These keywords frequently appear in roles you might target.</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center gap-2">
            <Lightbulb className="text-primary h-5 w-5" />
            <CardTitle>AI Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockAnalysis.recommendations.map((rec, i) => (
                <div key={i} className="p-3 rounded-lg border border-border/50 bg-muted/30 flex gap-3 text-sm">
                  <div className="font-semibold text-muted-foreground">{i + 1}.</div>
                  <div className="leading-relaxed">{rec}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
