"use client";

import { useState, useTransition } from "react";
import {
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  MapPin,
  Sparkles,
  Loader2,
  Building2,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ExperienceItem,
  addExperienceAction,
  updateExperienceAction,
  deleteExperienceAction,
  importExperienceFromResumeAction,
} from "@/app/actions/profile";
import { useToast } from "@/hooks/use-toast";

export function formatMonthYear(val?: string): string {
  if (!val) return "";
  const parts = val.split("-");
  if (parts.length >= 2) {
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${months[monthIdx]} ${year}`;
    }
  }
  return val;
}

export function calculateDuration(startDate: string, endDate?: string, isCurrent?: boolean): string {
  if (!startDate) return "";
  const [startYear, startMonth] = startDate.split("-").map(Number);
  if (!startYear || !startMonth) return "";

  let endYear: number;
  let endMonth: number;

  if (isCurrent || !endDate) {
    const now = new Date();
    endYear = now.getFullYear();
    endMonth = now.getMonth() + 1;
  } else {
    const [y, m] = endDate.split("-").map(Number);
    if (!y || !m) return "";
    endYear = y;
    endMonth = m;
  }

  const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
  if (totalMonths <= 0) return "1 mo";

  const years = Math.floor(totalMonths / 12);
  const remainingMonths = totalMonths % 12;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "yr" : "yrs"}`);
  if (remainingMonths > 0) parts.push(`${remainingMonths} ${remainingMonths === 1 ? "mo" : "mos"}`);

  return parts.join(" ") || "1 mo";
}

export function calculateTotalExperience(experiences: ExperienceItem[]): string {
  if (!experiences || experiences.length === 0) return "0 yrs";

  let totalMonths = 0;
  for (const exp of experiences) {
    if (!exp.startDate) continue;
    const [sy, sm] = exp.startDate.split("-").map(Number);
    if (!sy || !sm) continue;

    let ey: number;
    let em: number;
    if (exp.isCurrent || !exp.endDate) {
      const now = new Date();
      ey = now.getFullYear();
      em = now.getMonth() + 1;
    } else {
      const [y, m] = exp.endDate.split("-").map(Number);
      ey = y || sy;
      em = m || sm;
    }

    const diff = (ey - sy) * 12 + (em - sm) + 1;
    if (diff > 0) totalMonths += diff;
  }

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (years === 0 && months === 0) return "< 1 yr";
  if (years > 0 && months > 0) return `${years}+ yrs`;
  if (years > 0) return `${years} ${years === 1 ? "yr" : "yrs"}`;
  return `${months} mos`;
}

interface ExperienceTimelineProps {
  initialExperiences?: ExperienceItem[];
  onExperienceChange?: (experiences: ExperienceItem[]) => void;
  readOnly?: boolean;
}

