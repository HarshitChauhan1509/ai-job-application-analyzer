import { Navbar } from "@/components/landing/navbar";
import { Pricing } from "@/components/landing/pricing";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default async function PricingPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/20">
      <Navbar user={user} />
      <main className="flex-1 pt-16">
        <Pricing />

        {/* Bottom CTA */}
        <section className="py-20 border-t border-border/40 bg-foreground text-background relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Ready to accelerate your job hunt?
            </h2>
            <p className="text-muted/80 mb-8 max-w-xl mx-auto text-sm sm:text-base">
              Join thousands of engineers landing dream roles at top tech companies.
            </p>
            <Link href="/register">
              <Button size="lg" className="rounded-full h-12 px-8 text-base bg-primary text-primary-foreground hover:bg-primary/90">
                Get Started for Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-12 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl leading-none">C</span>
              </div>
              <span className="font-bold text-xl tracking-tight">CareerPilot</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              The AI-powered copilot for your engineering job search.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/#features" className="hover:text-foreground transition-colors">Features</Link></li>
              <li><Link href="/#how-it-works" className="hover:text-foreground transition-colors">How it works</Link></li>
              <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
              <li><Link href="/improve" className="hover:text-foreground transition-colors">Resume AI</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/#how-it-works" className="hover:text-foreground transition-colors">Engineering Workflow</Link></li>
              <li><Link href="/resumes" className="hover:text-foreground transition-colors">Resume Tailoring</Link></li>
              <li><Link href="/applications" className="hover:text-foreground transition-colors">Application Kanban</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Account</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link></li>
              <li><Link href="/register" className="hover:text-foreground transition-colors">Create Account</Link></li>
              <li><Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard Workspace</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} CareerPilot Inc. All rights reserved. Built for engineering interviews.
        </div>
      </footer>
    </div>
  );
}
