"use client";

import { Bell, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Briefcase, LayoutDashboard, FileText, Bookmark, KanbanSquare, MessageSquare, Sparkles, Settings, LogOut } from "lucide-react";

const navItems = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Resumes", href: "/dashboard/resumes", icon: FileText },
  { name: "Jobs", href: "/dashboard/jobs", icon: Bookmark },
  { name: "Applications", href: "/dashboard/applications", icon: KanbanSquare },
  { name: "Interviews", href: "/dashboard/interviews", icon: MessageSquare },
  { name: "AI Coach", href: "/dashboard/coach", icon: Sparkles },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-4">
        {/* Mobile menu trigger */}
        <Sheet>
          <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
            <Menu size={20} />
            <span className="sr-only">Toggle menu</span>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <div className="flex flex-col h-full bg-card px-4 py-6">
              <div className="flex items-center gap-2 px-2 mb-8">
                <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
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
                      <item.icon size={18} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </SheetContent>
        </Sheet>
        
        {/* Global Search trigger (mock) */}
        <Button variant="outline" className="hidden sm:flex w-64 justify-start text-muted-foreground bg-muted/50 border-muted-foreground/20">
          <Search size={16} className="mr-2" />
          <span>Search applications...</span>
          <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Bell size={20} />
          <span className="sr-only">Notifications</span>
        </Button>
        <Avatar className="h-8 w-8 border border-border">
          <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Harshit" alt="User" />
          <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">HC</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
