import { prisma } from "@/lib/prisma";
import { IssuesClient } from "./issues-client";

export default async function AdminIssuesPage() {
  const issues = await prisma.issue.findMany({
    include: {
      reporter: { select: { username: true } },
      resolver: { select: { username: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return <IssuesClient issues={issues as any} />;
}