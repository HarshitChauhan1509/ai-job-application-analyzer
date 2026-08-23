import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Hero />
        
        {/* Social Proof */}
        <section className="py-12 border-y border-border/50 bg-muted/20">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-8">
              Trusted by job seekers applying to
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale">
              {/* Using text for demo, in real life these would be SVG logos */}
              <span className="text-xl font-bold font-sans">Google</span>
              <span className="text-xl font-bold font-sans tracking-tight">Microsoft</span>
              <span className="text-xl font-bold font-sans">amazon</span>
              <span className="text-xl font-bold font-sans tracking-tighter">stripe</span>
              <span className="text-xl font-bold font-sans">Linear</span>
              <span className="text-xl font-bold font-sans">Notion</span>
            </div>
          </div>
        </section>

        {/* Features - we'll expand this later */}
        <section id="features" className="py-24 md:py-32">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Everything you need to land the offer.</h2>
              <p className="text-lg text-muted-foreground">
                Stop guessing what hiring managers want. Our AI analyzes your resume against real job descriptions to give you a competitive edge.
              </p>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="py-12 border-t border-border bg-muted/10">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-1 rounded-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
            </div>
            <span className="font-semibold tracking-tight">CareerPilot</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} CareerPilot. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
