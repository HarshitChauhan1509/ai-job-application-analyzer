/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  UploadCloud,
  File,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building,
  Tag,
  Briefcase,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadResumeAction } from "@/app/actions/resume";

export const RESUME_TYPE_CONFIG = {
  FULL_STACK: {
    label: "Full Stack Developer",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: "🌐",
    defaultTags: ["React", "Node.js", "TypeScript", "PostgreSQL"],
  },
  FRONTEND: {
    label: "Frontend Specialist",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: "🎨",
    defaultTags: ["React", "Next.js", "TypeScript", "Tailwind CSS"],
  },
  BACKEND: {
    label: "Backend & Systems",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    icon: "⚙️",
    defaultTags: ["Node.js", "Python", "Go", "Distributed Systems", "SQL"],
  },
  DEVOPS: {
    label: "DevOps & Cloud Infrastructure",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    icon: "☁️",
    defaultTags: ["Docker", "Kubernetes", "AWS", "CI/CD", "Terraform"],
  },
  DATA_AI: {
    label: "Data Science & AI / ML",
    badgeClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    icon: "🤖",
    defaultTags: ["Python", "PyTorch", "Data Pipelines", "LLMs", "SQL"],
  },
  MANAGEMENT: {
    label: "Engineering Manager / Lead",
    badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    icon: "👔",
    defaultTags: ["Agile Delivery", "Mentorship", "System Architecture", "Hiring"],
  },
  TAILORED: {
    label: "Specific Job Tailored",
    badgeClass: "bg-primary/10 text-primary border-primary/20",
    icon: "🎯",
    defaultTags: ["Custom Tailored", "Target Match"],
  },
  GENERAL: {
    label: "General Software Engineer",
    badgeClass: "bg-muted text-muted-foreground border-border",
    icon: "📄",
    defaultTags: ["Software Engineering", "Problem Solving"],
  },
} as const;

export type ResumeTypeKey = keyof typeof RESUME_TYPE_CONFIG;

interface SavedJobOption {
  id: string;
  company: string;
  position: string;
}

interface FileUploaderProps {
  userId: string;
  jobs?: SavedJobOption[];
  onUploadComplete?: (file: File) => void;
  onCancel?: () => void;
}

