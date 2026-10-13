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
import { logoutUserAction } from "@/app/actions/auth";

const navItems = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Resumes", href: "/resumes", icon: FileText },
  { name: "Jobs", href: "/jobs", icon: Bookmark },
  { name: "Applications", href: "/applications", icon: KanbanSquare },
  { name: "AI Coach", href: "/coach", icon: MessageSquare },
  { name: "Resume Improver", href: "/improve", icon: Sparkles },
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

      <div className="mt-auto pt-6 space-y-1 border-t border-border">
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
