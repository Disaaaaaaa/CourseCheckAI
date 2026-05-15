"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  LayoutDashboard,
  FileStack,
  UploadCloud,
  Lightbulb,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/login/actions";

const NAV = [
  { href: "/dashboard", label: "Басты бет", icon: LayoutDashboard },
  { href: "/submissions", label: "Тексерулер", icon: FileStack },
  { href: "/submissions/new", label: "Жаңа тексеру", icon: UploadCloud },
  { href: "/topics", label: "Тақырып таңдау", icon: Lightbulb },
  { href: "/settings", label: "Баптаулар", icon: Settings },
];

interface AppShellProps {
  user: { fullName: string; email: string };
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen w-full bg-muted/20">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-background md:flex">
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">CourseCheck AI</p>
            <p className="text-xs text-muted-foreground">12-сынып · Тарих</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3 text-xs text-muted-foreground">
          Соңғы шешімді мұғалім бекітеді.
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-8">
          <div className="md:hidden flex items-center gap-2 font-semibold">
            <GraduationCap className="h-5 w-5 text-primary" />
            CourseCheck AI
          </div>
          <div className="hidden md:block text-sm text-muted-foreground">
            {NAV.find((i) =>
              i.href === pathname ||
              (i.href !== "/dashboard" && pathname.startsWith(i.href)),
            )?.label ?? "CourseCheck AI"}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-semibold">
                  {user.fullName.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-sm font-medium">{user.fullName}</span>
                  <span className="text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Мұғалім</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">Профиль</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <LogOut className="h-4 w-4" />
                  Шығу
                </button>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
