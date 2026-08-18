import { Navbar } from "@/components/navbar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isDemoMode = process.env.DEMO_MODE === "true";

  if (!isDemoMode) {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    return (
      <div className="min-h-screen bg-background">
        <Navbar session={session as any} />
        <main className="container mx-auto max-w-7xl px-4 py-6">{children}</main>
      </div>
    );
  }

  // Demo mode: publicly accessible, no login required.
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    // Ignore auth errors in demo mode
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar session={session as any} demoMode />
      <main className="container mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}