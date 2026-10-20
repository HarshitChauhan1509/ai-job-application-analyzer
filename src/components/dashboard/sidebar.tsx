"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  LayoutDashboard,
  FileText,
  Bookmark,
  KanbanSquare,
  MessageSquare,
  Sparkles,
  Settings,
  LogOut,
  Sun,
  Moon,
  Laptop,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutUserAction } from "@/app/actions/auth";

const navItems = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Resumes", href: "/resumes", icon: FileText },
  { name: "Jobs", href: "/jobs", icon: Bookmark },
  { name: "Applications", href: "/applications", icon: KanbanSquare },
  { name: "AI Coach", href: "/coach", icon: MessageSquare },
  { name: "Resume Improver", href: "/improve", icon: Sparkles },
  { name: "Profile", href: "/profile", icon: User },
];

export function Sidebar({ className }: { className?: string } = {}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <aside className={cn("flex w-64 flex-col border-r border-border bg-card px-4 py-6", className)}>
      <div className="flex items-center gap-2 px-2 mb-8 group">
        <div className="bg-primary text-primary-foreground p-1.5 rounded-md group-hover:scale-105 transition-transform">
          <Briefcase size={20} />
        </div>
        <span className="font-semibold text-xl tracking-tight">CareerPilot</span>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon size={18} className={cn(isActive ? "text-primary" : "text-muted-foreground")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 space-y-3 border-t border-border">
        {/* Theme Segmented Switcher */}
        <div className="px-1" suppressHydrationWarning>
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Theme</span>
          </div>
          <div className="grid grid-cols-3 gap-1 bg-muted/50 p-1 rounded-lg border border-border/50" suppressHydrationWarning>
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer",
                mounted && theme === "light"
                  ? "bg-card text-foreground shadow-xs border border-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
              )}
              title="Light theme"
            >
              <Sun size={13} className={mounted && theme === "light" ? "text-amber-500" : ""} />
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer",
                mounted && theme === "dark"
                  ? "bg-card text-foreground shadow-xs border border-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
              )}
              title="Dark theme"
            >
              <Moon size={13} className={mounted && theme === "dark" ? "text-primary" : ""} />
              <span>Dark</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme("system")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer",
                mounted && theme === "system"
                  ? "bg-card text-foreground shadow-xs border border-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
              )}
              title="System theme"
            >
              <Laptop size={13} />
              <span>Auto</span>
            </button>
          </div>
        </div>

        <form action={logoutUserAction}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-3 px-3 py-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut size={18} />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
