"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, FileText, Briefcase, Zap } from "lucide-react";

export function Hero() {
  return (
    <section className="pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-10" />
      
      <div className="container mx-auto px-4 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-8 border border-border"
        >
          <Sparkles size={16} className="text-primary" />
          <span>Introducing AI Job Application Copilot</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tight max-w-4xl mb-6 leading-tight"
        >
          Your next job starts with a <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">better application.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed"
        >
          AI-powered resume analysis, job matching, interview preparation, and application tracking — all in one beautifully designed workspace.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <Button size="lg" className="w-full sm:w-auto rounded-full text-base h-12 px-8 shadow-xl shadow-primary/20">
            Analyze my resume
            <ArrowRight className="ml-2" size={18} />
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-full text-base h-12 px-8">
            Explore Demo
          </Button>
        </motion.div>

        {/* Animated Dashboard Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="w-full max-w-5xl mt-20 relative"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 h-[200px] bottom-0 top-auto" />
          <div className="rounded-xl border border-border/50 bg-card shadow-2xl overflow-hidden flex flex-col">
            {/* Mockup Header */}
            <div className="h-12 border-b border-border/50 flex items-center px-4 gap-2 bg-muted/30">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                <div className="w-3 h-3 rounded-full bg-green-400/80" />
              </div>
              <div className="mx-auto bg-background border border-border/50 rounded-md px-32 py-1 text-xs text-muted-foreground shadow-sm">
                careerpilot.app/dashboard
              </div>
            </div>
            
            {/* Mockup Content */}
            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-muted/10 relative">
              {/* Sidebar/Stats */}
              <div className="space-y-6">
                <div className="bg-background rounded-lg p-5 border border-border shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-full text-primary">
                    <FileText size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Resume Score</p>
                    <p className="text-2xl font-bold">87<span className="text-sm font-normal text-muted-foreground">/100</span></p>
                  </div>
                </div>
                <div className="bg-background rounded-lg p-5 border border-border shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-full text-blue-500">
                    <Briefcase size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Job Match</p>
                    <p className="text-2xl font-bold">92%</p>
                  </div>
                </div>
              </div>

              {/* Main Chart/Analysis Area */}
              <div className="md:col-span-2 bg-background rounded-lg p-6 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-semibold text-lg">Senior Frontend Engineer</h3>
                    <p className="text-sm text-muted-foreground">Google • Remote</p>
                  </div>
                  <div className="px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-sm font-medium">
                    Strong Match
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium">React / Next.js</span>
                      <span className="text-muted-foreground">100%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 1, delay: 1 }}
                        className="h-full bg-primary" 
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium">TypeScript</span>
                      <span className="text-muted-foreground">95%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "95%" }}
                        transition={{ duration: 1, delay: 1.2 }}
                        className="h-full bg-primary" 
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium">System Design</span>
                      <span className="text-muted-foreground">75%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "75%" }}
                        transition={{ duration: 1, delay: 1.4 }}
                        className="h-full bg-amber-500" 
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-border flex items-start gap-3">
                  <div className="mt-0.5 text-amber-500">
                    <Zap size={18} />
                  </div>
                  <p className="text-sm leading-relaxed">
                    <span className="font-semibold">AI Recommendation:</span> Your experience matches well, but you are missing <span className="font-medium bg-muted px-1.5 py-0.5 rounded">GraphQL</span> keywords which appear in the job description. Consider highlighting your API design experience.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
