import raw from "@/data/couriers.json";

export type CourierField = { key: string; label: string; secret: boolean };
export type CourierDef = {
  key: string;
  label: string;
  fields: CourierField[];
  needsFromWilaya: boolean;
  canCancel: boolean;
  hasLabel: boolean;
  aliases: string[];
};

type Raw = {
  key: string; name: string; platform: string; aliases: string[];
  requiredCredentials: string[]; cancel: boolean; label: boolean;
};

const WORDS: Record<string, string> = { api: "API", id: "ID", url: "URL" };
const labelOf = (n: string) =>
  n.replace(/([a-z])([A-Z])/g, "$1 $2").split(" ")
    .map((w) => WORDS[w.toLowerCase()] ?? w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
// Safe default: a field is secret unless it is clearly an identifier like apiId or tenantId
const isSecret = (n: string) => !(/Id$/.test(n) && !/token|secret|key|password/i.test(n));

const POPULAR = ["yalidine", "zrexpress", "maystro", "noest"];

const SANDBOX: CourierDef = {
  key: "sandbox", label: "Test (sandbox)", fields: [], needsFromWilaya: false,
  canCancel: false, hasLabel: false, aliases: ["test"],
};

const fromApi: CourierDef[] = (raw as unknown as Raw[])
  .map((c) => ({
    key: c.key,
    label: c.name,
    fields: c.requiredCredentials.map((k) => ({ key: k, label: labelOf(k), secret: isSecret(k) })),
    needsFromWilaya: c.platform === "yalidine",
    canCancel: c.cancel,
    hasLabel: c.label,
    aliases: c.aliases,
  }))
  .sort((a, b) => {
    const pa = POPULAR.indexOf(a.key), pb = POPULAR.indexOf(b.key);
    if (pa !== -1 || pb !== -1) return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
    return a.label.localeCompare(b.label);
  });

export const COURIERS: CourierDef[] = [SANDBOX, ...fromApi];

export const getCourier = (key: string) => COURIERS.find((c) => c.key === key);

export function searchCouriers(query: string): CourierDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return COURIERS;
  return COURIERS.filter(
    (c) => c.label.toLowerCase().includes(q) || c.key.includes(q) || c.aliases.some((a) => a.toLowerCase().includes(q)),
  );
}