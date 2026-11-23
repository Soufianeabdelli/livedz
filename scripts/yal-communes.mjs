import { readFileSync } from "node:fs";

const base = process.env.YAL_BASE;
const h = { "X-API-ID": process.env.YAL_ID, "X-API-TOKEN": process.env.YAL_TOKEN };
const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const ours = JSON.parse(readFileSync("data/communes.json", "utf8"));

for (const w of [31, 16]) {
  const res = await fetch(`${base}/communes/?wilaya_id=${w}&page_size=200`, { headers: h, signal: AbortSignal.timeout(15000) });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.data) { console.log("wilaya", w, "status", res.status); continue; }
  const theirs = j.data.map((c) => c.name);
  const mine = ours.filter((c) => c.wilayaCode === w).map((c) => c.name);
  const T = new Set(theirs.map(norm));
  const M = new Set(mine.map(norm));
  console.log(`wilaya ${w}: yalidine=${theirs.length} ours=${mine.length} has_more=${j.has_more}`);
  console.log("  only at yalidine:", theirs.filter((n) => !M.has(norm(n))).join(" | ") || "-");
  console.log("  only ours       :", mine.filter((n) => !T.has(norm(n))).join(" | ") || "-");
  await new Promise((done) => setTimeout(done, 500));
}