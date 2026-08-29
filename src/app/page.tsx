import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/20">
      <Navbar />
      <main className="flex-1">
        <Hero />
        
        {/* Social Proof */}
        <section className="py-12 border-y border-border/50 bg-muted/20">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-8">
              Trusted by engineers landing roles at
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale">
              <span className="text-xl font-bold font-sans">Google</span>
              <span className="text-xl font-bold font-sans tracking-tight">Stripe</span>
              <span className="text-xl font-bold font-sans">Vercel</span>
              <span className="text-xl font-bold font-sans tracking-tighter">META</span>
            </div>
          </div>
        </section>

        <Features />
        
        {/* Testimonials */}
        <section className="py-24 border-y border-border/40 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Engineers are landing their dream roles.</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { quote: "The AI interview coach asked me the exact same system design question I got in my final round at Stripe. I was fully prepared.", author: "Sarah J.", role: "Backend Engineer" },
                { quote: "I was getting auto-rejected until the Resume Improver showed me I was missing key 'impact' metrics. 3 weeks later, I got an offer.", author: "Michael T.", role: "Product Manager" },
                { quote: "The Kanban board keeps my sanity intact. Being able to see my match score next to every application is a game changer.", author: "Elena R.", role: "Frontend Developer" }
              ].map((t, i) => (
                <div key={i} className="p-8 rounded-2xl bg-muted/40 border border-border/50">
                  <div className="flex gap-1 text-primary mb-4">
                    {[...Array(5)].map((_, j) => <svg key={j} className="h-5 w-5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>)}
                  </div>
                  <p className="text-foreground leading-relaxed italic mb-6">"{t.quote}"</p>
                  <div>
                    <p className="font-semibold">{t.author}</p>
                    <p className="text-sm text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden bg-foreground text-background">
          <div className="absolute inset-0 bg-primary/20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50" />
          <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
            <h2 className="text-4xl font-bold tracking-tight mb-6">Stop guessing. Start landing offers.</h2>
            <p className="text-xl text-muted/80 mb-10 max-w-2xl mx-auto">
              Join thousands of engineers who use CareerPilot to organize their job hunt and ace their interviews.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="h-14 px-8 text-lg bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto rounded-full">
                  Get Started for Free <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted/60">
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> No credit card required</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> 14-day free trial on Pro</span>
            </div>
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
              <li><Link href="#" className="hover:text-foreground transition-colors">Resume AI</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Job Matcher</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Interview Coach</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-foreground transition-colors">Blog</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Engineering Interview Guide</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Resume Templates</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Help Center</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Cookie Policy</Link></li>
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
