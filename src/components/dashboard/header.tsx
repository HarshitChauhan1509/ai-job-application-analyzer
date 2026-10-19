/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import { Bell, Menu, LogOut, FileText, Bookmark, KanbanSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "@/components/dashboard/sidebar";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { logoutUserAction } from "@/app/actions/auth";
import Link from "next/link";

export function Header({ user }: { user?: any }) {
  const initials = user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : "US";
  const seed = user?.name || "User";

  return (
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
          <DropdownMenuContent align="end" className="w-56 p-1.5">
            <div className="px-2 py-1.5 border-b border-border/50 mb-1">
              <p className="text-sm font-semibold text-foreground truncate">{user?.name || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || "harshit@gmail.com"}</p>
            </div>

            <DropdownMenuItem render={<Link href="/resumes" className="flex items-center gap-2 cursor-pointer" />}>
              <FileText className="h-4 w-4" />
              <span>My Resumes</span>
            </DropdownMenuItem>

            <DropdownMenuItem render={<Link href="/jobs" className="flex items-center gap-2 cursor-pointer" />}>
              <Bookmark className="h-4 w-4" />
              <span>Saved Jobs</span>
            </DropdownMenuItem>

            <DropdownMenuItem render={<Link href="/applications" className="flex items-center gap-2 cursor-pointer" />}>
              <KanbanSquare className="h-4 w-4" />
              <span>Applications Pipeline</span>
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
  );
}
