import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { RequestsClient } from "./requests-client";

export default async function RequestsPage() {
  const session = await getServerSession(authOptions);
  const isAdminOrTrusted = ["admin", "trusted"].includes(
    (session?.user as any)?.role
  );

  const requests = await prisma.request.findMany({
    include: {
      user: { select: { username: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const myRequests = await prisma.request.findMany({
    where: { userId: (session?.user as any)?.id },
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
  });

  const counts = {
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    available: requests.filter((r) => r.status === "available").length,
    declined: requests.filter((r) => r.status === "declined").length,
  };

  return (
    <RequestsClient
      requests={requests as any}
      myRequests={myRequests as any}
      counts={counts}
      canModerate={isAdminOrTrusted}
    />
  );
}