export function FileUploader({ userId, jobs = [], onUploadComplete, onCancel }: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Resume metadata configuration
  const [resumeName, setResumeName] = useState("");
  const [resumeType, setResumeType] = useState<ResumeTypeKey>("FULL_STACK");
  const [targetRole, setTargetRole] = useState("Full Stack Developer");
  const [targetJobId, setTargetJobId] = useState<string>("none");
  const [targetCompany, setTargetCompany] = useState("");
  const [tags, setTags] = useState<string[]>([...RESUME_TYPE_CONFIG.FULL_STACK.defaultTags]);
  const [customTagInput, setCustomTagInput] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (selectedFile: File) => {
    setError(null);
    if (selectedFile.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return false;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB.");
      return false;
    }
    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
        if (!resumeName) {
          setResumeName(droppedFile.name.replace(/\.[^/.]+$/, ""));
        }
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        if (!resumeName) {
          setResumeName(selectedFile.name.replace(/\.[^/.]+$/, ""));
        }
      }
    }
  };

  const handleTypeChange = (type: ResumeTypeKey) => {
    setResumeType(type);
    const config = RESUME_TYPE_CONFIG[type];
    if (config) {
      setTargetRole(config.label);
      setTags([...config.defaultTags]);
    }
  };

  const handleJobSelect = (jobId: string | null) => {
    if (!jobId) return;
    setTargetJobId(jobId);
    if (jobId === "none") return;

    const matchedJob = jobs.find((j) => j.id === jobId);
    if (matchedJob) {
      setTargetRole(matchedJob.position);
      setTargetCompany(matchedJob.company);
      setResumeType("TAILORED");
      if (!resumeName || resumeName.startsWith("Resume")) {
        setResumeName(`${matchedJob.position} - ${matchedJob.company}`);
      }
    }
  };

  const handleAddTag = () => {
    const trimmed = customTagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setCustomTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleUpload = async () => {
    if (!file || !userId) return;

    setIsUploading(true);
    setUploadProgress(15);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);
      formData.append("name", resumeName.trim() || file.name);
      formData.append("resumeType", resumeType);
      formData.append("targetRole", targetRole.trim());
      formData.append("targetCompany", targetCompany.trim());
      formData.append("targetJobId", targetJobId);
      formData.append("tags", JSON.stringify(tags));

      const interval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 15, 90));
      }, 250);

      const result = await uploadResumeAction(formData);
      clearInterval(interval);

      if (result.success) {
        setUploadProgress(100);
        setTimeout(() => {
          setIsUploading(false);
          if (onUploadComplete) onUploadComplete(file);
        }, 500);
      } else {
        throw new Error(result.error || "Failed to upload");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during upload.");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="w-full space-y-6">
      {!file ? (
        <div
          className={cn(
            "relative flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl transition-all bg-muted/20 cursor-pointer",
            dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/40",
            error ? "border-destructive/50 bg-destructive/5" : ""
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleChange}
          />
          <div className="flex flex-col items-center justify-center space-y-3 text-center">
            <div className="p-4 bg-background rounded-full shadow-xs border border-border">
              <UploadCloud className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                <span className="text-primary hover:underline">Click to upload resume</span> or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                Supports PDF up to 10MB • Upload different versions tailored for specific roles
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* File Selected Strip */}
          <div className="flex items-center gap-3 p-3.5 rounded-lg border border-border bg-muted/30">
            <div className="p-2 bg-primary/10 rounded-md text-primary shrink-0">
              <File className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            {!isUploading && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive h-8 w-8"
                onClick={() => setFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Resume Type & Tailoring Metadata Form */}
          <div className="p-4 rounded-xl border border-primary/20 bg-card space-y-4 shadow-xs">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Layers className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-bold text-foreground">Resume Specialization & Job Targeting</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Resume Title / Name */}
              <div className="space-y-1.5">
                <Label htmlFor="resume-name" className="text-xs font-semibold">
                  Resume Title / Version Name
                </Label>
                <Input
                  id="resume-name"
                  value={resumeName}
                  onChange={(e) => setResumeName(e.target.value)}
                  placeholder="e.g. Senior Frontend Specialist - React/Next.js"
                  className="h-9 text-xs"
                  disabled={isUploading}
                />
              </div>

              {/* Resume Type / Category */}
              <div className="space-y-1.5">
                <Label htmlFor="resume-type" className="text-xs font-semibold">
                  Resume Specialization Type
                </Label>
                <Select
                  value={resumeType}
                  onValueChange={(val) => handleTypeChange(val as ResumeTypeKey)}
                  disabled={isUploading}
                >
                  <SelectTrigger id="resume-type" className="h-9 text-xs bg-background">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RESUME_TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        <span className="mr-1.5">{config.icon}</span> {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Role */}
              <div className="space-y-1.5">
                <Label htmlFor="target-role" className="text-xs font-semibold flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" /> Target Position / Role
                </Label>
                <Input
                  id="target-role"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Lead Frontend Engineer"
                  className="h-9 text-xs"
                  disabled={isUploading}
                />
              </div>

              {/* Saved Job Association */}
              <div className="space-y-1.5">
                <Label htmlFor="target-job" className="text-xs font-semibold flex items-center gap-1">
                  <Building className="h-3.5 w-3.5 text-muted-foreground" /> Tailor for Specific Job (Optional)
                </Label>
                <Select value={targetJobId} onValueChange={handleJobSelect} disabled={isUploading}>
                  <SelectTrigger id="target-job" className="h-9 text-xs bg-background">
                    <SelectValue placeholder="Select a saved job..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">
                      None — Standalone Resume Version
                    </SelectItem>
                    {jobs.map((j) => (
                      <SelectItem key={j.id} value={j.id} className="text-xs">
                        {j.position} at {j.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Target Company (if not linking from saved job) */}
            {targetJobId === "none" && (
              <div className="space-y-1.5">
                <Label htmlFor="target-company" className="text-xs font-semibold">
                  Target Company or Industry (Optional)
                </Label>
                <Input
                  id="target-company"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  placeholder="e.g. FAANG / FinTech / Stripe"
                  className="h-9 text-xs"
                  disabled={isUploading}
                />
              </div>
            )}

            {/* Key Skill Tags */}
            <div className="space-y-2 pt-1 border-t border-border/50">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Tag className="h-3 w-3 text-muted-foreground" /> Primary Skill Highlights
                </Label>
                <span className="text-[10px] text-muted-foreground">Highlighted for recruiter filtering</span>
              </div>
              <div className="flex flex-wrap gap-1.5 items-center">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs gap-1 pr-1 bg-muted">
                    {t}
                    {!isUploading && (
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => handleRemoveTag(t)}
                      />
                    )}
                  </Badge>
                ))}
                {!isUploading && (
                  <div className="flex items-center gap-1">
                    <Input
                      value={customTagInput}
                      onChange={(e) => setCustomTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="Add tag + Enter"
                      className="h-7 text-xs w-28"
                    />
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs px-2" onClick={handleAddTag}>
                      +
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {isUploading && (
            <div className="w-full space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground font-medium">
                <span>Uploading and indexing resume version...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" onClick={onCancel} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={isUploading} className="shadow-xs gap-1.5">
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Save Resume Version
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="flex items-center text-sm text-destructive font-medium mt-3">
          <AlertCircle className="w-4 h-4 mr-1.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
