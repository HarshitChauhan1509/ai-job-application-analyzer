/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Bell, 
  Menu, 
  LogOut, 
  FileText, 
  Bookmark, 
  KanbanSquare, 
  User, 
  Sparkles, 
  MessageSquare,
  ChevronRight,
  ExternalLink 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "@/components/dashboard/sidebar";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { ProfileModal } from "@/components/dashboard/profile-modal";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { logoutUserAction } from "@/app/actions/auth";

export function Header({ user }: { user?: any }) {
  const router = useRouter();
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const initials = user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : "US";
  const seed = user?.name || "User";
  const headline = user?.profile?.headline || "Software Engineer";

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Mobile menu trigger */}
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
              <Menu size={20} />
              <span className="sr-only">Toggle menu</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <Sidebar />
            </SheetContent>
          </Sheet>
          
          {/* Global Search command palette */}
          <GlobalSearch />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle option */}
          <ThemeToggle />

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Bell size={19} />
            <span className="sr-only">Notifications</span>
          </Button>

          {/* User profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="rounded-full ring-offset-background transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                />
              }
            >
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} alt="User" />
                <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">{initials}</AvatarFallback>
              </Avatar>
              <span className="sr-only">Open user menu</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-1.5 shadow-xl">
              {/* Clickable Profile Card in Dropdown */}
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                className="w-full text-left p-2.5 rounded-lg hover:bg-muted/60 transition-colors border-b border-border/50 mb-1.5 group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {user?.name || "Candidate"}
                      </p>
                      <Badge variant="secondary" className="text-[10px] font-semibold py-0 px-1 bg-primary/10 text-primary border-0">
                        Pro
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{user?.email || "harshit@gmail.com"}</p>
                    <p className="text-[11px] text-primary/80 font-medium truncate mt-0.5">{headline}</p>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
                </div>
              </button>

              <DropdownMenuItem
                onClick={() => setProfileModalOpen(true)}
                className="cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span>Edit Profile</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">Modal</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => router.push("/profile")}
                className="cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  <span>Full Profile Page</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => router.push("/resumes")}
                className="cursor-pointer flex items-center gap-2"
              >
                <FileText className="h-4 w-4 text-purple-500" />
                <span>My Resumes</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => router.push("/applications")}
                className="cursor-pointer flex items-center gap-2"
              >
                <KanbanSquare className="h-4 w-4 text-blue-500" />
                <span>Applications Pipeline</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => router.push("/coach")}
                className="cursor-pointer flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4 text-rose-500" />
                <span>AI Interview Coach</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => router.push("/improve")}
                className="cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>AI Resume Improver</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <form action={logoutUserAction} className="w-full">
                <button
                  type="submit"
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer text-left"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </button>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Interactive Candidate Profile Modal */}
      <ProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        initialUser={user}
      />
    </>
  );
}
