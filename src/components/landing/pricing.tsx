"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import Link from "next/link";

interface PricingPlan {
  name: string;
  badge?: string;
  description: string;
  priceMonthly: number;
  priceAnnually: number;
  period: string;
  popular?: boolean;
  features: string[];
  cta: string;
  href: string;
}

const plans: PricingPlan[] = [
  {
    name: "Starter",
    description: "Essential tools to analyze your resume and get started with technical job matching.",
    priceMonthly: 0,
    priceAnnually: 0,
    period: "forever free",
    features: [
      "1 Primary Resume analysis & ATS score",
      "5 Job Description match evaluations / month",
      "Paste JD via text",
      "Interactive Kanban application pipeline",
      "2 AI Mock Interview sessions / month",
      "Standard community support",
    ],
    cta: "Start Free",
    href: "/register",
  },
  {
    name: "Pro Copilot",
    popular: true,
    badge: "Most Popular",
    description: "The complete AI toolkit for active candidates landing top software engineering offers.",
    priceMonthly: 19,
    priceAnnually: 15,
    period: "per month",
    features: [
      "Unlimited multi-role resumes & specializations",
      "Unlimited JD analysis (Links, Screenshots, Text)",
      "Indeed & LinkedIn automated job link scraper",
      "AI Bullet Improver with STAR metric rewrites",
      "Unlimited AI Mock Interviews with custom roles",
      "Instant Command+K Global search across all data",
      "Application timeline history & notes",
      "Priority AI model response speed",
    ],
    cta: "Get Started with Pro",
    href: "/register?plan=pro",
  },
  {
    name: "Lifetime Pass",
    badge: "Best Value",
    description: "One-time investment for lifetime access to all current and future CareerPilot AI tools.",
    priceMonthly: 99,
    priceAnnually: 99,
    period: "one-time payment",
    features: [
      "Everything in Pro included forever",
      "No recurring monthly subscription",
      "Lifetime updates to all future AI models",
      "Exclusive high-difficulty System Design coach",
      "1-on-1 resume audit templates",
      "VIP community access & direct support",
    ],
    cta: "Get Lifetime Access",
    href: "/register?plan=lifetime",
  },
];

export function Pricing() {
  const [annualBilling, setAnnualBilling] = useState(true);

  return (
    <section id="pricing" className="py-24 bg-muted/20 relative overflow-hidden">
      {/* Decorative gradient blur */}
      <div className="absolute top-1/3 right-1/2 translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <Badge variant="outline" className="mb-4 px-3 py-1 text-xs uppercase tracking-wider font-semibold border-primary/30 text-primary">
              Pricing Plans
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Invest in your career, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">not expensive bootcamps</span>
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Transparent plans designed to help you prepare, apply, and land your next role faster.
            </p>
          </motion.div>

          {/* Billing Cycle Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 p-1 rounded-full bg-muted/60 border border-border">
            <button
              onClick={() => setAnnualBilling(false)}
              className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
                !annualBilling
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setAnnualBilling(true)}
              className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1.5 ${
                annualBilling
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-background/20 font-bold">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan, index) => {
            const price = plan.name === "Lifetime Pass" 
              ? plan.priceMonthly 
              : annualBilling 
                ? plan.priceAnnually 
                : plan.priceMonthly;

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="flex"
              >
                <Card
                  className={`w-full flex flex-col justify-between transition-all duration-300 relative ${
                    plan.popular
                      ? "border-primary shadow-xl shadow-primary/10 bg-card ring-1 ring-primary/40 lg:-translate-y-2"
                      : "border-border/60 hover:border-border bg-card/80"
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <Badge className={plan.popular ? "bg-primary text-primary-foreground shadow-md font-semibold px-3 py-1" : "bg-muted text-muted-foreground border border-border px-3 py-1"}>
                        {plan.popular && <Sparkles className="h-3 w-3 mr-1 inline" />}
                        {plan.badge}
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="pt-8 pb-4">
                    <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                    <CardDescription className="text-xs leading-relaxed min-h-[36px]">
                      {plan.description}
                    </CardDescription>

                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold tracking-tight">
                        ${price}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {plan.name === "Lifetime Pass" ? "/ one-time" : `/${plan.period}`}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 py-4 flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      What&apos;s included:
                    </p>
                    {plan.features.map((feature, fIndex) => (
                      <div key={fIndex} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="leading-tight">{feature}</span>
                      </div>
                    ))}
                  </CardContent>

                  <CardFooter className="pt-4 pb-8">
                    <Link href={plan.href} className="w-full">
                      <Button
                        className={`w-full rounded-full h-11 text-sm font-semibold transition-all ${
                          plan.popular
                            ? "bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:bg-primary/90"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
                        }`}
                      >
                        {plan.cta} <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Guarantees and Trust info */}
        <div className="mt-16 pt-8 border-t border-border/50 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="flex flex-col items-center">
            <ShieldCheck className="h-5 w-5 text-primary mb-2" />
            <h5 className="text-sm font-semibold mb-1">14-Day Free Trial</h5>
            <p className="text-xs text-muted-foreground">Try Pro risk-free. No commitments, cancel anytime.</p>
          </div>
          <div className="flex flex-col items-center">
            <Zap className="h-5 w-5 text-primary mb-2" />
            <h5 className="text-sm font-semibold mb-1">Instant Activation</h5>
            <p className="text-xs text-muted-foreground">Get immediate access to all features upon sign-up.</p>
          </div>
          <div className="flex flex-col items-center">
            <Sparkles className="h-5 w-5 text-primary mb-2" />
            <h5 className="text-sm font-semibold mb-1">Engineered for Results</h5>
            <p className="text-xs text-muted-foreground">Proven ATS optimization and realistic technical interview coaching.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
