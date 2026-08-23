import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Briefcase, KanbanSquare, MessageSquare, ArrowRight, Zap, TrendingUp, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">Here is what's happening with your job search today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">Upload Resume</Button>
          <Button>Add Application</Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resume Score</CardTitle>
            <div className="p-2 bg-primary/10 rounded-full text-primary">
              <FileText size={16} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">87<span className="text-base font-normal text-muted-foreground">/100</span></div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp size={12} className="text-green-500" />
              <span className="text-green-500 font-medium">+2 points</span> since last week
            </p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Job Match</CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-full text-blue-500">
              <Briefcase size={16} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">82%</div>
            <p className="text-xs text-muted-foreground mt-1">Across 12 saved jobs</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Applications</CardTitle>
            <div className="p-2 bg-amber-500/10 rounded-full text-amber-500">
              <KanbanSquare size={16} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">14</div>
            <p className="text-xs text-muted-foreground mt-1">3 awaiting response</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Interviews</CardTitle>
            <div className="p-2 bg-purple-500/10 rounded-full text-purple-500">
              <MessageSquare size={16} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">2</div>
            <p className="text-xs text-muted-foreground mt-1">Next: Google on Thursday</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7 lg:grid-cols-3">
        {/* Main Content Area */}
        <div className="md:col-span-4 lg:col-span-2 space-y-6">
          
          {/* AI Recommendation */}
          <Card className="border-primary/20 bg-primary/5 shadow-sm">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="mt-1 bg-background p-2 rounded-full h-fit text-primary shadow-sm">
                  <Zap size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">AI Recommendation</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    Your applications have a strong frontend match, but <strong className="text-foreground font-medium">Redis</strong> and <strong className="text-foreground font-medium">GraphQL</strong> appear in 38% of your target roles. Consider adding these to your learning plan or highlighting any related experience in your resume.
                  </p>
                  <Button variant="outline" size="sm" className="bg-background">
                    Review skill gaps
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Applications */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle>Recent Applications</CardTitle>
                <CardDescription>Your latest activity across all pipelines.</CardDescription>
              </div>
              <Link href="/dashboard/applications" className="text-sm text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { company: "Google", role: "Senior Frontend Engineer", status: "Interview", date: "2 days ago", match: 91, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
                  { company: "Linear", role: "Product Engineer", status: "Applied", date: "4 days ago", match: 88, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
                  { company: "Vercel", role: "Software Engineer", status: "Screening", date: "1 week ago", match: 82, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
                  { company: "Stripe", role: "Frontend Developer", status: "Rejected", date: "2 weeks ago", match: 75, color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
                ].map((app, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-md bg-background border shadow-sm flex items-center justify-center font-bold text-sm">
                        {app.company.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{app.role}</p>
                        <p className="text-sm text-muted-foreground">{app.company} • {app.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="hidden sm:flex flex-col items-end">
                        <span className="text-xs text-muted-foreground mb-1">Match</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${app.match}%` }} />
                          </div>
                          <span className="text-xs font-medium">{app.match}%</span>
                        </div>
                      </div>
                      <Badge variant="secondary" className={`${app.color} border-0 rounded-full px-2.5 font-medium`}>
                        {app.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar / Pipeline */}
        <div className="md:col-span-3 lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline</CardTitle>
              <CardDescription>Current application statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: "Saved", count: 12, width: "100%", color: "bg-slate-500" },
                  { label: "Applied", count: 8, width: "70%", color: "bg-blue-500" },
                  { label: "Screening", count: 4, width: "35%", color: "bg-amber-500" },
                  { label: "Interview", count: 2, width: "15%", color: "bg-purple-500" },
                  { label: "Offer", count: 0, width: "0%", color: "bg-green-500" },
                ].map((stage, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-muted-foreground">{stage.label}</span>
                      <span className="font-bold">{stage.count}</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${stage.color} rounded-full`} style={{ width: stage.width }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Missing Skills</CardTitle>
              <CardDescription>Frequently missing across saved jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1">
                  <AlertCircle size={12} className="text-amber-500" />
                  Redis
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1">
                  <AlertCircle size={12} className="text-amber-500" />
                  GraphQL
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1">
                  <AlertCircle size={12} className="text-amber-500" />
                  Docker
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1 bg-muted/50 text-muted-foreground">
                  AWS
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
