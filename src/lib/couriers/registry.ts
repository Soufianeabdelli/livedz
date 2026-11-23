export type CourierField = { key: string; label: string; secret: boolean };
export type CourierDef = { key: string; label: string; fields: CourierField[]; needsFromWilaya: boolean };

export const COURIERS: CourierDef[] = [
  { key: "sandbox", label: "Test (sandbox)", fields: [], needsFromWilaya: false },
  {
    key: "yalidine", label: "Yalidine", needsFromWilaya: true,
    fields: [
      { key: "apiId", label: "API ID", secret: false },
      { key: "apiToken", label: "API Token", secret: true },
    ],
  },
  {
    key: "zrexpressnew", label: "ZR Express", needsFromWilaya: false,
    fields: [
      { key: "apiKey", label: "API Key", secret: true },
      { key: "tenantId", label: "Tenant ID", secret: false },
    ],
  },
  { key: "dhd", label: "DHD (Ecotrack)", needsFromWilaya: false, fields: [{ key: "token", label: "Token", secret: true }] },
  { key: "osenexpress", label: "Osen Express", needsFromWilaya: false, fields: [{ key: "token", label: "Token", secret: true }] },
];

export const getCourier = (key: string) => COURIERS.find((c) => c.key === key);