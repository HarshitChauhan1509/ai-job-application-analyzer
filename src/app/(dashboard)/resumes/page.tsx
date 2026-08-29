"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, FileText, Upload, Trash2, Edit2, Star, CheckCircle2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileUploader } from "@/components/dashboard/file-uploader";

// Mock data for initial UI
const mockResumes = [
  { id: "1", name: "Software Engineer Resume", score: 87, date: "2 hours ago", isPrimary: true },
  { id: "2", name: "Frontend Developer (Tailored)", score: 92, date: "3 days ago", isPrimary: false },
  { id: "3", name: "Full Stack Engineer v2", score: 78, date: "1 week ago", isPrimary: false },
];

export default function ResumesPage() {
  const [isUploading, setIsUploading] = useState(false);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resumes</h1>
          <p className="text-muted-foreground mt-1">Manage your resumes and view AI analysis.</p>
        </div>
        <Button onClick={() => setIsUploading(!isUploading)} className="w-full sm:w-auto">
          <Upload className="mr-2 h-4 w-4" />
          Upload Resume
        </Button>
      </div>

      {isUploading && (
        <Card className="border-primary/20 shadow-md">
          <CardHeader>
            <CardTitle>Upload New Resume</CardTitle>
            <CardDescription>Upload a PDF file up to 10MB.</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploader 
              onUploadComplete={() => setIsUploading(false)} 
              onCancel={() => setIsUploading(false)}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mockResumes.map((resume) => (
          <Card key={resume.id} className="flex flex-col hover:shadow-md transition-all group border-border/60">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
                  <FileText size={24} />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" />}>
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal size={16} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem>
                      <FileText className="mr-2 h-4 w-4" />
                      View Analysis
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit2 className="mr-2 h-4 w-4" />
                      Rename
                    </DropdownMenuItem>
                    {!resume.isPrimary && (
                      <DropdownMenuItem>
                        <Star className="mr-2 h-4 w-4" />
                        Set as Primary
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl line-clamp-1" title={resume.name}>{resume.name}</CardTitle>
                  {resume.isPrimary && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 flex-shrink-0">Primary</Badge>
                  )}
                </div>
                <CardDescription className="mt-1.5 flex items-center gap-1.5 text-xs">
                  <CheckCircle2 size={12} className="text-green-500" />
                  Analyzed {resume.date}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pb-4 flex-1">
              <div className="rounded-md bg-muted/50 p-4 flex flex-col items-center justify-center text-center h-full border border-border/50">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">ATS Score</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-foreground">{resume.score}</span>
                  <span className="text-sm font-medium text-muted-foreground">/ 100</span>
                </div>
                
                {/* Visual score bar */}
                <div className="w-full max-w-[120px] h-1.5 bg-muted-foreground/20 rounded-full mt-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${resume.score >= 90 ? 'bg-green-500' : resume.score >= 70 ? 'bg-primary' : 'bg-amber-500'}`} 
                    style={{ width: `${resume.score}%` }}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0 flex gap-2">
              <Button variant="default" className="w-full font-medium">Analyze</Button>
              <Button variant="outline" className="w-full font-medium">Improve</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
