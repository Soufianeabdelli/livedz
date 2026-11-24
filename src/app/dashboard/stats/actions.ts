"use server";

import { prisma } from "@/lib/db"; // verify this path in the project
import { getSessionUser } from "@/lib/session";
import { getMerchantContext } from "@/lib/merchant";

export type DashboardStats = {
  totalOrders: number;
  pendingConfirmation: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const ctx = await getMerchantContext(user);
  if (!ctx?.merchantId) throw new Error("FORBIDDEN");

  // merchantId comes only from the verified session, never from the client
  const merchantId = ctx.merchantId;

  const [totalOrders, pendingConfirmation] = await Promise.all([
    prisma.order.count({ where: { merchantId } }),
    prisma.order.count({
      where: { merchantId, status: "PENDING_CONFIRMATION" },
    }),
  ]);

  return { totalOrders, pendingConfirmation };
}