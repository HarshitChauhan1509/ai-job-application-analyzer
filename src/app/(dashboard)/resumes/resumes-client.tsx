"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Upload,
  Trash2,
  Edit2,
  Star,
  CheckCircle2,
  MoreHorizontal,
  Briefcase,
  Building,
  Tag,
  Search,
  Sparkles,
  Layers,
  ArrowRight,
  Target,
  ExternalLink,
} from "lucide-react";
import { FileUploader, RESUME_TYPE_CONFIG, ResumeTypeKey } from "@/components/dashboard/file-uploader";
import { formatDate } from "@/lib/format-date";
import {
  deleteResumeAction,
  setPrimaryResumeAction,
  updateResumeMetadataAction,
} from "@/app/actions/resume";

interface JobItem {
  id: string;
  company: string;
  position: string;
  location?: string | null;
}

interface ResumeItem {
  id: string;
  name: string;
  fileUrl: string;
  isPrimary: boolean;
  resumeType?: string | null;
  targetRole?: string | null;
  targetCompany?: string | null;
  targetJobId?: string | null;
  tags?: string | null;
  createdAt: string | Date;
  analysis?: {
    overallScore: number;
    strengths?: string;
    recommendations?: string;
  } | null;
}

interface ResumesClientProps {
  initialResumes: ResumeItem[];
  jobs?: JobItem[];
  userId: string;
}

