"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  Mail,
  Briefcase,
  Globe,
  Sparkles,
  Loader2,
  FileText,
  KanbanSquare,
  Mic,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Share2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { updateProfileDataAction, ProfileData } from "@/app/actions/profile";
import { ExperienceTimeline } from "@/components/dashboard/experience-timeline";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

export default function ProfileClient({ initialProfile }: { initialProfile: ProfileData }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(initialProfile.name);
  const [headline, setHeadline] = useState(initialProfile.headline || "");
  const [bio, setBio] = useState(initialProfile.bio || "");
  const [website, setWebsite] = useState(initialProfile.website || "");
  const [linkedin, setLinkedin] = useState(initialProfile.linkedin || "");
  const [github, setGithub] = useState(initialProfile.github || "");
  const [username, setUsername] = useState(initialProfile.username || "");
  const [isPublic, setIsPublic] = useState(initialProfile.isPublic ?? true);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const slug = username || initialProfile.id;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/p/${slug}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    setCopied(true);
    toast({
      title: "Portfolio Link Copied",
      description: "Share this public portfolio link with founders, hiring managers, or on your resume.",
    });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateProfileDataAction({
        name,
        headline,
        bio,
        website,
        linkedin,
        github,
        username,
        isPublic,
      });

      if (res.success) {
        toast({
          title: "Profile Saved",
          description: "Your candidate profile and professional links have been updated.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: res.error || "Unable to save profile changes.",
        });
      }
    });
  };

  const seed = name || "User";
  const initials = (name || "US")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Candidate Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your personal details, career headline, and portfolio links across your job search.
        </p>
      </div>

      {/* Hero Overview Card */}
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 relative" />
        <CardContent className="relative pt-0 pb-6 px-6 sm:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-12 mb-6">
            <div className="flex items-end gap-4">
              <Avatar className="h-24 w-24 border-4 border-background shadow-md">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} alt={name} />
                <AvatarFallback className="bg-primary/20 text-primary font-bold text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="mb-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{name}</h2>
                  <Badge className="bg-primary/15 text-primary border-primary/20 text-xs font-semibold">
                    <Sparkles size={11} className="mr-1" /> Pro Member
                  </Badge>
                </div>
                {headline && (
                  <p className="text-xs font-medium text-primary line-clamp-1">{headline}</p>
                )}
                <p className="text-xs text-muted-foreground">{initialProfile.email}</p>
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={isPending}
              size="sm"
              className="gap-1.5 shadow-sm rounded-full px-5"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/40">
            <Link href="/resumes" className="p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors border border-border/40">
              <span className="text-lg font-bold">{initialProfile.stats.resumesCount}</span>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <FileText size={13} className="text-purple-500" /> Resumes Created
              </p>
            </Link>

            <Link href="/jobs" className="p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors border border-border/40">
              <span className="text-lg font-bold">{initialProfile.stats.jobsCount}</span>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Briefcase size={13} className="text-blue-500" /> Jobs Analyzed
              </p>
            </Link>

            <Link href="/applications" className="p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors border border-border/40">
              <span className="text-lg font-bold">{initialProfile.stats.applicationsCount}</span>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <KanbanSquare size={13} className="text-emerald-500" /> Pipeline Apps
              </p>
            </Link>

            <Link href="/coach" className="p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors border border-border/40">
              <span className="text-lg font-bold">{initialProfile.stats.interviewsCount}</span>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Mic size={13} className="text-rose-500" /> Mock Sessions
              </p>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Public Shareable Portfolio Card (Aarivi-style) */}
      <Card className="border-primary/25 bg-gradient-to-br from-primary/5 via-card to-background shadow-xs overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary shrink-0" />
                <h3 className="text-sm font-bold text-foreground">Public Shareable Portfolio</h3>
                <Badge
                  variant={isPublic ? "default" : "secondary"}
                  className={`text-[10px] py-0 px-2 font-semibold ${
                    isPublic
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isPublic ? "Public & Active" : "Private"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Recruiters and founders can view your verified work history, skills radar, and achievements at your personalized link.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="text-xs h-8 gap-1.5 bg-background shadow-xs hover:bg-muted"
              >
                {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                {copied ? "Copied Link" : "Copy Public Link"}
              </Button>

              <Link
                href={`/p/${username || initialProfile.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" className="text-xs h-8 gap-1.5 rounded-md shadow-xs">
                  <ExternalLink size={13} /> View Live Portfolio
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/50 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="custom-username" className="text-xs font-semibold text-foreground">
                Custom Portfolio Handle
              </Label>
              <div className="flex items-center rounded-md border border-input bg-background/80 h-8 px-2 text-xs focus-within:ring-1 focus-within:ring-primary">
                <span className="text-muted-foreground select-none font-mono text-[11px]">/p/</span>
                <input
                  id="custom-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                  placeholder={initialProfile.id.substring(0, 10)}
                  className="w-full bg-transparent outline-none pl-1 text-xs font-medium text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Lowercase letters, numbers, hyphens, and underscores (3–30 characters).
              </p>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0">
              <div className="flex items-center gap-2 bg-muted/30 p-2.5 rounded-lg border border-border/50">
                <Checkbox
                  id="toggle-public"
                  checked={isPublic}
                  onCheckedChange={(checked) => setIsPublic(Boolean(checked))}
                />
                <Label htmlFor="toggle-public" className="text-xs font-medium cursor-pointer select-none">
                  Make portfolio publicly visible to anyone with the link
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LinkedIn-style Experience Timeline */}
      <ExperienceTimeline initialExperiences={initialProfile.experience} />

      {/* Profile Details Edit Form */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">Professional Information</CardTitle>
          <CardDescription className="text-xs">
            This information informs your ATS resume tailoring and interview coach context.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="candidate-name" className="text-xs font-semibold">
                Full Legal Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="candidate-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Harshit Chauhan"
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="candidate-email" className="text-xs font-semibold">
                Account Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="candidate-email"
                  value={initialProfile.email}
                  disabled
                  className="pl-9 text-xs bg-muted/40 cursor-not-allowed opacity-80"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="candidate-headline" className="text-xs font-semibold">
              Professional Headline / Role Title
            </Label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="candidate-headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Senior Full Stack Engineer • Next.js, Node.js & Cloud Architecture"
                className="pl-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="candidate-bio" className="text-xs font-semibold">
              Career Summary / Bio
            </Label>
            <Textarea
              id="candidate-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Highlight your key achievements, preferred tech stack, and what you're looking for in your next role..."
              rows={4}
              className="text-xs"
            />
          </div>

          {/* Social Links */}
          <div className="pt-4 border-t border-border/40 space-y-4">
            <div>
              <h4 className="text-sm font-semibold">Online Presence &amp; Portfolio</h4>
              <p className="text-xs text-muted-foreground">Links to your public code and career profiles.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="candidate-website" className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>Portfolio Site</span>
                  {website && (
                    <a href={website.startsWith("http") ? website : `https://${website}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={11} className="text-primary" />
                    </a>
                  )}
                </Label>
                <div className="relative">
                  <Globe className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="candidate-website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://myportfolio.dev"
                    className="pl-8 text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="candidate-linkedin" className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>LinkedIn</span>
                  {linkedin && (
                    <a href={linkedin.startsWith("http") ? linkedin : `https://${linkedin}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={11} className="text-primary" />
                    </a>
                  )}
                </Label>
                <div className="relative">
                  <LinkedinIcon className="absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    id="candidate-linkedin"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="linkedin.com/in/username"
                    className="pl-8 text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="candidate-github" className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>GitHub</span>
                  {github && (
                    <a href={github.startsWith("http") ? github : `https://${github}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={11} className="text-primary" />
                    </a>
                  )}
                </Label>
                <div className="relative">
                  <GithubIcon className="absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    id="candidate-github"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    placeholder="github.com/username"
                    className="pl-8 text-xs h-9"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end pt-4 pb-6 border-t border-border/40">
          <Button
            onClick={handleSave}
            disabled={isPending}
            className="gap-1.5 rounded-full px-6"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPending ? "Saving..." : "Save Profile"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
