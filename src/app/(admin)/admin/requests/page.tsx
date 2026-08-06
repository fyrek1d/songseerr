import { prisma } from "@/lib/prisma";
import { RequestsClient } from "@/app/(main)/requests/requests-client";

export default async function AdminRequestsPage() {
  const requests = await prisma.request.findMany({
    include: { user: { select: { username: true, role: true } } },
    orderBy: { createdAt: "desc" },
  });

  const myRequests = await prisma.request.findMany({
    where: { userId: "" },
    include: { user: { select: { username: true } } },
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
      canModerate={true}
    />
  );
}