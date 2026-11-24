"use server";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { getMerchantContext } from "@/lib/merchant";

export type DashboardStats = {
  totalOrders: number;
  pendingConfirmation: number;
};

// merchantId comes only from the verified session, never from the client
async function requireMerchant(): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const ctx = await getMerchantContext(user);
  if (!ctx?.merchantId) throw new Error("FORBIDDEN");

  return ctx.merchantId;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const merchantId = await requireMerchant();

  const [totalOrders, pendingConfirmation] = await Promise.all([
    prisma.order.count({ where: { merchantId } }),
    prisma.order.count({
      where: { merchantId, status: "PENDING_CONFIRMATION" },
    }),
  ]);

  return { totalOrders, pendingConfirmation };
}

export async function getOrdersByStatus(): Promise<Record<string, number>> {
  const merchantId = await requireMerchant();

  const rows = await prisma.order.groupBy({
    by: ["status"],
    where: { merchantId },
    _count: { _all: true },
  });

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.status] = row._count._all;
  }
  return counts;
}