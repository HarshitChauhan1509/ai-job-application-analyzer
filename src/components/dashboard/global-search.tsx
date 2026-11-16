"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Briefcase,
  FileText,
  Mic,
  Sparkles,
  LayoutDashboard,
  CheckCircle2,
  Building,
  ArrowRight,
  Loader2,
  Sun,
  Moon,
  Laptop,
  Flame,
  BarChart3,
  CreditCard,
  User,
  Paperclip,
  Share2,
  Mail,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import { globalSearchAction, SearchResultItem } from "@/app/actions/search";
import { useToast } from "@/hooks/use-toast";
import { QuickJobClipDialog } from "./quick-job-clip-dialog";

export function GlobalSearch() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [publicPortfolioUrl, setPublicPortfolioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clipDialogOpen, setClipDialogOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard shortcut listener: Cmd+K (Mac) or Ctrl+K (Windows/Linux)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch search results when opened or query changes
  const fetchResults = useCallback(async (searchQuery: string) => {
    setLoading(true);
    try {
      const res = await globalSearchAction(searchQuery);
      if (res.success && res.results) {
        setResults(res.results);
        if (res.publicPortfolioUrl) {
          setPublicPortfolioUrl(res.publicPortfolioUrl);
        }
      }
    } catch (err) {
      console.error("Global search error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      fetchResults(query);
    }, 120);

    return () => clearTimeout(timer);
  }, [open, query, fetchResults]);

  const handleSelect = (url: string, id?: string) => {
    setOpen(false);

    if (id === "act-clip-job" || url === "/applications?action=clip") {
      setClipDialogOpen(true);
      return;
    }

    if (id === "act-copy-portfolio") {
      if (publicPortfolioUrl) {
        navigator.clipboard?.writeText(publicPortfolioUrl);
        toast({
          title: "Public Portfolio Link Copied",
          description: publicPortfolioUrl,
        });
      } else {
        router.push("/profile");
      }
      return;
    }

    router.push(url);
  };

  const actionResults = results.filter((r) => r.category === "actions");
  const appResults = results.filter((r) => r.category === "applications");
  const tailoredResults = results.filter(
    (r) => r.category === "resumes" && r.id.startsWith("tailored-")
  );
  const resumeResults = results.filter(
    (r) => r.category === "resumes" && !r.id.startsWith("tailored-")
  );
  const jobResults = results.filter((r) => r.category === "jobs");
  const interviewResults = results.filter((r) => r.category === "interviews");
  const navResults = results.filter((r) => r.category === "navigation");

  return (
    <>
      {/* Desktop Search Trigger */}
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="hidden sm:flex w-72 justify-start text-muted-foreground bg-muted/40 hover:bg-muted/70 border-border/80 h-9 px-3 transition-colors cursor-pointer"
      >
        <Search size={15} className="mr-2 text-muted-foreground shrink-0" />
        <span className="text-xs truncate">Type a command or search...</span>
        <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-semibold text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* Mobile Search Trigger Icon */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="sm:hidden text-muted-foreground hover:text-foreground h-9 w-9"
        aria-label="Search"
      >
        <Search size={19} />
      </Button>

      {/* Unified Command Palette Modal */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command className="rounded-xl border-0">
          <CommandInput
            placeholder="Type a command, job title, company, or jump to page..."
            value={query}
            onValueChange={setQuery}
          />

          <CommandList className="max-h-[380px] py-2">
            {loading && (
              <div className="flex items-center justify-center py-6 text-muted-foreground gap-2 text-xs">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Searching CareerPilot workspace...</span>
              </div>
            )}

            {!loading && results.length === 0 && (
              <CommandEmpty className="py-8 text-center text-xs text-muted-foreground">
                No matching applications, jobs, or commands found.
              </CommandEmpty>
            )}

            {/* Quick Actions Group */}
            {actionResults.length > 0 && (
              <CommandGroup heading="⚡ Quick Actions">
                {actionResults.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.title} ${item.subtitle} action`}
                    onSelect={() => handleSelect(item.url, item.id)}
                    className="flex items-center justify-between py-2 px-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.id === "act-clip-job" && <Paperclip className="h-4 w-4 text-primary shrink-0" />}
                      {item.id === "act-tailor-resume" && <Sparkles className="h-4 w-4 text-purple-500 shrink-0" />}
                      {item.id === "act-mock-interview" && <Mic className="h-4 w-4 text-rose-500 shrink-0" />}
                      {item.id === "act-sync-mailbox" && <Mail className="h-4 w-4 text-blue-500 shrink-0" />}

                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-primary/10 text-primary border-primary/20">
                        {item.badge}
                      </Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground opacity-50" />
                    </div>
                  </CommandItem>
                ))}

                {publicPortfolioUrl && (
                  <CommandItem
                    value="copy public portfolio link share candidate profile"
                    onSelect={() => handleSelect("", "act-copy-portfolio")}
                    className="flex items-center justify-between py-2 px-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Share2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">Copy Public Portfolio Link</p>
                        <p className="text-[11px] text-muted-foreground truncate">{publicPortfolioUrl}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      1-Click Copy
                    </Badge>
                  </CommandItem>
                )}
              </CommandGroup>
            )}

            {/* Applications & Pipeline */}
            {appResults.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="🚀 Applications & Pipeline">
                  {appResults.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${item.title} ${item.subtitle} application pipeline`}
                      onSelect={() => handleSelect(item.url)}
                      className="flex items-center justify-between py-2 px-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Building className="h-4 w-4 text-blue-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-semibold py-0 px-1.5 ${
                            item.badge === "OFFER"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : item.badge === "INTERVIEW"
                              ? "bg-purple-500/15 text-purple-700 dark:text-purple-300"
                              : item.badge === "SCREENING"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              : item.badge === "APPLIED"
                              ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {item.badge}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground opacity-50" />
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Tailored Resumes */}
            {tailoredResults.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="📄 Role-Specific Tailored Resumes">
                  {tailoredResults.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${item.title} ${item.subtitle} tailored resume`}
                      onSelect={() => handleSelect(item.url)}
                      className="flex items-center justify-between py-2 px-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Sparkles className="h-4 w-4 text-purple-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold py-0 px-1.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
                        >
                          Tailor Studio
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground opacity-50" />
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Saved Jobs */}
            {jobResults.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="💼 Saved Jobs">
                  {jobResults.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${item.title} ${item.subtitle} job`}
                      onSelect={() => handleSelect(item.url)}
                      className="flex items-center justify-between py-2 px-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Briefcase className="h-4 w-4 text-blue-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                          {item.badge}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground opacity-50" />
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Pages & Navigation */}
            {navResults.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="🧭 Pages & Navigation">
                  {navResults.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${item.title} ${item.subtitle} page nav`}
                      onSelect={() => handleSelect(item.url)}
                      className="flex items-center justify-between py-2 px-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.url === "/dashboard" && <LayoutDashboard className="h-4 w-4 text-primary shrink-0" />}
                        {item.url === "/jobs/explore" && <Flame className="h-4 w-4 text-amber-500 shrink-0" />}
                        {item.url === "/applications" && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                        {item.url === "/analytics" && <BarChart3 className="h-4 w-4 text-blue-500 shrink-0" />}
                        {item.url === "/resumes" && <FileText className="h-4 w-4 text-purple-500 shrink-0" />}
                        {item.url === "/coach" && <Mic className="h-4 w-4 text-rose-500 shrink-0" />}
                        {item.url === "/improve" && <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />}
                        {item.url === "/dashboard/billing" && <CreditCard className="h-4 w-4 text-emerald-600 shrink-0" />}
                        {item.url === "/profile" && <User className="h-4 w-4 text-foreground shrink-0" />}

                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-muted/30">
                          {item.badge}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground opacity-50" />
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Appearance & Themes */}
            <CommandSeparator />
            <CommandGroup heading="🎨 Appearance & Themes">
              <CommandItem
                value="theme light mode appearance switch color brightness"
                onSelect={() => {
                  setTheme("light");
                  setOpen(false);
                }}
                className="flex items-center justify-between py-2 px-3 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Sun className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-medium">Switch to Light Theme</span>
                </div>
                {mounted && theme === "light" && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/40 text-primary">
                    Active
                  </Badge>
                )}
              </CommandItem>

              <CommandItem
                value="theme dark mode appearance switch color darkness"
                onSelect={() => {
                  setTheme("dark");
                  setOpen(false);
                }}
                className="flex items-center justify-between py-2 px-3 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Moon className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">Switch to Dark Theme</span>
                </div>
                {mounted && theme === "dark" && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/40 text-primary">
                    Active
                  </Badge>
                )}
              </CommandItem>

              <CommandItem
                value="theme system auto mode appearance switch preference"
                onSelect={() => {
                  setTheme("system");
                  setOpen(false);
                }}
                className="flex items-center justify-between py-2 px-3 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Laptop className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium">Use System Theme</span>
                </div>
                {mounted && theme === "system" && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/40 text-primary">
                    Active
                  </Badge>
                )}
              </CommandItem>
            </CommandGroup>
          </CommandList>

          <div className="flex items-center justify-between px-3 py-2 border-t border-border/40 text-[11px] text-muted-foreground bg-muted/20">
            <span className="flex items-center gap-1.5 font-mono">
              <kbd className="px-1 py-0.5 rounded border border-border bg-background text-[10px]">↑↓</kbd> navigate
              <span className="mx-1">•</span>
              <kbd className="px-1 py-0.5 rounded border border-border bg-background text-[10px]">↵</kbd> select
              <span className="mx-1">•</span>
              <kbd className="px-1 py-0.5 rounded border border-border bg-background text-[10px]">esc</kbd> close
            </span>
            <span className="font-semibold text-primary/80">CareerPilot Command</span>
          </div>
        </Command>
      </CommandDialog>

      {/* Embedded Job Clip Dialog triggerable directly from command palette */}
      <QuickJobClipDialog
        triggerButton={null}
        open={clipDialogOpen}
        onOpenChange={setClipDialogOpen}
      />
    </>
  );
}
