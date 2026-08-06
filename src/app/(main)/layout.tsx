import { Navbar } from "@/components/navbar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <Navbar session={session as any} />
      <main className="container mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}