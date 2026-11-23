import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, parseKey } from "./crypto-secrets";

const key = randomBytes(32);
const secret = JSON.stringify({ apiId: "ID-123", apiToken: "TOKEN-xyz" });
const AAD = "merchant1:yalidine";

function flip(payload: string, index: number): string {
  const parts = payload.split(".");
  const bytes = Buffer.from(parts[index], "base64url");
  bytes[0] ^= 1;
  parts[index] = bytes.toString("base64url");
  return parts.join(".");
}

describe("crypto-secrets", () => {
  it("decrypts what it encrypted", () => {
    expect(decryptSecret(encryptSecret(secret, AAD, key), AAD, key)).toBe(secret);
  });

  it("uses a new random IV each time", () => {
    expect(encryptSecret(secret, AAD, key)).not.toBe(encryptSecret(secret, AAD, key));
  });

  it("does not leak the plaintext", () => {
    expect(encryptSecret(secret, AAD, key)).not.toContain("TOKEN-xyz");
  });

  it("rejects the wrong key", () => {
    const p = encryptSecret(secret, AAD, key);
    expect(() => decryptSecret(p, AAD, randomBytes(32))).toThrow();
  });

  it("rejects another merchant or courier (aad)", () => {
    const p = encryptSecret(secret, AAD, key);
    expect(() => decryptSecret(p, "merchant2:yalidine", key)).toThrow();
    expect(() => decryptSecret(p, "merchant1:zrexpress", key)).toThrow();
  });

  it("rejects a tampered ciphertext or tag", () => {
    const p = encryptSecret(secret, AAD, key);
    expect(() => decryptSecret(flip(p, 3), AAD, key)).toThrow();
    expect(() => decryptSecret(flip(p, 2), AAD, key)).toThrow();
  });

  it("rejects garbage input", () => {
    expect(() => decryptSecret("nonsense", AAD, key)).toThrow();
    expect(() => decryptSecret("v2.a.b.c", AAD, key)).toThrow();
  });

  it("only accepts a 32 byte key", () => {
    expect(() => encryptSecret("x", AAD, Buffer.alloc(16))).toThrow();
    expect(() => parseKey("")).toThrow();
    expect(() => parseKey(undefined)).toThrow();
    expect(parseKey(randomBytes(32).toString("base64")).length).toBe(32);
  });
});