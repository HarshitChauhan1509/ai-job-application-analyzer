"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Bookmark, MapPin, Building, Briefcase, Plus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Removed mock data

export default function JobsClient({ initialJobs, userId }: { initialJobs: any[], userId: string }) {
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
        {initialJobs.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            No jobs saved yet. Add a job description to get started!
          </div>
        ) : (
          initialJobs.map((job) => {
            const date = new Date(job.createdAt).toLocaleDateString();
            const match = job.analysis ? 85 : 0; // Assuming we'd calculate match score here or fetch it

            return (
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
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Analyze Fit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin size={14} className="mr-2 opacity-70" />
                      {job.location || "Location not specified"}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Briefcase size={14} className="mr-2 opacity-70" />
                      {job.employmentType || "Not specified"}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Bookmark size={14} className="mr-2 opacity-70" />
                      Saved {date}
                    </div>
                  </div>
                  
                  {match > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm font-medium">Match Score</span>
                        <span className="text-sm font-bold">{match}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${match >= 90 ? 'bg-green-500' : match >= 75 ? 'bg-primary' : 'bg-amber-500'}`} 
                          style={{ width: `${match}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-0 flex gap-2 mt-auto">
                  <Button variant="default" className="w-full">Track Application</Button>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
