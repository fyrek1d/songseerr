import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BackButton } from "@/components/back-button";

const adminLinks = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/requests", label: "Requests", exact: true },
  { href: "/admin/settings", label: "Request Rules", exact: true },
  { href: "/admin/integrations", label: "Integrations", exact: true },
  { href: "/admin/users", label: "Users", exact: true },
  { href: "/admin/issues", label: "Issues", exact: true },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "admin") redirect("/");

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-56 shrink-0 border-r border-border bg-card p-5">
        <div className="mb-8">
          <Link href="/admin" className="flex items-center gap-2 text-lg font-bold text-foreground">
            <span className="text-primary">Songseerr</span>
            <span className="text-xs text-muted-uppercase tracking-wider">Admin</span>
          </Link>
        </div>
        <nav className="space-y-1.5">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "block rounded-md px-3.5 py-2.5 text-sm font-medium transition-colors",
                "hover:bg-primary/10 hover:text-primary text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8 sm:p-10 lg:p-12">
        <BackButton />
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}