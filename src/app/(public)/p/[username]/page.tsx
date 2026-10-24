import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExperienceTimeline } from "@/components/dashboard/experience-timeline";
import { getPublicProfileByUsernameAction } from "@/app/actions/profile";
import {
  Briefcase,
  Globe,
  ExternalLink,
  Download,
  Mail,
  Sparkles,
  MapPin,
  CheckCircle2,
  Code2,
  Layers,
  ArrowRight,
  Star,
  GitFork,
  FolderGit2,
} from "lucide-react";

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const res = await getPublicProfileByUsernameAction(username);

  if (!res.success || !res.profile) {
    return {
      title: "Portfolio Not Found | CareerPilot",
      description: "The requested candidate portfolio is private or does not exist.",
    };
  }

  const p = res.profile;
  const title = `${p.name} — ${p.headline || "Software Engineer & Builder"} | CareerPilot`;
  const desc = p.bio || `${p.name}'s verified career history, projects, and technical skills.`;

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
    },
  };
}

export default async function PublicPortfolioPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const res = await getPublicProfileByUsernameAction(username);

  if (!res.success || !res.profile) {
    notFound();
  }

  const profile = res.profile;
  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  const seed = profile.username || profile.name;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-primary text-primary-foreground p-1 rounded-md group-hover:scale-105 transition-transform">
              <Briefcase size={16} />
            </div>
            <span className="font-bold text-sm tracking-tight">CareerPilot</span>
            <Badge variant="outline" className="text-[10px] font-normal py-0 px-1.5 ml-1 hidden sm:inline-flex">
              Public Portfolio
            </Badge>
          </Link>

          <div className="flex items-center gap-2.5">
            <Link href="/register">
              <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5 rounded-full">
                <Sparkles size={12} className="text-primary" />
                Build Your Portfolio
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8">
        {/* Hero Card */}
        <div className="relative rounded-2xl border border-border/70 bg-card overflow-hidden shadow-sm">
          {/* Banner Graphic */}
          <div className="h-36 sm:h-44 bg-gradient-to-r from-primary/25 via-primary/10 to-accent/25 relative" />

          <div className="relative px-6 sm:px-8 pb-8 pt-0">
            {/* Avatar & Header Info */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-6">
              <div className="flex items-end gap-4">
                <Avatar className="h-28 w-28 sm:h-32 sm:w-32 border-4 border-background shadow-xl ring-2 ring-border/50">
                  <AvatarImage src={profile.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} alt={profile.name} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-3xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="mb-2 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                      {profile.name}
                    </h1>
                    <Badge className="bg-primary/15 text-primary border-primary/25 text-xs font-semibold gap-1">
                      <CheckCircle2 size={12} /> Verified Candidate
                    </Badge>
                  </div>
                  {profile.headline && (
                    <p className="text-sm sm:text-base font-medium text-foreground/90">
                      {profile.headline}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap pt-2 sm:pt-0">
                {profile.resumeDownloadUrl && (
                  <a
                    href={profile.resumeDownloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={profile.resumeName || "Resume.pdf"}
                  >
                    <Button size="sm" className="gap-1.5 shadow-sm rounded-full text-xs h-9 px-4">
                      <Download size={13} /> Download CV
                    </Button>
                  </a>
                )}

                {profile.linkedin && (
                  <a
                    href={profile.linkedin.startsWith("http") ? profile.linkedin : `https://${profile.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="outline" className="gap-1.5 rounded-full text-xs h-9 px-3.5">
                      <LinkedinIcon /> Connect
                    </Button>
                  </a>
                )}
              </div>
            </div>

            {/* Candidate Bio */}
            {profile.bio && (
              <div className="pt-2 pb-4 text-xs sm:text-sm text-foreground/85 leading-relaxed max-w-3xl whitespace-pre-line border-t border-border/40">
                {profile.bio}
              </div>
            )}

            {/* Social & Portfolio Links */}
            <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-border/40 text-xs">
              {profile.website && (
                <a
                  href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted text-foreground transition-colors border border-border/50 font-medium"
                >
                  <Globe size={13} className="text-primary" />
                  <span>Portfolio Site</span>
                  <ExternalLink size={10} className="text-muted-foreground ml-0.5" />
                </a>
              )}

              {profile.github && (
                <a
                  href={profile.github.startsWith("http") ? profile.github : `https://${profile.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted text-foreground transition-colors border border-border/50 font-medium"
                >
                  <GithubIcon />
                  <span>GitHub</span>
                  <ExternalLink size={10} className="text-muted-foreground ml-0.5" />
                </a>
              )}

              {profile.linkedin && (
                <a
                  href={profile.linkedin.startsWith("http") ? profile.linkedin : `https://${profile.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted text-foreground transition-colors border border-border/50 font-medium"
                >
                  <LinkedinIcon />
                  <span>LinkedIn</span>
                  <ExternalLink size={10} className="text-muted-foreground ml-0.5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Technical Skills & Competencies */}
        {profile.skills.length > 0 && (
          <Card className="border-border/70 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                  <Code2 size={15} />
                </div>
                <CardTitle className="text-base font-bold">Skills &amp; Technologies</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 flex-wrap">
                {profile.skills.map((skill, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="text-xs py-1 px-3 bg-muted/60 hover:bg-muted font-medium border-border/60 transition-colors"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Proof of Work / Featured Open-Source Projects */}
        {profile.githubProjects && profile.githubProjects.length > 0 && (
          <Card className="border-border/70 shadow-xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                  <FolderGit2 size={15} />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Proof of Work &amp; Open Source</CardTitle>
                  <p className="text-xs text-muted-foreground">Public repositories and featured software builds</p>
                </div>
              </div>
              {profile.github && (
                <a
                  href={profile.github.startsWith("http") ? profile.github : `https://${profile.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                >
                  <GithubIcon />
                  <span>View GitHub</span>
                  <ExternalLink size={10} />
                </a>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {profile.githubProjects.map((repo) => (
                  <div
                    key={repo.id}
                    className="p-4 rounded-xl border border-border/70 bg-card hover:border-primary/40 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <a
                          href={repo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-sm hover:text-primary transition-colors flex items-center gap-1.5"
                        >
                          <FolderGit2 size={14} className="text-muted-foreground shrink-0" />
                          <span className="truncate">{repo.name}</span>
                          <ExternalLink size={11} className="text-muted-foreground shrink-0" />
                        </a>
                        <div className="flex items-center gap-2 shrink-0">
                          {repo.stars > 0 && (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                              <Star size={11} className="fill-amber-500 text-amber-500" />
                              {repo.stars}
                            </span>
                          )}
                          {repo.forks > 0 && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <GitFork size={11} />
                              {repo.forks}
                            </span>
                          )}
                        </div>
                      </div>

                      {repo.description && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                          {repo.description}
                        </p>
                      )}

                      {repo.topics && repo.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {repo.topics.slice(0, 3).map((topic, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-medium bg-muted/70 text-foreground px-1.5 py-0.5 rounded border border-border/40"
                            >
                              #{topic}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-primary" />
                        <span className="font-medium text-foreground/80">{repo.language || "TypeScript"}</span>
                      </div>
                      {repo.homepage && (
                        <a
                          href={repo.homepage.startsWith("http") ? repo.homepage : `https://${repo.homepage}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 font-medium"
                        >
                          <Globe size={11} /> Live Demo
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Interactive Experience Timeline (Read-Only Public Presentation) */}
        <ExperienceTimeline
          readOnly={true}
          initialExperiences={profile.experience}
        />

        {/* Footer Banner */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center space-y-3">
          <h3 className="text-sm font-bold text-foreground">
            Looking to collaborate with {profile.name.split(" ")[0]}?
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Reach out via LinkedIn or connect directly to discuss upcoming engineering roles, projects, or consulting opportunities.
          </p>
          <div className="flex items-center justify-center gap-3 pt-1">
            {profile.linkedin && (
              <a
                href={profile.linkedin.startsWith("http") ? profile.linkedin : `https://${profile.linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" className="gap-1.5 text-xs rounded-full">
                  <LinkedinIcon /> Message on LinkedIn
                </Button>
              </a>
            )}
            {profile.website && (
              <a
                href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="outline" className="gap-1.5 text-xs rounded-full">
                  <Globe size={13} /> Visit Website
                </Button>
              </a>
            )}
          </div>
        </div>
      </main>

      {/* Public Footer */}
      <footer className="border-t border-border/50 py-6 text-center text-xs text-muted-foreground mt-auto bg-card/40">
        <div className="container max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} {profile.name}. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Powered by{" "}
            <Link href="/" className="font-semibold text-foreground hover:text-primary transition-colors">
              CareerPilot
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
