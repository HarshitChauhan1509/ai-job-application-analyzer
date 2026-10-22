"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Building,
  MapPin,
  Calendar,
  Clock,
  Edit2,
  Play,
  FileText,
  CheckCircle2,
  Send,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { OutreachModal } from "@/components/dashboard/outreach-modal";

// Mock Data
const mockApp = {
  id: "app-1",
  company: "Google",
  position: "Senior Frontend Engineer",
  location: "Remote",
  status: "INTERVIEW",
  match: 91,
  appliedDate: "Oct 12, 2023",
  resumeUsed: "Software Engineer Resume",
  url: "https://careers.google.com/...",
  notes: "Referral from Sarah. Recruiter reached out on Oct 14.",
  timeline: [
    { date: "Oct 15", event: "Technical Screen Scheduled" },
    { date: "Oct 14", event: "Recruiter Phone Screen" },
    { date: "Oct 12", event: "Application Submitted" },
    { date: "Oct 10", event: "Saved Job" },
  ]
};

export default function ApplicationDetailPage() {
  const params = useParams();
  const [outreachOpen, setOutreachOpen] = useState(false);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/applications">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{mockApp.position}</h1>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
                {mockApp.status}
              </Badge>
            </div>
            <div className="flex items-center text-sm text-muted-foreground mt-1 gap-4">
              <span className="flex items-center gap-1.5"><Building size={14} /> {mockApp.company}</span>
              <span className="flex items-center gap-1.5"><MapPin size={14} /> {mockApp.location}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setOutreachOpen(true)}
            className="gap-1.5 shadow-sm bg-primary text-primary-foreground text-xs h-9 px-3.5"
          >
            <Sparkles size={14} /> Pitch Founder / Lead
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-9">
            <Edit2 className="mr-1.5 h-3.5 w-3.5" /> Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Applied Date</p>
                  <p className="font-medium flex items-center gap-2"><Calendar size={14} className="text-muted-foreground" /> {mockApp.appliedDate}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Resume Used</p>
                  <p className="font-medium flex items-center gap-2"><FileText size={14} className="text-muted-foreground" /> {mockApp.resumeUsed}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Job URL</p>
                  <a href="#" className="font-medium text-primary hover:underline">{mockApp.url}</a>
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">Add Note</Button>
                </div>
                <div className="p-4 bg-muted/30 rounded-md border border-border/50 text-sm leading-relaxed text-foreground">
                  {mockApp.notes}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-3 border-b border-border/50 bg-primary/5">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">AI Match Analysis</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Match Score</span>
                  <Badge className="bg-green-500 hover:bg-green-600">{mockApp.match}%</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <p className="text-sm text-muted-foreground">
                  Your resume is a strong fit for this role. Review the detailed analysis to prepare for your interview.
                </p>
                <Link href={`/dashboard/match/resume-1/${mockApp.id}`}>
                  <Button variant="outline" size="sm" className="shrink-0">View Full Analysis</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Direct Founder & Recruiter Outreach Card (Aarivi Autopilot) */}
          <Card className="border-primary/25 bg-gradient-to-r from-primary/5 via-card to-background shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <Send size={14} />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">Direct Founder &amp; Recruiter Outreach</CardTitle>
                    <CardDescription className="text-xs">Bypass ATS queues with tailored high-converting cold email &amp; InMail drafts.</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Autopilot</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Generate 3 custom pitches (Founder Cold Email, Tech Lead InMail, and a 280-char LinkedIn Note) highlighting your relevant projects and public portfolio.
              </p>
              <Button
                size="sm"
                onClick={() => setOutreachOpen(true)}
                className="gap-1.5 shrink-0 text-xs shadow-xs"
              >
                <Sparkles size={13} />
                Draft Outreach
              </Button>
            </CardContent>
          </Card>

          {/* AI Interview Coach Prompt */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 overflow-hidden relative">
            <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-6 items-center">
                <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
                  <Play className="h-6 w-6 text-blue-600 dark:text-blue-400 fill-current ml-1" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-blue-900 dark:text-blue-100">Prepare for your interview</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1 mb-4 leading-relaxed">
                    Generate highly specific mock interview questions based on the {mockApp.company} {mockApp.position} job description and your resume.
                  </p>
                  <Link href={`/dashboard/coach?role=${encodeURIComponent(mockApp.position)}&company=${encodeURIComponent(mockApp.company)}`}>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0">
                      Start Mock Interview
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative border-l border-muted ml-3 space-y-6">
                {mockApp.timeline.map((item, i) => (
                  <div key={i} className="relative pl-6">
                    <div className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-background ${i === 0 ? 'bg-primary' : 'bg-muted-foreground'}`} />
                    <p className={`text-sm font-medium ${i === 0 ? 'text-foreground' : 'text-muted-foreground'}`}>{item.event}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.date}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <OutreachModal
        open={outreachOpen}
        onOpenChange={setOutreachOpen}
        applicationId={params?.id as string}
        companyName={mockApp.company}
        roleTitle={mockApp.position}
      />
    </div>
  );
}
