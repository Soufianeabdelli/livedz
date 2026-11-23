import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";
const b64u = (b: Buffer) => b.toString("base64url");

export function parseKey(b64: string | undefined): Buffer {
  const key = Buffer.from(b64 ?? "", "base64");
  if (key.length !== 32) throw new Error("CREDENTIALS_KEY must be 32 bytes in base64");
  return key;
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