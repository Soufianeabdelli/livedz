import { mkdirSync, writeFileSync } from "node:fs";

const KEY = /^[a-z0-9]{2,40}$/;
const CRED = /^[A-Za-z][A-Za-z0-9]{1,30}$/;

const res = await fetch("https://freeship.dzbuild.com/v1/couriers", { signal: AbortSignal.timeout(20000) });
if (!res.ok) throw new Error("status " + res.status);
const list = await res.json();
if (!Array.isArray(list)) throw new Error("unexpected response");

const seen = new Set();
const out = [];
const skipped = [];
for (const c of list) {
  const ok =
    c && typeof c.key === "string" && KEY.test(c.key) && c.key !== "sandbox" && !seen.has(c.key) &&
    typeof c.name === "string" && c.name.trim().length > 0 && c.name.length <= 60 &&
    Array.isArray(c.requiredCredentials) && c.requiredCredentials.length >= 1 && c.requiredCredentials.length <= 6 &&
    c.requiredCredentials.every((x) => typeof x === "string" && CRED.test(x)) &&
    c.capabilities && c.capabilities.createShipment === true;
  if (!ok) { skipped.push(c && c.key ? c.key : "?"); continue; }
  seen.add(c.key);
  out.push({
    key: c.key,
    name: c.name.trim(),
    platform: String(c.platform ?? "").slice(0, 40),
    aliases: Array.isArray(c.aliases) ? c.aliases.filter((a) => typeof a === "string" && a.length <= 40) : [],
    requiredCredentials: c.requiredCredentials,
    cancel: c.capabilities.cancelShipment === true,
    label: c.capabilities.label === true,
  });
}
out.sort((a, b) => a.key.localeCompare(b.key));
mkdirSync("src/data", { recursive: true });
writeFileSync("src/data/couriers.json", JSON.stringify(out, null, 1) + "\n");
console.log("written:", out.length, "| skipped:", skipped.length, skipped.join(","));