import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, Target, Zap, LayoutDashboard, BrainCircuit, Mic } from "lucide-react";

const features = [
  {
    title: "AI Resume Analysis",
    description: "Get instant, actionable feedback on your resume. We evaluate ATS compatibility, skill representation, and impact.",
    icon: <BrainCircuit className="h-6 w-6 text-primary" />,
  },
  {
    title: "Precision Job Matching",
    description: "Paste a job description and see exactly how well you fit. We'll tell you what skills you're missing before you apply.",
    icon: <Target className="h-6 w-6 text-primary" />,
  },
  {
    title: "Smart Auto-Tailoring",
    description: "Select any bullet point on your resume and let our AI rewrite it to perfectly align with your target job.",
    icon: <Sparkles className="h-6 w-6 text-primary" />,
  },
  {
    title: "Mock Interviews",
    description: "Practice answering highly technical questions generated specifically for the role you're applying to.",
    icon: <Mic className="h-6 w-6 text-primary" />,
  },
  {
    title: "Application Pipeline",
    description: "Track all your job applications in a beautiful drag-and-drop Kanban board with chronological event timelines.",
    icon: <LayoutDashboard className="h-6 w-6 text-primary" />,
  },
  {
    title: "Instant Insights",
    description: "We extract required skills, seniority, and keywords from job descriptions instantly. No more reading between the lines.",
    icon: <Zap className="h-6 w-6 text-primary" />,
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need to land the offer.</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            CareerPilot replaces your messy spreadsheets, generic ChatGPT prompts, and unorganized folders with a single, intelligent platform.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-border/60 shadow-sm hover:shadow-md hover:border-primary/20 transition-all bg-background/50 backdrop-blur-sm group">
              <CardHeader>
                <div className="mb-4 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  {feature.icon}
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
