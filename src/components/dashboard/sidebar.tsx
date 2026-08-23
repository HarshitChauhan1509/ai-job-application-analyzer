"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Resumes", href: "/dashboard/resumes", icon: FileText },
  { name: "Jobs", href: "/dashboard/jobs", icon: Bookmark },
  { name: "Applications", href: "/dashboard/applications", icon: KanbanSquare },
  { name: "Interviews", href: "/dashboard/interviews", icon: MessageSquare },
  { name: "AI Coach", href: "/dashboard/coach", icon: Sparkles },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card px-4 py-6">
      <div className="flex items-center gap-2 px-2 mb-8 group">
        <div className="bg-primary text-primary-foreground p-1.5 rounded-md group-hover:scale-105 transition-transform">
          <Briefcase size={20} />
        </div>
        <span className="font-semibold text-xl tracking-tight">CareerPilot</span>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
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

      <div className="mt-auto pt-6 space-y-1 border-t border-border">
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/dashboard/settings"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Settings size={18} />
          Settings
        </Link>
        <Button variant="ghost" className="w-full justify-start gap-3 px-3 py-2 text-muted-foreground hover:text-foreground">
          <LogOut size={18} />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
