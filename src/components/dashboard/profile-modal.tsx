"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Briefcase,
  Globe,
  Sparkles,
  Loader2,
  CheckCircle2,
  FileText,
  KanbanSquare,
  Mic,
  Camera,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { getProfileDataAction, updateProfileDataAction, ProfileData } from "@/app/actions/profile";
import { calculateTotalExperience } from "@/components/dashboard/experience-timeline";
import { useToast } from "@/hooks/use-toast";

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

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialUser?: any;
}

export function ProfileModal({ open, onOpenChange, initialUser }: ProfileModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState(initialUser?.name || "");
  const [headline, setHeadline] = useState(initialUser?.profile?.headline || "");
  const [bio, setBio] = useState(initialUser?.profile?.bio || "");
  const [website, setWebsite] = useState(initialUser?.profile?.website || "");
  const [linkedin, setLinkedin] = useState(initialUser?.profile?.linkedin || "");
  const [github, setGithub] = useState(initialUser?.profile?.github || "");

  // Load profile data on open
  useEffect(() => {
    if (open) {
      setLoading(true);
      getProfileDataAction().then((res) => {
        setLoading(false);
        if (res.success && res.profile) {
          setProfile(res.profile);
          setName(res.profile.name);
          setHeadline(res.profile.headline || "");
          setBio(res.profile.bio || "");
          setWebsite(res.profile.website || "");
          setLinkedin(res.profile.linkedin || "");
          setGithub(res.profile.github || "");
        }
      });
    }
  }, [open]);

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateProfileDataAction({
        name,
        headline,
        bio,
        website,
        linkedin,
        github,
      });

      if (res.success) {
        toast({
          title: "Profile Updated",
          description: "Your professional candidate details have been saved successfully.",
        });
        onOpenChange(false);
      } else {
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: res.error || "Unable to save profile changes.",
        });
      }
    });
  };

  const seed = name || initialUser?.name || "User";
  const initials = (name || "US")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Profile Card Header Banner */}
        <div className="relative h-28 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 border-b border-border/50">
          <div className="absolute -bottom-8 left-6 flex items-end gap-3">
            <div className="relative group">
              <Avatar className="h-18 w-18 border-4 border-background shadow-lg">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} alt={name} />
                <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="mb-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary font-semibold text-[11px] gap-1">
                <Sparkles size={11} /> Pro Candidate
              </Badge>
            </div>
          </div>
        </div>

        <div className="pt-10 px-6 pb-6 space-y-6">
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold">{name || "Candidate Profile"}</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {headline || "Engineer & Problem Solver • Manage your professional identity"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Quick Metrics Banner */}
          {profile?.stats && (
            <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-muted/30 border border-border/50 text-center">
              <div className="space-y-0.5">
                <span className="text-lg font-bold text-foreground">{profile.stats.resumesCount}</span>
                <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                  <FileText size={12} className="text-purple-500" /> Resumes
                </p>
              </div>
              <div className="space-y-0.5 border-x border-border/50">
                <span className="text-lg font-bold text-foreground">{profile.stats.applicationsCount}</span>
                <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                  <KanbanSquare size={12} className="text-blue-500" /> Pipeline
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-lg font-bold text-foreground">{profile.stats.interviewsCount}</span>
                <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                  <Mic size={12} className="text-rose-500" /> Mock Sessions
                </p>
              </div>
            </div>
          )}

          {/* Experience Timeline Banner Link */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <Briefcase size={15} />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  Experience Timeline
                  {profile?.experience && profile.experience.length > 0 && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                      {calculateTotalExperience(profile.experience)}
                    </Badge>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {profile?.experience && profile.experience.length > 0
                    ? `${profile.experience.length} position${profile.experience.length === 1 ? "" : "s"} on your LinkedIn-style timeline`
                    : "Add work history & achievements like LinkedIn"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {profile?.username && (
                <Link
                  href={`/p/${profile.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onOpenChange(false)}
                >
                  <Button variant="ghost" size="sm" className="text-xs h-7 gap-1 text-primary hover:bg-primary/10">
                    <ExternalLink size={12} /> Portfolio
                  </Button>
                </Link>
              )}
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  router.push("/profile");
                }}
                className="text-xs h-7 gap-1"
              >
                Manage <ChevronRight size={12} />
              </Button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="profile-name" className="text-xs font-semibold">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="profile-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Harshit Chauhan"
                    className="pl-9 h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profile-email" className="text-xs font-semibold">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="profile-email"
                    value={profile?.email || initialUser?.email || "harshit@gmail.com"}
                    disabled
                    className="pl-9 h-9 text-xs bg-muted/40 cursor-not-allowed opacity-80"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-headline" className="text-xs font-semibold">
                Professional Headline
              </Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="profile-headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Senior Full Stack Engineer • Next.js & Distributed Systems"
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-bio" className="text-xs font-semibold">
                About &amp; Career Summary
              </Label>
              <Textarea
                id="profile-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Brief summary of your technical background, core specialties, and what drives your engineering impact..."
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            {/* Social & Portfolio Links */}
            <div className="pt-2 space-y-3">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                Portfolio &amp; Social Presence
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="profile-website" className="text-[11px] text-muted-foreground">
                    Portfolio / Website
                  </Label>
                  <div className="relative">
                    <Globe className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      id="profile-website"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://mysite.dev"
                      className="pl-8 h-8 text-[11px]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="profile-linkedin" className="text-[11px] text-muted-foreground">
                    LinkedIn URL
                  </Label>
                  <div className="relative">
                    <LinkedinIcon className="absolute left-2.5 top-2.5 text-muted-foreground" />
                    <Input
                      id="profile-linkedin"
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      placeholder="linkedin.com/in/username"
                      className="pl-8 h-8 text-[11px]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="profile-github" className="text-[11px] text-muted-foreground">
                    GitHub Profile
                  </Label>
                  <div className="relative">
                    <GithubIcon className="absolute left-2.5 top-2.5 text-muted-foreground" />
                    <Input
                      id="profile-github"
                      value={github}
                      onChange={(e) => setGithub(e.target.value)}
                      placeholder="github.com/username"
                      className="pl-8 h-8 text-[11px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-border/50 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isPending || loading}
              className="text-xs gap-1.5"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isPending ? "Saving Changes..." : "Save Profile"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
