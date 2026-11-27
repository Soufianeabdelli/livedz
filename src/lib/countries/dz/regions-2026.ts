import wilayasRaw from "./wilayas-2026.json";
import newRaw from "./new-wilayas-2026.json";

// Data from DZBuild dzship (MIT / public domain). Courier codes stay 1..58 until couriers support 59..69.
type RawWilaya = { code: number; name: string; nameAr: string };
type RawNew = RawWilaya & { shipAs: number; communes: { name: string; nameAr: string }[] };

// Existing region keys used by regions.ts and saved on orders (officialRegionKey)
const NEW_KEYS: Record<number, string> = {
  59: "n-aflou",
  60: "n-barika",
  61: "n-el-kantara",
  62: "n-bir-el-ater",
  63: "n-el-aricha",
  64: "n-ksar-chellala",
  65: "n-ain-oussera",
  66: "n-messaad",
  67: "n-ksar-el-boukhari",
  68: "n-bou-saada",
  69: "n-el-abiodh-sidi-cheikh",
};

const wilayas = wilayasRaw as unknown as RawWilaya[];
const news = newRaw as unknown as RawNew[];
const newByCode = new Map(news.map((n) => [n.code, n]));

export type Wilaya69 = {
  code: number;
  key: string;
  name: string;
  nameAr: string;
  courierCode: number;
  isNew: boolean;
};

export const WILAYAS_69: Wilaya69[] = wilayas
  .map((w) => {
    const n = newByCode.get(w.code);
    return {
      code: w.code,
      key: n ? (NEW_KEYS[w.code] ?? "") : String(w.code),
      name: w.name,
      nameAr: w.nameAr,
      courierCode: n ? n.shipAs : w.code,
      isNew: Boolean(n),
    };
  })
  .sort((a, b) => a.code - b.code);

// Communes that moved into each new wilaya, by region key
export const NEW_WILAYA_COMMUNES: Record<string, { name: string; nameAr: string }[]> = Object.fromEntries(
  news.map((n) => [NEW_KEYS[n.code] ?? "", n.communes]),
);