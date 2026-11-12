"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Printer,
  Save,
  Copy,
  CheckCheck,
  Loader2,
  Plus,
  Trash2,
  Target,
  Mail,
  Globe,
  ExternalLink,
} from "lucide-react";
import { updateTailoredResumeAction } from "@/app/actions/tailor";
import { useToast } from "@/hooks/use-toast";
import type {
  TailoredExperienceEntry,
  TailoredProjectEntry,
  TailoredSkillGroup,
} from "@/lib/ai/schema";

export interface TailoredResumeStudioData {
  id: string;
  title: string;
  targetCompany: string;
  targetRole: string;
  matchScoreEstimate: number;
  tailoredSummary: string;
  skillsSection: TailoredSkillGroup[];
  tailoredExperience: TailoredExperienceEntry[];
  tailoredProjects: TailoredProjectEntry[];
  educationSection: string | null;
  keywordsInjected: string[];
  tailoringNotes: string | null;
  baseResumeId: string | null;
  jobId: string | null;
  updatedAt: string | Date;
}

export interface CandidateContactInfo {
  name: string;
  email: string;
  headline: string | null;
  website: string | null;
  linkedin: string | null;
  github: string | null;
  username: string | null;
}

export function TailorStudioClient({
  tailored: initialTailored,
  candidate,
}: {
  tailored: TailoredResumeStudioData;
  candidate: CandidateContactInfo;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [title, setTitle] = useState(initialTailored.title);
  const [summary, setSummary] = useState(initialTailored.tailoredSummary);
  const [skills, setSkills] = useState<TailoredSkillGroup[]>(initialTailored.skillsSection);
  const [experiences, setExperiences] = useState<TailoredExperienceEntry[]>(
    initialTailored.tailoredExperience
  );
  const [projects, setProjects] = useState<TailoredProjectEntry[]>(initialTailored.tailoredProjects);
  const [education, setEducation] = useState(initialTailored.educationSection || "");

  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const markDirty = () => {
    if (!hasUnsavedChanges) setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const res = await updateTailoredResumeAction(initialTailored.id, {
      title,
      tailoredSummary: summary,
      skillsSection: skills,
      tailoredExperience: experiences,
      tailoredProjects: projects,
      educationSection: education || null,
    });

    if (res.success) {
      setHasUnsavedChanges(false);
      toast({
        title: "Tailored Resume Saved",
        description: "Your customizations have been saved to PostgreSQL.",
      });
      router.refresh();
    } else {
      toast({
        title: "Save Failed",
        description: res.error || "Could not save edits.",
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  const handlePrintPdf = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleCopyPlainText = () => {
    const lines: string[] = [
      candidate.name.toUpperCase(),
      [candidate.email, candidate.linkedin, candidate.github, candidate.website].filter(Boolean).join(" | "),
      "",
      "PROFESSIONAL SUMMARY",
      summary,
      "",
      "TECHNICAL SKILLS",
      ...skills.map((s) => `${s.category}: ${s.items.join(", ")}`),
      "",
      "PROFESSIONAL EXPERIENCE",
      ...experiences.flatMap((exp) => [
        `${exp.title} — ${exp.company} (${exp.duration}${exp.location ? ` | ${exp.location}` : ""})`,
        ...exp.bullets.map((b) => `• ${b}`),
        "",
      ]),
    ];

    if (projects.length > 0) {
      lines.push("SELECTED PROJECTS");
      projects.forEach((p) => {
        lines.push(`${p.name}${p.techStack ? ` (${p.techStack})` : ""}${p.url ? ` — ${p.url}` : ""}`);
        p.highlights.forEach((h) => lines.push(`• ${h}`));
        lines.push("");
      });
    }

    if (education.trim()) {
      lines.push("EDUCATION", education.trim());
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(lines.join("\n"));
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
      toast({
        title: "Copied Plain-Text Resume",
        description: "ATS-safe plain text copied to your clipboard.",
      });
    }
  };

  // Experience helpers
  const updateExpField = (
    idx: number,
    field: keyof Omit<TailoredExperienceEntry, "bullets">,
    value: string
  ) => {
    markDirty();
    setExperiences((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const updateExpBullet = (expIdx: number, bulletIdx: number, value: string) => {
    markDirty();
    setExperiences((prev) =>
      prev.map((item, i) => {
        if (i !== expIdx) return item;
        const nextBullets = [...item.bullets];
        nextBullets[bulletIdx] = value;
        return { ...item, bullets: nextBullets };
      })
    );
  };

  const addExpBullet = (expIdx: number) => {
    markDirty();
    setExperiences((prev) =>
      prev.map((item, i) =>
        i === expIdx ? { ...item, bullets: [...item.bullets, "Delivered measurable impact by..."] } : item
      )
    );
  };

  const removeExpBullet = (expIdx: number, bulletIdx: number) => {
    markDirty();
    setExperiences((prev) =>
      prev.map((item, i) =>
        i === expIdx
          ? { ...item, bullets: item.bullets.filter((_, bI) => bI !== bulletIdx) }
          : item
      )
    );
  };

  // Skill helpers
  const updateSkillCategory = (idx: number, category: string) => {
    markDirty();
    setSkills((prev) => prev.map((s, i) => (i === idx ? { ...s, category } : s)));
  };

  const updateSkillItems = (idx: number, csv: string) => {
    markDirty();
    const parsed = csv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setSkills((prev) => prev.map((s, i) => (i === idx ? { ...s, items: parsed } : s)));
  };

  // Project helpers
  const removeProject = (idx: number) => {
    markDirty();
    setProjects((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateProjectHighlight = (pIdx: number, hIdx: number, val: string) => {
    markDirty();
    setProjects((prev) =>
      prev.map((p, i) => {
        if (i !== pIdx) return p;
        const next = [...p.highlights];
        next[hIdx] = val;
        return { ...p, highlights: next };
      })
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 print:max-w-none print:p-0 print:space-y-0">
      {/* Global Print Formatting */}
      <style jsx global>{`
        @media print {
          @page {
            size: letter;
            margin: 12mm 14mm;
          }
          body {
            background: white !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      {/* Top Studio Header (Hidden in Print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-start sm:items-center gap-3">
          <Link href="/resumes">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">AI Tailored Resume Studio</h1>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs">
                {initialTailored.matchScoreEstimate}% Estimated ATS Match
              </Badge>
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="text-[11px] text-amber-600 bg-amber-500/10">
                  Unsaved Changes
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Role-specific ATS resume variant tailored for{" "}
              <strong className="text-foreground">{initialTailored.targetRole}</strong> @{" "}
              <strong className="text-foreground">{initialTailored.targetCompany}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyPlainText}
            className="gap-1.5 text-xs h-9"
          >
            {copiedText ? (
              <>
                <CheckCheck className="h-3.5 w-3.5 text-emerald-500" /> Copied Text
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy Plain Text
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="gap-1.5 text-xs h-9"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Edits
          </Button>

          <Button
            size="sm"
            onClick={handlePrintPdf}
            className="gap-1.5 text-xs h-9 shadow-sm"
          >
            <Printer className="h-3.5 w-3.5" /> Download / Print ATS PDF
          </Button>
        </div>
      </div>

      {/* Main Split Studio Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start print:block">
        {/* Left Column: AI Intelligence & Live Editor (Hidden in Print) */}
        <div className="xl:col-span-5 space-y-5 print:hidden">
          {/* ATS Intelligence Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2.5">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                <Target className="h-4 w-4" /> ATS Alignment &amp; Keywords Woven In
              </CardTitle>
              {initialTailored.tailoringNotes && (
                <CardDescription className="text-xs text-foreground/80 leading-relaxed pt-1">
                  {initialTailored.tailoringNotes}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="pt-1">
              <div className="flex flex-wrap gap-1.5">
                {initialTailored.keywordsInjected.map((kw, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="bg-background/90 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 text-[11px]"
                  >
                    + {kw}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Interactive Section Editor */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base">Customize Resume Sections</CardTitle>
              <CardDescription className="text-xs">
                Any edits update the printable ATS sheet on the right in real time.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Tabs defaultValue="summary" className="space-y-4">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="summary" className="text-xs">Summary</TabsTrigger>
                  <TabsTrigger value="experience" className="text-xs">Experience</TabsTrigger>
                  <TabsTrigger value="skills" className="text-xs">Skills &amp; Projects</TabsTrigger>
                </TabsList>

                {/* Tab 1: Summary & Education */}
                <TabsContent value="summary" className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Variant Document Title
                    </label>
                    <Input
                      value={title}
                      onChange={(e) => {
                        markDirty();
                        setTitle(e.target.value);
                      }}
                      className="text-sm h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Tailored Professional Summary
                    </label>
                    <Textarea
                      value={summary}
                      onChange={(e) => {
                        markDirty();
                        setSummary(e.target.value);
                      }}
                      className="min-h-[130px] text-xs sm:text-sm leading-relaxed"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Education &amp; Credentials
                    </label>
                    <Input
                      value={education}
                      onChange={(e) => {
                        markDirty();
                        setEducation(e.target.value);
                      }}
                      placeholder="e.g. B.S. in Computer Science — University of California (2022)"
                      className="text-xs sm:text-sm h-9"
                    />
                  </div>
                </TabsContent>

                {/* Tab 2: Experience Bullets */}
                <TabsContent value="experience" className="space-y-5 max-h-[540px] overflow-y-auto pr-1">
                  {experiences.map((exp, expIdx) => (
                    <div key={expIdx} className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={exp.title}
                          onChange={(e) => updateExpField(expIdx, "title", e.target.value)}
                          placeholder="Role Title"
                          className="h-8 text-xs font-semibold"
                        />
                        <Input
                          value={exp.company}
                          onChange={(e) => updateExpField(expIdx, "company", e.target.value)}
                          placeholder="Company"
                          className="h-8 text-xs"
                        />
                        <Input
                          value={exp.duration}
                          onChange={(e) => updateExpField(expIdx, "duration", e.target.value)}
                          placeholder="Duration"
                          className="h-8 text-xs"
                        />
                        <Input
                          value={exp.location || ""}
                          onChange={(e) => updateExpField(expIdx, "location", e.target.value)}
                          placeholder="Location"
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold uppercase text-muted-foreground block">
                          Impact Bullet Points
                        </span>
                        {exp.bullets.map((bullet, bIdx) => (
                          <div key={bIdx} className="flex items-start gap-1.5">
                            <Textarea
                              value={bullet}
                              onChange={(e) => updateExpBullet(expIdx, bIdx, e.target.value)}
                              className="min-h-[60px] text-xs leading-relaxed"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeExpBullet(expIdx, bIdx)}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0 mt-1"
                              title="Remove bullet"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addExpBullet(expIdx)}
                          className="h-7 text-xs gap-1 w-full"
                        >
                          <Plus className="h-3 w-3" /> Add Bullet Point
                        </Button>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                {/* Tab 3: Skills & Projects */}
                <TabsContent value="skills" className="space-y-5 max-h-[540px] overflow-y-auto pr-1">
                  <div className="space-y-3">
                    <span className="text-xs font-semibold uppercase text-muted-foreground block">
                      Technical Skill Groups (Comma-Separated)
                    </span>
                    {skills.map((grp, idx) => (
                      <div key={idx} className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                        <Input
                          value={grp.category}
                          onChange={(e) => updateSkillCategory(idx, e.target.value)}
                          placeholder="Category Label"
                          className="h-8 text-xs font-semibold"
                        />
                        <Input
                          value={grp.items.join(", ")}
                          onChange={(e) => updateSkillItems(idx, e.target.value)}
                          placeholder="TypeScript, React, Next.js..."
                          className="h-8 text-xs"
                        />
                      </div>
                    ))}
                  </div>

                  {projects.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-border">
                      <span className="text-xs font-semibold uppercase text-muted-foreground block">
                        Included GitHub Proof-of-Work Projects
                      </span>
                      {projects.map((proj, pIdx) => (
                        <div key={pIdx} className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold">{proj.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeProject(pIdx)}
                              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                            >
                              Remove
                            </Button>
                          </div>
                          {proj.highlights.map((h, hIdx) => (
                            <Textarea
                              key={hIdx}
                              value={h}
                              onChange={(e) => updateProjectHighlight(pIdx, hIdx, e.target.value)}
                              className="min-h-[50px] text-xs"
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Printable Single-Page ATS Resume Sheet */}
        <div className="xl:col-span-7 print:w-full">
          <div className="bg-white text-slate-900 rounded-xl shadow-lg border border-border p-8 sm:p-11 space-y-5 print:shadow-none print:border-0 print:p-0 print:rounded-none">
            {/* Resume Header */}
            <div className="border-b-2 border-slate-900 pb-3.5 text-center space-y-1">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 uppercase">
                {candidate.name}
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-700">
                {initialTailored.targetRole}
                {candidate.headline ? ` • ${candidate.headline}` : ""}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-slate-600 pt-1">
                {candidate.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3 w-3 print:hidden" /> {candidate.email}
                  </span>
                )}
                {candidate.linkedin && (
                  <span>• {candidate.linkedin.replace(/^https?:\/\/(www\.)?/, "")}</span>
                )}
                {candidate.github && (
                  <span>• {candidate.github.replace(/^https?:\/\/(www\.)?/, "")}</span>
                )}
                {candidate.username && (
                  <span className="inline-flex items-center gap-1">
                    • <Globe className="h-3 w-3 print:hidden" /> careerpilot.app/p/{candidate.username}
                  </span>
                )}
              </div>
            </div>

            {/* Professional Summary */}
            <section className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 border-b border-slate-300 pb-0.5">
                Professional Summary
              </h3>
              <p className="text-xs sm:text-[13px] leading-relaxed text-slate-800">{summary}</p>
            </section>

            {/* Technical Skills */}
            {skills.length > 0 && (
              <section className="space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 border-b border-slate-300 pb-0.5">
                  Technical Skills
                </h3>
                <div className="space-y-1 text-xs sm:text-[13px] text-slate-800">
                  {skills.map((grp, idx) => (
                    <p key={idx} className="leading-snug">
                      <strong className="font-semibold text-slate-900">{grp.category}:</strong>{" "}
                      {grp.items.join(", ")}
                    </p>
                  ))}
                </div>
              </section>
            )}

            {/* Professional Experience */}
            {experiences.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 border-b border-slate-300 pb-0.5">
                  Professional Experience
                </h3>
                <div className="space-y-3.5">
                  {experiences.map((exp, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div>
                          <span className="font-bold text-sm text-slate-900">{exp.title}</span>
                          <span className="text-xs sm:text-[13px] font-medium text-slate-700">
                            {" "}
                            — {exp.company}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 font-medium">
                          {exp.duration}
                          {exp.location ? ` | ${exp.location}` : ""}
                        </div>
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-xs sm:text-[13px] text-slate-800 leading-snug">
                        {exp.bullets.map((bullet, bIdx) => (
                          <li key={bIdx}>{bullet}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Selected Projects / Proof-of-Work */}
            {projects.length > 0 && (
              <section className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 border-b border-slate-300 pb-0.5">
                  Selected Engineering Projects
                </h3>
                <div className="space-y-2.5">
                  {projects.map((proj, pIdx) => (
                    <div key={pIdx} className="space-y-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs sm:text-[13px] text-slate-900">
                            {proj.name}
                          </span>
                          {proj.techStack && (
                            <span className="text-xs text-slate-600 italic">({proj.techStack})</span>
                          )}
                        </div>
                        {proj.url && (
                          <a
                            href={proj.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-slate-600 hover:underline inline-flex items-center gap-0.5"
                          >
                            {proj.url.replace(/^https?:\/\/(www\.)?/, "")}
                            <ExternalLink className="h-2.5 w-2.5 print:hidden" />
                          </a>
                        )}
                      </div>
                      <ul className="list-disc pl-4 space-y-0.5 text-xs sm:text-[13px] text-slate-800 leading-snug">
                        {proj.highlights.map((h, hIdx) => (
                          <li key={hIdx}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Education */}
            {education.trim() && (
              <section className="space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 border-b border-slate-300 pb-0.5">
                  Education &amp; Credentials
                </h3>
                <p className="text-xs sm:text-[13px] text-slate-800">{education}</p>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
