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
} from "lucide-react";
import { globalSearchAction, SearchResultItem } from "@/app/actions/search";

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Open on Cmd+K or Ctrl+K
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
    }, 150);

    return () => clearTimeout(timer);
  }, [open, query, fetchResults]);

  const handleSelect = (url: string) => {
    setOpen(false);
    router.push(url);
  };

  const navResults = results.filter((r) => r.category === "navigation");
  const jobResults = results.filter((r) => r.category === "jobs");
  const resumeResults = results.filter((r) => r.category === "resumes");
  const interviewResults = results.filter((r) => r.category === "interviews");

  return (
    <>
      {/* Desktop Search Trigger */}
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="hidden sm:flex w-72 justify-start text-muted-foreground bg-muted/40 hover:bg-muted/70 border-border/80 h-9 px-3 transition-colors"
      >
        <Search size={15} className="mr-2 text-muted-foreground shrink-0" />
        <span className="text-xs truncate">Search jobs, resumes, tools...</span>
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
            placeholder="Type to search applications, resumes, mock interviews, or jump to a page..."
            value={query}
            onValueChange={setQuery}
          />

          <CommandList className="max-h-[360px] py-2">
            {loading && (
              <div className="flex items-center justify-center py-6 text-muted-foreground gap-2 text-xs">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Searching CareerPilot workspace...</span>
              </div>
            )}

            {!loading && results.length === 0 && (
              <CommandEmpty className="py-8 text-center text-xs text-muted-foreground">
                No matching jobs, resumes, or tools found.
              </CommandEmpty>
            )}

            {/* Quick Navigation Pages */}
            {navResults.length > 0 && (
              <CommandGroup heading="Pages & Tools">
                {navResults.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.title} ${item.subtitle}`}
                    onSelect={() => handleSelect(item.url)}
                    className="flex items-center justify-between py-2.5 px-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.url === "/dashboard" && <LayoutDashboard className="h-4 w-4 text-primary shrink-0" />}
                      {item.url === "/jobs" && <Briefcase className="h-4 w-4 text-blue-500 shrink-0" />}
                      {item.url === "/applications" && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                      {item.url === "/resumes" && <FileText className="h-4 w-4 text-purple-500 shrink-0" />}
                      {item.url === "/improve" && <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />}
                      {item.url === "/coach" && <Mic className="h-4 w-4 text-rose-500 shrink-0" />}

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
            )}

            {/* Jobs & Pipeline */}
            {jobResults.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Saved Jobs & Applications">
                  {jobResults.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${item.title} ${item.subtitle} job`}
                      onSelect={() => handleSelect(item.url)}
                      className="flex items-center justify-between py-2.5 px-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Building className="h-4 w-4 text-blue-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-semibold py-0 px-1.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 border-0"
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

            {/* Resumes */}
            {resumeResults.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Resumes & Role Profiles">
                  {resumeResults.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${item.title} ${item.subtitle} resume`}
                      onSelect={() => handleSelect(item.url)}
                      className="flex items-center justify-between py-2.5 px-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="h-4 w-4 text-purple-600 shrink-0" />
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
                          {item.badge}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground opacity-50" />
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Practice Interviews */}
            {interviewResults.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Practice Mock Interviews">
                  {interviewResults.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${item.title} ${item.subtitle} interview`}
                      onSelect={() => handleSelect(item.url)}
                      className="flex items-center justify-between py-2.5 px-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Mic className="h-4 w-4 text-rose-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold py-0 px-1.5 bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                        >
                          Score: {item.badge}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground opacity-50" />
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