export default function ResumesClient({ initialResumes, jobs = [], userId }: ResumesClientProps) {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeItem[]>(initialResumes);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");

  // Edit Metadata Modal state
  const [editResume, setEditResume] = useState<ResumeItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<ResumeTypeKey>("FULL_STACK");
  const [editTargetRole, setEditTargetRole] = useState("");
  const [editTargetCompany, setEditTargetCompany] = useState("");
  const [editTargetJobId, setEditTargetJobId] = useState("none");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Quick Match with Job Modal state
  const [matchResume, setMatchResume] = useState<ResumeItem | null>(null);

  const openEditModal = (resume: ResumeItem) => {
    setEditResume(resume);
    setEditName(resume.name);
    setEditType((resume.resumeType as ResumeTypeKey) || "GENERAL");
    setEditTargetRole(resume.targetRole || "");
    setEditTargetCompany(resume.targetCompany || "");
    setEditTargetJobId(resume.targetJobId || "none");

    let parsedTags: string[] = [];
    if (resume.tags) {
      try {
        parsedTags = JSON.parse(resume.tags);
      } catch {
        parsedTags = resume.tags.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }
    setEditTags(parsedTags);
  };

  const handleSaveMetadata = async () => {
    if (!editResume) return;
    setIsSavingEdit(true);

    try {
      const res = await updateResumeMetadataAction({
        resumeId: editResume.id,
        userId,
        name: editName,
        resumeType: editType,
        targetRole: editTargetRole,
        targetCompany: editTargetCompany,
        targetJobId: editTargetJobId,
        tags: JSON.stringify(editTags),
      });

      if (res.success && res.resume) {
        setResumes((prev) =>
          prev.map((r) => (r.id === editResume.id ? { ...r, ...res.resume } : r))
        );
        setEditResume(null);
      } else {
        alert(res.error || "Failed to update resume details");
      }
    } catch (err) {
      console.error("Error saving resume metadata:", err);
      alert("An error occurred while updating resume metadata.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (resumeId: string) => {
    if (!confirm("Are you sure you want to delete this resume version?")) return;
    try {
      const res = await deleteResumeAction(resumeId, userId);
      if (res.success) {
        setResumes((prev) => prev.filter((r) => r.id !== resumeId));
      }
    } catch (err) {
      console.error("Error deleting resume:", err);
    }
  };

  const handleSetPrimary = async (resumeId: string) => {
    try {
      const res = await setPrimaryResumeAction(resumeId, userId);
      if (res.success) {
        setResumes((prev) =>
          prev.map((r) => ({
            ...r,
            isPrimary: r.id === resumeId,
          }))
        );
      }
    } catch (err) {
      console.error("Error setting primary resume:", err);
    }
  };

  const handleAddEditTag = () => {
    const trimmed = newTagInput.trim();
    if (trimmed && !editTags.includes(trimmed)) {
      setEditTags([...editTags, trimmed]);
      setNewTagInput("");
    }
  };

  // Filter resumes by category and search
  const filteredResumes = resumes.filter((r) => {
    const matchesType =
      selectedTypeFilter === "ALL" ||
      r.resumeType === selectedTypeFilter ||
      (!r.resumeType && selectedTypeFilter === "GENERAL");

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      r.name.toLowerCase().includes(query) ||
      (r.targetRole && r.targetRole.toLowerCase().includes(query)) ||
      (r.targetCompany && r.targetCompany.toLowerCase().includes(query)) ||
      (r.tags && r.tags.toLowerCase().includes(query));

    return matchesType && matchesSearch;
  });

  // Unique specializations count
  const specializationsCount = new Set(
    resumes.map((r) => r.resumeType || "GENERAL")
  ).size;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Resume Management</h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
              <Layers className="h-3 w-3 mr-1" /> Multi-Role Hub
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Maintain multiple targeted resume versions tailored for different job profiles, companies, and seniority levels.
          </p>
        </div>

        <Button onClick={() => setIsUploading(!isUploading)} className="w-full sm:w-auto shadow-xs gap-1.5">
          <Upload className="h-4 w-4" />
          {isUploading ? "Close Uploader" : "Upload Targeted Resume"}
        </Button>
      </div>

      {/* Upload New Resume Card */}
      {isUploading && (
        <Card className="border-primary/20 shadow-md">
          <CardHeader className="bg-primary/5 pb-4 border-b border-primary/10">
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" /> Upload New Targeted Resume
            </CardTitle>
            <CardDescription>
              Select your PDF resume and categorize it by target role, job posting, or key technical skill highlights.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <FileUploader
              userId={userId}
              jobs={jobs}
              onUploadComplete={() => {
                setIsUploading(false);
                router.refresh();
              }}
              onCancel={() => setIsUploading(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Overview Metric Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 border-border bg-card">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Total Versions</p>
          <p className="text-2xl font-bold mt-1 text-foreground">{resumes.length}</p>
        </Card>
        <Card className="p-4 border-border bg-card">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Role Profiles</p>
          <p className="text-2xl font-bold mt-1 text-primary">{specializationsCount}</p>
        </Card>
        <Card className="p-4 border-border bg-card">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Job-Tailored</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">
            {resumes.filter((r) => r.resumeType === "TAILORED" || r.targetJobId || r.targetCompany).length}
          </p>
        </Card>
        <Card className="p-4 border-border bg-card">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Target Saved Jobs</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">{jobs.length}</p>
        </Card>
      </div>

      {/* Search & Specialization Category Filter Tabs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title, role, company or tags..."
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="text-xs text-muted-foreground self-end sm:self-center">
            Showing <span className="font-semibold text-foreground">{filteredResumes.length}</span> of {resumes.length} resumes
          </div>
        </div>

        {/* Specialization Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { key: "ALL", label: "All Versions", count: resumes.length },
            {
              key: "FULL_STACK",
              label: "🌐 Full Stack",
              count: resumes.filter((r) => r.resumeType === "FULL_STACK").length,
            },
            {
              key: "FRONTEND",
              label: "🎨 Frontend",
              count: resumes.filter((r) => r.resumeType === "FRONTEND").length,
            },
            {
              key: "BACKEND",
              label: "⚙️ Backend",
              count: resumes.filter((r) => r.resumeType === "BACKEND").length,
            },
            {
              key: "DEVOPS",
              label: "☁️ DevOps / Cloud",
              count: resumes.filter((r) => r.resumeType === "DEVOPS").length,
            },
            {
              key: "DATA_AI",
              label: "🤖 Data / AI",
              count: resumes.filter((r) => r.resumeType === "DATA_AI").length,
            },
            {
              key: "MANAGEMENT",
              label: "👔 Management",
              count: resumes.filter((r) => r.resumeType === "MANAGEMENT").length,
            },
            {
              key: "TAILORED",
              label: "🎯 Job Tailored",
              count: resumes.filter((r) => r.resumeType === "TAILORED" || r.targetCompany).length,
            },
            {
              key: "GENERAL",
              label: "📄 General",
              count: resumes.filter((r) => !r.resumeType || r.resumeType === "GENERAL").length,
            },
          ]
            .filter((tab) => tab.key === "ALL" || tab.count > 0)
            .map((tab) => {
              const active = selectedTypeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setSelectedTypeFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-full font-medium transition-all shrink-0 flex items-center gap-1.5 border ${
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground border-border"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Resume Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredResumes.length === 0 ? (
          <div className="col-span-full py-16 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10 space-y-3">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
            <div className="space-y-1">
              <p className="font-semibold text-base text-foreground">No resumes matching this filter</p>
              <p className="text-xs text-muted-foreground">
                Upload a new resume tailored for this role or adjust your search filter.
              </p>
            </div>
            <Button size="sm" onClick={() => setIsUploading(true)} className="gap-1.5">
              <Upload className="h-4 w-4" /> Upload Resume for this Role
            </Button>
          </div>
        ) : (
          filteredResumes.map((resume) => {
            const score = resume.analysis?.overallScore || 0;
            const date = formatDate(resume.createdAt);

            const typeKey = (resume.resumeType as ResumeTypeKey) || "GENERAL";
            const typeConfig = RESUME_TYPE_CONFIG[typeKey] || RESUME_TYPE_CONFIG.GENERAL;

            let parsedTags: string[] = [];
            if (resume.tags) {
              try {
                parsedTags = JSON.parse(resume.tags);
              } catch {
                parsedTags = resume.tags.split(",").map((s) => s.trim()).filter(Boolean);
              }
            }

            return (
              <Card
                key={resume.id}
                className="flex flex-col hover:shadow-md transition-all group border-border/70 hover:border-primary/40 bg-card overflow-hidden"
              >
                <CardHeader className="pb-3 border-b border-border/50 bg-muted/10">
                  <div className="flex justify-between items-start gap-2">
                    {/* Specialization Badge */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className={`text-xs gap-1 py-0.5 ${typeConfig.badgeClass}`}>
                        <span>{typeConfig.icon}</span>
                        <span>{typeConfig.label}</span>
                      </Badge>
                      {resume.isPrimary && (
                        <Badge
                          variant="secondary"
                          className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-0 text-[10px] font-semibold"
                        >
                          <Star className="h-2.5 w-2.5 mr-0.5 fill-current" /> Primary
                        </Badge>
                      )}
                    </div>

                    {/* Actions Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                          />
                        }
                      >
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal size={16} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Resume Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push(`/resumes/${resume.id}`)}>
                          <FileText className="mr-2 h-4 w-4" />
                          View Detailed Analysis
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditModal(resume)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit Role & Specialization
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setMatchResume(resume)}>
                          <Target className="mr-2 h-4 w-4" />
                          Match Against a Job
                        </DropdownMenuItem>
                        {!resume.isPrimary && (
                          <DropdownMenuItem onClick={() => handleSetPrimary(resume.id)}>
                            <Star className="mr-2 h-4 w-4" />
                            Set as Primary
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(resume.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Version
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-2.5 space-y-1">
                    <CardTitle className="text-base font-bold line-clamp-1" title={resume.name}>
                      {resume.name}
                    </CardTitle>

                    {/* Target Position Info */}
                    {resume.targetRole && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                        <Briefcase className="h-3 w-3 text-primary shrink-0" />
                        <span className="truncate">{resume.targetRole}</span>
                      </p>
                    )}

                    {/* Target Company or Job badge */}
                    {(resume.targetCompany || resume.targetJobId) && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                        <Building className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          Tailored for: {resume.targetCompany || "Saved Job"}
                        </span>
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="py-4 flex-1 space-y-4">
                  {/* ATS Score Display */}
                  <div className="rounded-lg bg-muted/40 p-3.5 flex items-center justify-between border border-border/50">
                    <div>
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        ATS Quality Score
                      </span>
                      <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                        Analyzed {date}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline gap-0.5 justify-end">
                        <span className="text-2xl font-bold tracking-tight text-foreground">
                          {score}
                        </span>
                        <span className="text-xs text-muted-foreground">/100</span>
                      </div>
                      <div className="w-20 h-1.5 bg-muted-foreground/20 rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            score >= 85
                              ? "bg-green-500"
                              : score >= 70
                              ? "bg-primary"
                              : "bg-amber-500"
                          }`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Highlighted Skill Tags */}
                  {parsedTags.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                        <Tag className="h-2.5 w-2.5" /> Key Competencies
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {parsedTags.slice(0, 4).map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] py-0 px-1.5 bg-background">
                            {tag}
                          </Badge>
                        ))}
                        {parsedTags.length > 4 && (
                          <span className="text-[10px] text-muted-foreground self-center">
                            +{parsedTags.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="p-3 pt-0 flex gap-2 border-t border-border/40 bg-muted/5">
                  <Link href={`/resumes/${resume.id}`} className="flex-1">
                    <Button variant="default" size="sm" className="w-full text-xs font-semibold h-8">
                      Analysis
                    </Button>
                  </Link>

                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs font-semibold h-8 gap-1"
                    onClick={() => setMatchResume(resume)}
                  >
                    <Target className="h-3 w-3" /> Match Job
                  </Button>

                  <Link href="/improve" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs font-semibold h-8">
                      Improve
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>

      {/* Edit Resume Metadata Modal */}
      <Dialog open={!!editResume} onOpenChange={(open) => !open && setEditResume(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-primary" /> Edit Resume Specialization & Target Role
            </DialogTitle>
            <DialogDescription>
              Update which role and job types this resume version is tailored for.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-3 text-xs">
            {/* Version Title */}
            <div className="space-y-1">
              <Label htmlFor="edit-name" className="text-xs font-semibold">
                Version Title
              </Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            {/* Specialization Type */}
            <div className="space-y-1">
              <Label htmlFor="edit-type" className="text-xs font-semibold">
                Specialization Profile
              </Label>
              <Select
                value={editType}
                onValueChange={(val) => {
                  setEditType(val as ResumeTypeKey);
                  const cfg = RESUME_TYPE_CONFIG[val as ResumeTypeKey];
                  if (cfg && !editTargetRole) setEditTargetRole(cfg.label);
                }}
              >
                <SelectTrigger id="edit-type" className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RESUME_TYPE_CONFIG).map(([k, c]) => (
                    <SelectItem key={k} value={k} className="text-xs">
                      {c.icon} {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Role */}
            <div className="space-y-1">
              <Label htmlFor="edit-role" className="text-xs font-semibold">
                Target Position / Role
              </Label>
              <Input
                id="edit-role"
                value={editTargetRole}
                onChange={(e) => setEditTargetRole(e.target.value)}
                placeholder="e.g. Senior Frontend Architect"
                className="h-8 text-xs"
              />
            </div>

            {/* Target Job Association */}
            <div className="space-y-1">
              <Label htmlFor="edit-job" className="text-xs font-semibold">
                Associated Saved Job (Optional)
              </Label>
              <Select
                value={editTargetJobId}
                onValueChange={(val) => {
                  if (val) {
                    setEditTargetJobId(val);
                    if (val !== "none") {
                      const matched = jobs.find((j) => j.id === val);
                      if (matched) {
                        setEditTargetCompany(matched.company);
                        if (!editTargetRole) setEditTargetRole(matched.position);
                      }
                    }
                  }
                }}
              >
                <SelectTrigger id="edit-job" className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Select a saved job" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">
                    None — General Standalone Resume
                  </SelectItem>
                  {jobs.map((j) => (
                    <SelectItem key={j.id} value={j.id} className="text-xs">
                      {j.position} at {j.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Company */}
            <div className="space-y-1">
              <Label htmlFor="edit-company" className="text-xs font-semibold">
                Target Company or Industry
              </Label>
              <Input
                id="edit-company"
                value={editTargetCompany}
                onChange={(e) => setEditTargetCompany(e.target.value)}
                placeholder="e.g. Stripe / High-Growth Fintech"
                className="h-8 text-xs"
              />
            </div>

            {/* Tags */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold">Highlighted Competencies / Tags</Label>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {editTags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px] gap-1 pr-1">
                    {t}
                    <button
                      type="button"
                      onClick={() => setEditTags(editTags.filter((tag) => tag !== t))}
                      className="hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <Input
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddEditTag();
                    }
                  }}
                  placeholder="New tag + Enter"
                  className="h-7 text-xs"
                />
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs px-2" onClick={handleAddEditTag}>
                  Add
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditResume(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveMetadata} disabled={isSavingEdit}>
              {isSavingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Job Match Selection Modal */}
      <Dialog open={!!matchResume} onOpenChange={(open) => !open && setMatchResume(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Select a Job to Match
            </DialogTitle>
            <DialogDescription>
              Compare <span className="font-semibold text-foreground">&quot;{matchResume?.name}&quot;</span> against a saved job description to analyze keyword alignment, skills fit, and interview readiness.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-3 max-h-[300px] overflow-y-auto">
            {jobs.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                No saved jobs found in your pipeline. Import a job posting first from the Jobs page!
              </div>
            ) : (
              jobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => {
                    if (matchResume) {
                      router.push(`/match/${matchResume.id}/${job.id}`);
                    }
                  }}
                  className="p-3 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{job.position}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Building className="h-3 w-3" /> {job.company} {job.location ? `• ${job.location}` : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs shrink-0 gap-1">
                    Match <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setMatchResume(null)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
