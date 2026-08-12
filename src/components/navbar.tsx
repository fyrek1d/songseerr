"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { BookOpen, Music, Home, Library, Search, User, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Discover", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/requests", label: "Requests", icon: BookOpen },
  { href: "/library", label: "Library", icon: Library },
  { href: "/collections", label: "Collections", icon: Music },
];

export function Navbar({ session }: { session: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = session?.user?.role === "admin";

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <BookOpen className="h-6 w-6" />
          <span>MediaSeer</span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
           {isAdmin && (
             <Link
               href="/admin"
               className={cn(
                 "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                 pathname && pathname.startsWith("/admin")
                   ? "bg-primary text-primary-foreground"
                   : "text-muted-foreground hover:bg-muted hover:text-foreground"
               )}
             >
               <Settings className="h-4 w-4" />
               <span className="hidden sm:inline">Admin</span>
             </Link>
           )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link href="/profile">
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{session?.user?.name}</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}