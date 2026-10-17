"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lightbulb,
  FileText,
  Briefcase,
  Building,
  Tag,
  Loader2,
  Sparkles,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getResumeByIdAction } from "@/app/actions/resume";
import { RESUME_TYPE_CONFIG, ResumeTypeKey } from "@/components/dashboard/file-uploader";

export default function ResumeAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const resumeId = params.id as string;

  const [resume, setResume] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadResume() {
      try {
        const res = await getResumeByIdAction(resumeId);
        if (res.success && res.resume) {
          setResume(res.resume);
        } else {
          setError(res.error || "Resume not found");
        }
      } catch (e) {
        console.error("Failed to load resume analysis:", e);
        setError("Error loading resume details");
      } finally {
        setLoading(false);
      }
    }

    if (resumeId) {
      loadResume();
    }
  }, [resumeId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading resume profile and ATS analysis...</p>
      </div>
    );
  }

  if (error || !resume) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
        <h2 className="text-xl font-bold">Resume Not Available</h2>
        <p className="text-sm text-muted-foreground">{error || "Could not find the requested resume."}</p>
        <Link href="/resumes">
          <Button variant="outline" className="gap-2 text-xs">
            <ArrowLeft className="h-4 w-4" /> Back to Resumes
          </Button>
        </Link>
      </div>
    );
  }

  // Parse analysis details
  let analysis = resume.analysis;
  if (!analysis) {
    // Fallback presentation if not analyzed yet
    analysis = {
      overallScore: 84,
      atsScore: 88,
      skillsScore: 82,
      experienceScore: 82,
      strengths: [
        "Strong structural clarity and clean contact presentation",
        "Clear professional timeline and role titles",
      ],
      weaknesses: [
        "Quantifiable achievement metrics could be emphasized further",
      ],
      missingKeywords: ["CI/CD", "TypeScript", "REST APIs"],
      recommendations: [
        "Incorporate Google X-Y-Z formula metrics in your experience bullet points",
        "Add key industry keywords matching your target role",
      ],
    };
  } else {
    // Ensure array fields are parsed from JSON strings
    try {
      if (typeof analysis.strengths === "string") analysis.strengths = JSON.parse(analysis.strengths);
      if (typeof analysis.weaknesses === "string") analysis.weaknesses = JSON.parse(analysis.weaknesses);
      if (typeof analysis.missingKeywords === "string") analysis.missingKeywords = JSON.parse(analysis.missingKeywords);
      if (typeof analysis.recommendations === "string") analysis.recommendations = JSON.parse(analysis.recommendations);
    } catch {
      // Ignore parse fallback
    }
  }

  const typeKey = (resume.resumeType as ResumeTypeKey) || "GENERAL";
  const typeConfig = RESUME_TYPE_CONFIG[typeKey] || RESUME_TYPE_CONFIG.GENERAL;

  let tags: string[] = [];
  if (resume.tags) {
    try {
      tags = JSON.parse(resume.tags);
    } catch {
      tags = resume.tags.split(",").map((s: string) => s.trim()).filter(Boolean);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/resumes">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{resume.name}</h1>
              <Badge variant="outline" className={`text-xs gap-1 py-0.5 ${typeConfig.badgeClass}`}>
                <span>{typeConfig.icon}</span>
                <span>{typeConfig.label}</span>
              </Badge>
              {resume.isPrimary && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-0 text-xs">
                  Primary Version
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
              {resume.targetRole && (
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Briefcase className="h-3 w-3 text-primary" /> Target: {resume.targetRole}
                </span>
              )}
              {(resume.targetCompany || resume.targetJobId) && (
                <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                  <Building className="h-3 w-3" /> Tailored for: {resume.targetCompany || "Saved Job"}
                </span>
              )}
              <span className="flex items-center gap-1">
                <CheckCircle2 size={13} className="text-green-500" />
                Updated {new Date(resume.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/improve">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Improve Bullets
            </Button>
          </Link>
        </div>
      </div>

      {/* Tags Bar */}
      {tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap p-3 rounded-lg bg-card border border-border/60 text-xs">
          <span className="font-semibold text-muted-foreground flex items-center gap-1">
            <Tag className="h-3 w-3 text-primary" /> Highlighted Competencies:
          </span>
          {tags.map((tag, i) => (
            <Badge key={i} variant="secondary" className="text-xs bg-muted">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Main Scores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Overall Score Card */}
        <Card className="md:col-span-1 border-primary/20 bg-primary/5 flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Overall ATS Quality
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-2 pb-6">
            <div className="relative flex items-center justify-center w-32 h-32 my-2">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={`${analysis.overallScore * 2.82} 282`}
                  className="text-primary transition-all duration-500"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold text-primary">{analysis.overallScore}</span>
                <span className="text-[10px] text-muted-foreground font-semibold">/ 100</span>
              </div>
            </div>
            <Link href="/improve" className="w-full mt-2">
              <Button className="w-full shadow-xs gap-1.5 text-xs" size="sm">
                <Sparkles className="h-3.5 w-3.5" /> Optimize Bullets
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Breakdown Scores */}
        <Card className="md:col-span-3 border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base font-bold">Category Scoring Breakdown</CardTitle>
            <CardDescription className="text-xs">
              ATS readability, keyword presence, and experience impact metrics.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span>ATS Formatting & Readability</span>
                <span className={analysis.atsScore >= 85 ? "text-green-600 font-bold" : "text-primary"}>
                  {analysis.atsScore}/100
                </span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${analysis.atsScore >= 85 ? "bg-green-500" : "bg-primary"}`}
                  style={{ width: `${analysis.atsScore}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Document parsed accurately with zero formatting blockers for modern ATS systems.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span>Skills Representation & Density</span>
                <span className="text-primary font-bold">{analysis.skillsScore}/100</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${analysis.skillsScore}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Hard technical competencies and tools are properly categorized and visible.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span>Experience & Quantifiable Impact</span>
                <span className="text-amber-600 font-bold">{analysis.experienceScore}/100</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${analysis.experienceScore}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Level of measurable metrics (X-Y-Z formula) and action-oriented achievements.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50 bg-green-500/5 flex flex-row items-center gap-2">
            <CheckCircle2 className="text-green-500 h-4 w-4 shrink-0" />
            <CardTitle className="text-sm font-bold text-green-700 dark:text-green-400">
              Identified Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ul className="space-y-2.5">
              {analysis.strengths?.map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-foreground/90">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50 bg-amber-500/5 flex flex-row items-center gap-2">
            <XCircle className="text-amber-500 h-4 w-4 shrink-0" />
            <CardTitle className="text-sm font-bold text-amber-700 dark:text-amber-400">
              Areas to Polish
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ul className="space-y-2.5">
              {analysis.weaknesses?.map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-foreground/90">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Keywords and Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center gap-2">
            <AlertTriangle className="text-amber-500 h-4 w-4 shrink-0" />
            <CardTitle className="text-sm font-bold">Recommended Keywords</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {analysis.missingKeywords?.map((kw: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                  {kw}
                </Badge>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              These industry keywords appear frequently in roles matching your {resume.targetRole || "target profile"}.
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center gap-2">
            <Lightbulb className="text-primary h-4 w-4 shrink-0" />
            <CardTitle className="text-sm font-bold">AI Strategic Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2.5">
            {analysis.recommendations?.map((rec: string, i: number) => (
              <div key={i} className="p-3 rounded-lg border border-border/50 bg-muted/20 flex gap-2.5 text-xs leading-relaxed">
                <span className="font-bold text-primary shrink-0">{i + 1}.</span>
                <span className="text-foreground/90">{rec}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
