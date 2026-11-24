"use server";

import { prisma } from "@/lib/db";
import { requireMerchant } from "@/lib/require-merchant";

export type LiveSessionRow = {
  id: string;
  tiktokUsername: string;
  status: string;
  sessionToken: string;
  commentsSeen: number;
  ordersCreated: number;
  questionsSeen: number;
  errors: number;
  lastError: string | null;
  startedAt: Date | null;
};

export async function getLiveSessions(): Promise<LiveSessionRow[]> {
  const merchantId = await requireMerchant();

  const sessions = await prisma.liveSession.findMany({
    where: { merchantId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      tiktokUsername: true,
      status: true,
      sessionToken: true,
      commentsSeen: true,
      ordersCreated: true,
      questionsSeen: true,
      errors: true,
      lastError: true,
      startedAt: true,
    },
  });

  return sessions;
}