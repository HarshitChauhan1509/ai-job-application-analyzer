"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Mic, Briefcase, ChevronRight, Play } from "lucide-react";
import { useRouter } from "next/navigation";

export default function InterviewCoachSetupPage() {
  const router = useRouter();
  const [role, setRole] = useState("Full Stack Developer");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [categories, setCategories] = useState<Record<string, boolean>>({
    "JavaScript": true,
    "React": true,
    "Node.js": false,
    "System Design": false,
    "Behavioral": true,
    "HR": false,
  });

  const handleToggle = (cat: string) => {
    setCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleStart = () => {
    // In a real app, we'd hit the API to create the session, then navigate to the session ID
    router.push(`/dashboard/coach/session?role=${encodeURIComponent(role)}&diff=${difficulty}`);
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Interview Coach</h1>
        <p className="text-muted-foreground mt-1">Configure your practice session to simulate a real technical interview.</p>
      </div>

      <Card className="border-primary/20 shadow-md">
        <CardHeader className="bg-primary/5 pb-4 border-b border-primary/10">
          <CardTitle className="flex items-center gap-2">
            <Mic className="text-primary h-5 w-5" />
            Session Configuration
          </CardTitle>
          <CardDescription>Tailor the interview to your target role.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Target Role</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="role" 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)} 
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger id="difficulty">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Junior">Junior</SelectItem>
                    <SelectItem value="Intermediate">Intermediate / Mid-level</SelectItem>
                    <SelectItem value="Senior">Senior</SelectItem>
                    <SelectItem value="Lead">Lead / Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Label>Focus Areas (Categories)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.keys(categories).map((cat) => (
                  <div 
                    key={cat} 
                    className={`flex items-center space-x-2 border rounded-md p-3 transition-colors cursor-pointer ${categories[cat] ? 'bg-primary/10 border-primary/30' : 'hover:bg-muted/50'}`}
                    onClick={() => handleToggle(cat)}
                  >
                    <Checkbox id={`cat-${cat}`} checked={categories[cat]} onCheckedChange={() => handleToggle(cat)} />
                    <Label htmlFor={`cat-${cat}`} className="cursor-pointer text-sm font-medium">{cat}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="length">Interview Length</Label>
              <Select defaultValue="short">
                <SelectTrigger id="length">
                  <SelectValue placeholder="Select length" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short (3 Questions)</SelectItem>
                  <SelectItem value="medium">Standard (5 Questions)</SelectItem>
                  <SelectItem value="long">Comprehensive (10 Questions)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/20 border-t border-border pt-4 pb-4 flex justify-between">
          <Button variant="ghost">View Past Sessions</Button>
          <Button onClick={handleStart} className="px-8 shadow-md">
            Start Interview <Play className="ml-2 h-4 w-4 fill-current" />
          </Button>
        </CardFooter>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="hover:border-primary/30 transition-colors cursor-pointer">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">System Design Mock</p>
              <p className="text-xs text-muted-foreground mt-0.5">Senior level • Architecture focus</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="hover:border-primary/30 transition-colors cursor-pointer">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">Behavioral Screen</p>
              <p className="text-xs text-muted-foreground mt-0.5">STAR method practice</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
