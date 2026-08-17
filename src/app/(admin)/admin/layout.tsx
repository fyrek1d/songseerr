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
    <div className="flex min-h-screen">
      <aside className="w-52 shrink-0 border-r bg-card/50 p-4">
        <nav className="space-y-1">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                "hover:bg-muted hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">
        <BackButton />
        <div className="mt-4">{children}</div>
      </main>
    </div>
  );
}