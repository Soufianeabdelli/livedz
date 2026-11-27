import { NEW_WILAYA_COMMUNES, WILAYAS_69 } from "./regions-2026";

export type CommuneRow = { name: string; nameAr: string };

// byCourierCode = rows of the Commune table for the wilaya's courier code (1..58)
export function communesForRegion(key: string, byCourierCode: CommuneRow[]): CommuneRow[] {
  const w = WILAYAS_69.find((x) => x.key === key);
  if (!w) return [];
  if (w.isNew) return NEW_WILAYA_COMMUNES[key] ?? [];

  // A parent wilaya hides the communes that moved into its new wilayas
  const moved = new Set<string>();
  for (const n of WILAYAS_69) {
    if (n.isNew && n.courierCode === w.courierCode) {
      for (const c of NEW_WILAYA_COMMUNES[n.key] ?? []) moved.add(c.name);
    }
  }
  return byCourierCode.filter((c) => !moved.has(c.name));
}