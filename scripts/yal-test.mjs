const base = process.env.YAL_BASE;
const e = process.env;
const h = { "X-API-ID": e.YAL_ID, "X-API-TOKEN": e.YAL_TOKEN, "Content-Type": "application/json" };
const mask = (s) => String(s).replace(/\d{8,}/g, "***").slice(0, 700);
const quota = (r) => ["day", "hour", "minute", "second"].map((k) => k + ":" + r.headers.get(k + "-quota-left")).join(" ");

if (e.CONFIRM !== "CREATE") { console.log("Not confirmed. Nothing was sent."); process.exit(1); }
if (!base || !e.YAL_ID || !e.YAL_TOKEN) { console.log("Missing YAL_* variables."); process.exit(1); }

const orderId = "TEST-" + Date.now();
const [first, ...rest] = e.T_NAME.trim().split(/\s+/);
const parcel = {
  order_id: orderId,
  from_wilaya_name: e.T_FROM,
  firstname: first,
  familyname: rest.join(" ") || first,
  contact_phone: e.T_PHONE,
  address: e.T_ADDRESS,
  to_commune_name: e.T_COMMUNE,
  to_wilaya_name: e.T_WILAYA,
  product_list: "TEST - do not deliver",
  price: 1000,
  do_insurance: false,
  declared_value: 1000,
  length: 10, width: 10, height: 10, weight: 1,
  freeshipping: false,
  is_stopdesk: false,
  has_exchange: false,
};

const res = await fetch(base + "/parcels/", { method: "POST", headers: h, body: JSON.stringify([parcel]), signal: AbortSignal.timeout(20000) });
const text = await res.text();
console.log("CREATE status:", res.status, "|", quota(res));
console.log(mask(text));

let tracking = "";
try { tracking = JSON.parse(text)?.[orderId]?.tracking ?? ""; } catch {}
if (!tracking) { console.log("No tracking returned. Nothing to delete."); process.exit(0); }

console.log("Tracking:", tracking);
await new Promise((r) => setTimeout(r, 1500));
const del = await fetch(base + "/parcels/" + tracking + "/", { method: "DELETE", headers: h, signal: AbortSignal.timeout(20000) });
console.log("DELETE status:", del.status);
console.log(mask(await del.text()));
if (del.status >= 300) console.log("DELETE FAILED: remove " + tracking + " from the Yalidine dashboard manually.");