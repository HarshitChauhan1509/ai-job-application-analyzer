"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Bookmark, MapPin, Building, Briefcase, Plus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Mock data
const mockJobs = [
  { id: "1", company: "Google", position: "Senior Frontend Engineer", location: "Remote", type: "Full-time", savedAt: "2 days ago", match: 91 },
  { id: "2", company: "Stripe", position: "Frontend Developer", location: "San Francisco, CA", type: "Full-time", savedAt: "1 week ago", match: 75 },
  { id: "3", company: "Linear", position: "Product Engineer", location: "Remote", type: "Full-time", savedAt: "2 weeks ago", match: 88 },
];

export default function JobsPage() {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Saved Jobs</h1>
          <p className="text-muted-foreground mt-1">Manage job descriptions and analyze your fit.</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Job Description
        </Button>
      </div>

      {isAdding && (
        <Card className="border-primary/20 shadow-md">
          <CardHeader>
            <CardTitle>Add New Job</CardTitle>
            <CardDescription>Paste a job description below to analyze it.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <textarea 
                className="w-full min-h-[200px] p-4 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y" 
                placeholder="Paste the full job description here..."
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button>Analyze Job</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mockJobs.map((job) => (
          <Card key={job.id} className="flex flex-col hover:shadow-md transition-all group border-border/60">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-background border shadow-sm flex items-center justify-center font-bold text-sm">
                    {job.company.charAt(0)}
                  </div>
                  <div>
                    <CardTitle className="text-lg leading-none mb-1.5 line-clamp-1">{job.position}</CardTitle>
                    <CardDescription className="font-medium text-foreground">{job.company}</CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" />}>
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal size={16} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem>View Analysis</DropdownMenuItem>
                    <DropdownMenuItem>Match with Resume</DropdownMenuItem>
                    <DropdownMenuItem>Create Application</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="pb-4 flex-1">
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex items-center text-sm text-muted-foreground gap-2">
                  <MapPin size={14} className="shrink-0" />
                  <span className="truncate">{job.location}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground gap-2">
                  <Briefcase size={14} className="shrink-0" />
                  <span className="truncate">{job.type}</span>
                </div>
              </div>
              
              <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Match Score</span>
                  <span className="text-sm font-bold">{job.match}%</span>
                </div>
                <div className="w-full h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${job.match >= 90 ? 'bg-green-500' : job.match >= 70 ? 'bg-primary' : 'bg-amber-500'}`} 
                    style={{ width: `${job.match}%` }}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0 flex gap-2">
              <Button variant="default" className="w-full font-medium">Compare Fit</Button>
              <Button variant="outline" className="w-full font-medium">Apply</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
