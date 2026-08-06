import { prisma } from "./prisma";
import { getSettings, getWebhookUrl } from "./settings";

export const REQUEST_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  DECLINED: "declined",
  AVAILABLE: "available",
} as const;

export type RequestStatus = (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS];

export async function createRequest(data: {
  type: string;
  title: string;
  subtitle?: string;
  coverUrl?: string;
  externalId: string;
  externalUrl?: string;
  userId: string;
  note?: string;
}) {
  const settings = await getSettings();

  const existing = await prisma.request.findFirst({
    where: {
      externalId: data.externalId,
      type: data.type,
      status: { in: [REQUEST_STATUS.PENDING, REQUEST_STATUS.APPROVED] },
    },
  });

  if (existing) {
    return { status: 409, error: "Item already requested." };
  }

  const existingInLibrary = await prisma.libraryItem.findFirst({
    where: {
      externalId: data.externalId,
      type: data.type,
    },
  });

  if (existingInLibrary) {
    return { status: 409, error: "Item already in library." };
  }

  const user = await prisma.user.findUnique({ where: { id: data.userId } });
  if (!user) return { status: 404, error: "User not found." };

  const approved = settings.autoApproveTrusted && user.role === "trusted";

  const request = await prisma.request.create({
    data: {
      ...data,
      status: approved ? REQUEST_STATUS.APPROVED : REQUEST_STATUS.PENDING,
      approvedAt: approved ? new Date() : null,
    },
  });

  if (approved) {
    notifyWebhook("request-approved", {
      title: request.title,
      type: request.type,
      requestedBy: user.username,
    });
  }

  return { status: 201, request };
}

export async function getRequests(filters?: {
  status?: string;
  userId?: string;
  type?: string;
}) {
  return prisma.request.findMany({
    where: {
      status: filters?.status,
      userId: filters?.userId,
      type: filters?.type,
    },
    include: { user: { select: { username: true, role: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateRequestStatus(
  id: string,
  status: RequestStatus,
  actorId: string
) {
  const existing = await prisma.request.findUnique({ where: { id } });
  if (!existing) return { status: 404, error: "Request not found." };

  const now = new Date();
  const data: any = { status };
  if (status === REQUEST_STATUS.APPROVED) data.approvedAt = now;
  if (status === REQUEST_STATUS.DECLINED) data.declinedAt = now;
  if (status === REQUEST_STATUS.AVAILABLE) data.fulfilledAt = now;

  const request = await prisma.request.update({
    where: { id },
    data,
    include: { user: { select: { username: true, role: true } } },
  });

  notifyWebhook("request-" + status, {
    title: request.title,
    type: request.type,
    requestedBy: request.user.username,
  });

  return { status: 200, request };
}

export async function notifyWebhook(event: string, payload: Record<string, any>) {
  const url = await getWebhookUrl();
  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() }),
    });
  } catch {
    // Webhook failures should never break the main flow
  }
}

export async function canRequest(userId: string): Promise<boolean> {
  const settings = await getSettings();
  const count = await prisma.request.count({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  });
  return count < settings.requestLimit;
}