export function ExperienceTimeline({
  initialExperiences = [],
  onExperienceChange,
  readOnly = false,
}: ExperienceTimelineProps) {
  const { toast } = useToast();
  const [experiences, setExperiences] = useState<ExperienceItem[]>(initialExperiences);
  const [isPending, startTransition] = useTransition();

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ExperienceItem | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [location, setLocation] = useState("");
  const [locationType, setLocationType] = useState("On-site");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);
  const [description, setDescription] = useState("");
  const [skillsText, setSkillsText] = useState("");

  const resetForm = () => {
    setEditingItem(null);
    setTitle("");
    setCompany("");
    setEmploymentType("Full-time");
    setLocation("");
    setLocationType("On-site");
    setStartDate("");
    setEndDate("");
    setIsCurrent(false);
    setDescription("");
    setSkillsText("");
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (item: ExperienceItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setCompany(item.company);
    setEmploymentType(item.employmentType || "Full-time");
    setLocation(item.location || "");
    setLocationType(item.locationType || "On-site");
    setStartDate(item.startDate || "");
    setEndDate(item.endDate || "");
    setIsCurrent(item.isCurrent || false);
    setDescription(item.description || "");
    setSkillsText(item.skills ? item.skills.join(", ") : "");
    setDialogOpen(true);
  };

  const handleSaveExperience = () => {
    if (!title.trim() || !company.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please specify both Job Title and Company name.",
      });
      return;
    }

    if (!startDate) {
      toast({
        variant: "destructive",
        title: "Start Date Required",
        description: "Please select when you started this position.",
      });
      return;
    }

    const parsedSkills = skillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    startTransition(async () => {
      if (editingItem) {
        const updated: ExperienceItem = {
          ...editingItem,
          title: title.trim(),
          company: company.trim(),
          employmentType,
          location: location.trim() || undefined,
          locationType,
          startDate,
          endDate: isCurrent ? undefined : endDate || undefined,
          isCurrent,
          description: description.trim() || undefined,
          skills: parsedSkills.length > 0 ? parsedSkills : undefined,
        };

        const res = await updateExperienceAction(updated);
        if (res.success && res.experience) {
          setExperiences(res.experience);
          onExperienceChange?.(res.experience);
          setDialogOpen(false);
          toast({
            title: "Experience Updated",
            description: `${title} at ${company} has been saved.`,
          });
        } else {
          toast({
            variant: "destructive",
            title: "Save Failed",
            description: res.error || "Could not update experience.",
          });
        }
      } else {
        const newItem: Omit<ExperienceItem, "id"> = {
          title: title.trim(),
          company: company.trim(),
          employmentType,
          location: location.trim() || undefined,
          locationType,
          startDate,
          endDate: isCurrent ? undefined : endDate || undefined,
          isCurrent,
          description: description.trim() || undefined,
          skills: parsedSkills.length > 0 ? parsedSkills : undefined,
        };

        const res = await addExperienceAction(newItem);
        if (res.success && res.experience) {
          setExperiences(res.experience);
          onExperienceChange?.(res.experience);
          setDialogOpen(false);
          toast({
            title: "Experience Added",
            description: `${title} at ${company} added to your career timeline.`,
          });
        } else {
          toast({
            variant: "destructive",
            title: "Add Failed",
            description: res.error || "Could not add experience.",
          });
        }
      }
    });
  };

  const handleDeleteExperience = (id: string, roleName: string) => {
    if (!confirm(`Are you sure you want to remove "${roleName}" from your experience timeline?`)) {
      return;
    }

    startTransition(async () => {
      const res = await deleteExperienceAction(id);
      if (res.success && res.experience) {
        setExperiences(res.experience);
        onExperienceChange?.(res.experience);
        toast({
          title: "Position Removed",
          description: "Role has been removed from your timeline.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Delete Failed",
          description: res.error || "Unable to remove position.",
        });
      }
    });
  };

  const handleImportResume = () => {
    startTransition(async () => {
      const res = await importExperienceFromResumeAction();
      if (res.success && res.experience) {
        setExperiences(res.experience);
        onExperienceChange?.(res.experience);
        toast({
          title: "Experience Imported",
          description: res.importedCount
            ? `Successfully populated ${res.importedCount} positions into your timeline.`
            : "Your experience timeline is already up to date.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: res.error || "Could not import experience from resume.",
        });
      }
    });
  };

  const totalExp = calculateTotalExperience(experiences);

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <CardHeader className="pb-4 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-bold">Experience Timeline</CardTitle>
                <Badge variant="outline" className="text-[11px] font-semibold py-0 px-2 bg-muted/30">
                  {totalExp} Experience
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                LinkedIn-style work history, achievements, and technical competencies.
              </CardDescription>
            </div>
          </div>

          {!readOnly && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleImportResume}
                disabled={isPending}
                className="text-xs h-8 gap-1.5 border-border/70 hover:bg-muted/60"
                title="Populate timeline roles from your primary resume"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                )}
                <span className="hidden sm:inline">Import from</span> Resume
              </Button>

              <Button
                size="sm"
                onClick={openAddDialog}
                disabled={isPending}
                className="text-xs h-8 gap-1.5 shadow-sm rounded-md"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Position
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-6 pb-6 px-4 sm:px-6">
        {experiences.length === 0 ? (
          <div className="py-12 px-4 text-center border-2 border-dashed border-border/60 rounded-xl bg-muted/10">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center mb-3">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No Experience Added Yet</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-5">
              Build your professional career timeline like LinkedIn. Adding positions highlights your
              career growth and powers up ATS keyword scoring and AI interview coach questions.
            </p>
            {!readOnly && (
              <div className="flex items-center justify-center gap-3">
                <Button size="sm" onClick={openAddDialog} className="gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Add First Position
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleImportResume}
                  disabled={isPending}
                  className="gap-1.5 text-xs"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Auto-Populate From Resume
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="relative pl-2 sm:pl-4 space-y-8">
            {experiences.map((exp, idx) => {
              const startFormatted = formatMonthYear(exp.startDate);
              const endFormatted = exp.isCurrent ? "Present" : formatMonthYear(exp.endDate);
              const duration = calculateDuration(exp.startDate, exp.endDate, exp.isCurrent);
              const isLast = idx === experiences.length - 1;

              // Company Monogram
              const companyInitials = (exp.company || "Co")
                .split(" ")
                .map((w) => w[0])
                .join("")
                .substring(0, 2)
                .toUpperCase();

              return (
                <div key={exp.id} className="relative flex gap-4 group">
                  {/* Vertical Timeline Spine */}
                  {!isLast && (
                    <div className="absolute left-[19px] top-10 bottom-[-32px] w-[2px] bg-border/80 group-hover:bg-primary/30 transition-colors" />
                  )}

                  {/* Company Monogram Badge */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="h-10 w-10 rounded-lg bg-card border-2 border-border shadow-xs flex items-center justify-center font-bold text-xs text-foreground group-hover:border-primary/50 transition-colors shrink-0">
                      {companyInitials}
                    </div>
                  </div>

                  {/* Role Details */}
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm sm:text-base text-foreground leading-tight">
                            {exp.title}
                          </h4>
                          {exp.isCurrent && (
                            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-semibold py-0 px-1.5">
                              Current Role
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-foreground/90 font-medium mt-0.5">
                          <span>{exp.company}</span>
                          {exp.employmentType && (
                            <>
                              <span className="text-muted-foreground/60">•</span>
                              <span className="text-muted-foreground">{exp.employmentType}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action buttons (Edit & Delete) */}
                      {!readOnly && (
                        <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity self-start mt-1 sm:mt-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(exp)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="Edit position"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="sr-only">Edit position</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteExperience(exp.id, exp.title)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete position"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="sr-only">Delete position</span>
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Timeline dates & duration */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 flex-wrap">
                      <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      <span>
                        {startFormatted} – {endFormatted}
                      </span>
                      {duration && (
                        <>
                          <span className="text-muted-foreground/60">•</span>
                          <span className="font-medium text-foreground/80">{duration}</span>
                        </>
                      )}
                    </div>

                    {/* Location & location type */}
                    {(exp.location || exp.locationType) && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <span>
                          {exp.location ? exp.location : ""}
                          {exp.location && exp.locationType ? " · " : ""}
                          {exp.locationType ? exp.locationType : ""}
                        </span>
                      </div>
                    )}

                    {/* Description bullet points */}
                    {exp.description && (
                      <div className="mt-2.5 text-xs text-foreground/85 leading-relaxed whitespace-pre-line bg-muted/20 p-3 rounded-lg border border-border/40">
                        {exp.description}
                      </div>
                    )}

                    {/* Skills pills */}
                    {exp.skills && exp.skills.length > 0 && (
                      <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold text-muted-foreground mr-0.5">
                          Skills:
                        </span>
                        {exp.skills.map((skill, sIdx) => (
                          <Badge
                            key={sIdx}
                            variant="secondary"
                            className="text-[11px] py-0 px-2 bg-muted/60 text-foreground hover:bg-muted font-medium border-border/50"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Add / Edit Experience Dialog Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingItem ? "Edit Experience" : "Add Experience"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add your career history and highlight your key contributions, tech stack, and impact.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title / Role */}
            <div className="space-y-1.5">
              <Label htmlFor="exp-title" className="text-xs font-semibold">
                Title / Role <span className="text-destructive">*</span>
              </Label>
              <Input
                id="exp-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Full Stack Engineer"
                className="text-xs"
              />
            </div>

            {/* Employment Type & Company */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exp-employment-type" className="text-xs font-semibold">
                  Employment Type
                </Label>
                <Select value={employmentType} onValueChange={(val) => val && setEmploymentType(val)}>
                  <SelectTrigger id="exp-employment-type" className="w-full text-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Internship">Internship</SelectItem>
                    <SelectItem value="Freelance">Freelance</SelectItem>
                    <SelectItem value="Self-employed">Self-employed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exp-company" className="text-xs font-semibold">
                  Company Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="exp-company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Google, Microsoft, Startup"
                  className="text-xs"
                />
              </div>
            </div>

            {/* Location & Location Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exp-location" className="text-xs font-semibold">
                  Location
                </Label>
                <Input
                  id="exp-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA or Bengaluru"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exp-location-type" className="text-xs font-semibold">
                  Location Type
                </Label>
                <Select value={locationType} onValueChange={(val) => val && setLocationType(val)}>
                  <SelectTrigger id="exp-location-type" className="w-full text-xs">
                    <SelectValue placeholder="Select location type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="On-site">On-site</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                    <SelectItem value="Remote">Remote</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Current Role Checkbox */}
            <div className="flex items-center gap-2 pt-1 pb-1">
              <Checkbox
                id="exp-current"
                checked={isCurrent}
                onCheckedChange={(checked) => setIsCurrent(Boolean(checked))}
              />
              <Label
                htmlFor="exp-current"
                className="text-xs font-medium cursor-pointer select-none text-foreground"
              >
                I am currently working in this role
              </Label>
            </div>

            {/* Dates: Start & End */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exp-start-date" className="text-xs font-semibold">
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="exp-start-date"
                  type="month"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="exp-end-date"
                  className={`text-xs font-semibold ${isCurrent ? "opacity-50" : ""}`}
                >
                  End Date {isCurrent && "(Present)"}
                </Label>
                <Input
                  id="exp-end-date"
                  type="month"
                  value={endDate}
                  disabled={isCurrent}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Description / Achievements */}
            <div className="space-y-1.5">
              <Label htmlFor="exp-description" className="text-xs font-semibold">
                Role Description & Key Achievements
              </Label>
              <Textarea
                id="exp-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={"• Architected and scaled distributed backend services using Node.js and PostgreSQL.\n• Reduced page load times by 45% by implementing Next.js streaming SSR.\n• Mentored a team of 4 junior developers and led weekly sprint grooming."}
                rows={4}
                className="text-xs leading-relaxed"
              />
            </div>

            {/* Skills & Technologies */}
            <div className="space-y-1.5">
              <Label htmlFor="exp-skills" className="text-xs font-semibold">
                Skills & Technologies (comma separated)
              </Label>
              <Input
                id="exp-skills"
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                placeholder="React, TypeScript, Next.js, PostgreSQL, Docker, AWS"
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveExperience}
              disabled={isPending}
              className="text-xs gap-1.5"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingItem ? "Update Position" : "Add to Timeline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
