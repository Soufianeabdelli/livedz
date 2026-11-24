import "server-only";
import { prisma } from "@/lib/db";
import { decryptSecretWithKeys, encryptSecret, parseKey, parseKeyRing } from "@/lib/crypto-secrets";
import { getCourier } from "@/lib/couriers/registry";

const key = () => parseKey(process.env.CREDENTIALS_KEY);
const keyRing = () => parseKeyRing(process.env.CREDENTIALS_KEY, process.env.CREDENTIALS_KEY_PREV);
const aad = (merchantId: string, courier: string) => `${merchantId}:${courier}`;
const tail = (s: string) => (s.length > 4 ? "****" + s.slice(-4) : "****");

export type SaveResult = { ok: true } | { ok: false; error: "unknown_courier" | "missing_field" | "bad_wilaya" };

export async function saveCourierAccount(
  merchantId: string, courierKey: string, values: Record<string, string>, fromWilaya: number,
): Promise<SaveResult> {
  const def = getCourier(courierKey);
  if (!def) return { ok: false, error: "unknown_courier" };

  const creds: Record<string, string> = {};
  for (const f of def.fields) {
    const v = (values[f.key] ?? "").trim();
    if (v.length < 3 || v.length > 300) return { ok: false, error: "missing_field" };
    creds[f.key] = v;
  }
  const wilaya = def.needsFromWilaya ? fromWilaya : 0;
  if (def.needsFromWilaya && !(Number.isInteger(wilaya) && wilaya >= 1 && wilaya <= 58)) {
    return { ok: false, error: "bad_wilaya" };
  }

  const lastField = [...def.fields].reverse()[0];
  const data = {
    credentialsEnc: encryptSecret(JSON.stringify(creds), aad(merchantId, courierKey), key()),
    hint: lastField ? tail(creds[lastField.key]) : "-",
    fromWilaya: wilaya,
  };
  await prisma.courierAccount.upsert({
    where: { merchantId_courier: { merchantId, courier: courierKey } },
    update: data,
    create: { merchantId, courier: courierKey, ...data },
  });
  return { ok: true };
}

export async function listCourierAccounts(merchantId: string) {
  return prisma.courierAccount.findMany({
    where: { merchantId },
    select: { courier: true, hint: true, fromWilaya: true, createdAt: true }, // never credentialsEnc
    orderBy: { createdAt: "asc" },
  });
}

export async function deleteCourierAccount(merchantId: string, courierKey: string) {
  await prisma.courierAccount.deleteMany({ where: { merchantId, courier: courierKey } });
}

// Server-only: full credentials, used only when sending a parcel
export async function loadCredentials(merchantId: string, courierKey: string) {
  const row = await prisma.courierAccount.findUnique({
    where: { merchantId_courier: { merchantId, courier: courierKey } },
  });
  if (!row) return null;
  const credentials = JSON.parse(decryptSecretWithKeys(row.credentialsEnc, aad(merchantId, courierKey), keyRing())) as Record<string, string>;
  return { credentials, fromWilaya: row.fromWilaya };
}