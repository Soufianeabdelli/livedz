"use server";

import { prisma } from "@/lib/db";
import { resolveDzRegion } from "@/lib/countries/dz/regions";
import { communesForRegion, type CommuneRow } from "@/lib/countries/dz/communes";

// Public, read-only reference data: communes of one wilaya
export async function listCommunes(regionKey: string): Promise<CommuneRow[]> {
  if (typeof regionKey !== "string" || regionKey.length > 40) return [];
  const region = resolveDzRegion(regionKey);
  if (!region) return [];
  const rows = await prisma.commune.findMany({
    where: { wilayaCode: region.courierCode },
    orderBy: { name: "asc" },
    select: { name: true, nameAr: true },
  });
  return communesForRegion(regionKey, rows);
}