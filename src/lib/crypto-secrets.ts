import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";
const b64u = (b: Buffer) => b.toString("base64url");

export function parseKey(b64: string | undefined): Buffer {
  const key = Buffer.from(b64 ?? "", "base64");
  if (key.length !== 32) throw new Error("CREDENTIALS_KEY must be 32 bytes in base64");
  return key;
}

/** Parse primary key + optional comma-separated previous keys for zero-downtime key rotation. */
export function parseKeyRing(primaryB64: string | undefined, prevB64?: string | undefined): Buffer[] {
  const ring = [parseKey(primaryB64)];
  if (prevB64) {
    for (const part of prevB64.split(",").map((s) => s.trim()).filter(Boolean)) {
      ring.push(parseKey(part));
    }
  }
  return ring;
}

// aad ties the ciphertext to its owner (for example "merchantId:courier")
export function encryptSecret(plain: string, aad: string, key: Buffer): string {
  if (key.length !== 32) throw new Error("bad key length");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, b64u(iv), b64u(cipher.getAuthTag()), b64u(ct)].join(".");
}

export function decryptSecret(payload: string, aad: string, key: Buffer): string {
  if (key.length !== 32) throw new Error("bad key length");
  const [v, iv, tag, ct] = payload.split(".");
  if (v !== VERSION || !iv || !tag || !ct) throw new Error("bad payload");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
}

/** Try decrypting with the primary key, falling back to rotated previous keys if provided. */
export function decryptSecretWithKeys(payload: string, aad: string, keys: Buffer[]): string {
  let lastErr: unknown;
  for (const k of keys) {
    try {
      return decryptSecret(payload, aad, k);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("decryption failed");
}
