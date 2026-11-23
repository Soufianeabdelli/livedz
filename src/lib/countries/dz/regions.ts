export type Region = { key: string; name: string; courierCode: number };

// 58 wilayas still used by couriers (codes 1..58)
const BASE = ("Adrar,Chlef,Laghouat,Oum El Bouaghi,Batna,Bejaia,Biskra,Bechar,Blida,Bouira," +
  "Tamanrasset,Tebessa,Tlemcen,Tiaret,Tizi Ouzou,Alger,Djelfa,Jijel,Setif,Saida," +
  "Skikda,Sidi Bel Abbes,Annaba,Guelma,Constantine,Medea,Mostaganem,M'Sila,Mascara,Ouargla," +
  "Oran,El Bayadh,Illizi,Bordj Bou Arreridj,Boumerdes,El Tarf,Tindouf,Tissemsilt,El Oued,Khenchela," +
  "Souk Ahras,Tipaza,Mila,Ain Defla,Naama,Ain Temouchent,Ghardaia,Relizane,Timimoun,Bordj Badji Mokhtar," +
  "Ouled Djellal,Beni Abbes,In Salah,In Guezzam,Touggourt,Djanet,El M'Ghair,El Meniaa").split(",");

// 11 new wilayas (law of April 2026), mapped to the wilaya they split from.
// Official codes 59..69 are NOT used until couriers support them.
const NEW: [string, string, number][] = [
  ["n-aflou", "Aflou", 3],
  ["n-barika", "Barika", 5],
  ["n-el-kantara", "El Kantara", 7],
  ["n-bir-el-ater", "Bir El Ater", 12],
  ["n-el-aricha", "El Aricha", 13],
  ["n-ksar-chellala", "Ksar Chellala", 14],
  ["n-ain-oussera", "Ain Oussera", 17],
  ["n-messaad", "Messaad", 17],
  ["n-ksar-el-boukhari", "Ksar El Boukhari", 26],
  ["n-bou-saada", "Bou Saada", 28],
  ["n-el-abiodh-sidi-cheikh", "El Abiodh Sidi Cheikh", 32],
];

export const DZ_REGIONS: Region[] = [
  ...BASE.map((name, i) => ({ key: String(i + 1), name, courierCode: i + 1 })),
  ...NEW.map(([key, name, courierCode]) => ({ key, name, courierCode })),
].sort((a, b) => a.name.localeCompare(b.name));

const BY_KEY = new Map(DZ_REGIONS.map((r) => [r.key, r]));

// Form sends a key ("16" or "n-barika"); server turns it into a courier code
export function resolveDzRegion(key: string): Region | null {
  return BY_KEY.get(key) ?? null;
}