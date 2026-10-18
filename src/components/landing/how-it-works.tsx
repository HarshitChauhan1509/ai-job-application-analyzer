"use client";

import { motion } from "framer-motion";
import { 
  FileUp, 
  Link2, 
  Sparkles, 
  Mic, 
  ArrowRight, 
  CheckCircle2, 
  BarChart3, 
  Layers, 
  Kanban 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const steps = [
  {
    step: "01",
    title: "Upload & Specialize Resumes",
    description:
      "Upload your master resume or create multi-role versions (Frontend, Full Stack, DevOps). Get instant ATS compatibility scores, skill gap highlights, and structural recommendations.",
    icon: <FileUp className="h-6 w-6 text-primary" />,
    badge: "Multi-Role Support",
    highlights: ["ATS Score breakdown", "Multi-version management", "Role-specific tagging"],
  },
  {
    step: "02",
    title: "Analyze Any Job Description",
    description:
      "Paste any JD link (Indeed, LinkedIn, Glassdoor), upload job posting screenshots, or paste raw text. Our AI extracts required skills, seniority level, and generates a precision match score.",
    icon: <Link2 className="h-6 w-6 text-primary" />,
    badge: "Links, Images & Text",
    highlights: ["1-click JD scraper", "Multi-image OCR parsing", "Missing keywords highlight"],
  },
  {
    step: "03",
    title: "AI Resume & Bullet Enhancer",
    description:
      "Select any bullet point on your resume and let AI rewrite it using the STAR method. Emphasize quantifiable metrics, high-impact verbs, and tailor wording directly to the targeted job.",
    icon: <Sparkles className="h-6 w-6 text-primary" />,
    badge: "STAR Method Optimization",
    highlights: ["Impact metrics generator", "Context-aware tailoring", "Copy & export instantly"],
  },
  {
    step: "04",
    title: "Simulate Technical Interviews",
    description:
      "Practice technical interviews customized to the exact role and difficulty level. Receive dynamic questions, record or type responses, and get instant rubric feedback and scoring.",
    icon: <Mic className="h-6 w-6 text-primary" />,
    badge: "AI Mock Coach",
    highlights: ["Voice & text responses", "Real-time AI rubric scoring", "Comprehensive question history"],
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-background relative overflow-hidden">
      {/* Decorative gradient blur */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <Badge variant="outline" className="mb-4 px-3 py-1 text-xs uppercase tracking-wider font-semibold border-primary/30 text-primary">
              How It Works
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
              From application to offer in <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">4 simple steps</span>
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              CareerPilot automates the tedious parts of your job search so you can focus on interviewing with confidence.
            </p>
          </motion.div>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {steps.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="h-full border-border/60 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 bg-card/60 backdrop-blur-sm group">
                <CardContent className="p-8 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                          {item.icon}
                        </div>
                        <Badge variant="secondary" className="text-[11px] font-medium bg-muted text-muted-foreground">
                          {item.badge}
                        </Badge>
                      </div>
                      <span className="text-3xl font-extrabold text-muted-foreground/30 font-mono">
                        {item.step}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>

                    <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border/40 space-y-2">
                    {item.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Bottom pipeline banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-primary/10 via-background to-primary/5 border border-border/60 flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-sm font-semibold text-primary">
              <Kanban className="h-4 w-4" />
              <span>Built-in Kanban Pipeline Tracker</span>
            </div>
            <h4 className="text-xl font-bold">Track every opportunity from Saved to Signed Offer</h4>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Drag and drop applications across status stages, view historical timelines, and filter cards instantly.
            </p>
          </div>
          <Link href="/register">
            <Button className="rounded-full shadow-md hover:shadow-lg whitespace-nowrap">
              Get Started Now <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
