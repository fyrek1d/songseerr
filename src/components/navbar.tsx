"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Music, Home, Search, List, User, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Discover", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/requests", label: "Requests", icon: Music },
  { href: "/library", label: "Library", icon: List },
  { href: "/collections", label: "Collections", icon: Music },
];

export function Navbar({ session }: { session: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = session?.user?.role === "admin";

  return (
    <header className="sticky top-0 z-50 bg-primary border-b border-primary/20 shadow-lg">
      <div className="container-main flex h-16 items-center gap-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-primary-foreground">
          <Music className="h-6 w-6" />
          <span>SongSeerr</span>
        </Link>

        <nav className="flex items-center gap-1 ml-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-primary-foreground/10 text-primary-foreground"
                    : "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
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
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                pathname && pathname.startsWith("/admin")
                  ? "bg-primary-foreground/10 text-primary-foreground"
                  : "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
              )}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/profile">
            <Button variant="ghost" size="sm" className="gap-2 text-primary-foreground hover:bg-primary-foreground/10">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{session?.user?.name}</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}