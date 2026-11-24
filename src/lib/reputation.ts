import { prisma } from "@/lib/db";
import { normalizeDzPhone } from "@/lib/phone";

export type ReputationSummary = {
  phone: string;
  deliveredCount: number;
  returnedCount: number;
  refusedCount: number;
  blocked: boolean;
  risk: "none" | "medium" | "high";
};

function computeRisk(r: { deliveredCount: number; returnedCount: number; refusedCount: number; blocked: boolean }): ReputationSummary["risk"] {
  if (r.blocked || r.refusedCount >= 2 || r.returnedCount >= 2) return "high";
  if (r.refusedCount >= 1 || r.returnedCount >= 1) return "medium";
  return "none";
}

export async function getBuyerReputation(merchantId: string, rawPhone: string): Promise<ReputationSummary | null> {
  const phone = normalizeDzPhone(rawPhone);
  if (!phone) return null;
  const row = await prisma.buyerReputation.findUnique({
    where: { merchantId_phone: { merchantId, phone } },
  });
  if (!row) return null;
  return { ...row, risk: computeRisk(row) };
}

export async function getReputationMap(merchantId: string, phones: (string | null)[]): Promise<Map<string, ReputationSummary>> {
  const unique = [...new Set(phones.filter((p): p is string => Boolean(p)))];
  if (unique.length === 0) return new Map();
  const rows = await prisma.buyerReputation.findMany({
    where: { merchantId, phone: { in: unique } },
  });
  return new Map(rows.map((r) => [r.phone, { ...r, risk: computeRisk(r) }]));
}

export async function recordDeliveryOutcome(
  merchantId: string,
  rawPhone: string | null | undefined,
  outcome: "DELIVERED" | "RETURNED" | "REFUSED",
): Promise<void> {
  const phone = normalizeDzPhone(rawPhone);
  if (!phone) return;

  await prisma.buyerReputation.upsert({
    where: { merchantId_phone: { merchantId, phone } },
    update: {
      ...(outcome === "DELIVERED" ? { deliveredCount: { increment: 1 } } : {}),
      ...(outcome === "RETURNED" ? { returnedCount: { increment: 1 } } : {}),
      ...(outcome === "REFUSED" ? { refusedCount: { increment: 1 } } : {}),
    },
    create: {
      merchantId,
      phone,
      deliveredCount: outcome === "DELIVERED" ? 1 : 0,
      returnedCount: outcome === "RETURNED" ? 1 : 0,
      refusedCount: outcome === "REFUSED" ? 1 : 0,
    },
  });
}

export async function setBuyerBlocked(
  merchantId: string,
  rawPhone: string,
  blocked: boolean,
  note?: string,
) {
  const phone = normalizeDzPhone(rawPhone);
  if (!phone) return { ok: false as const, error: "invalid_phone" as const };
  await prisma.buyerReputation.upsert({
    where: { merchantId_phone: { merchantId, phone } },
    update: { blocked, ...(note !== undefined ? { note } : {}) },
    create: { merchantId, phone, blocked, note: note ?? null },
  });
  return { ok: true as const };
}
