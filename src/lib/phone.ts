export function toAsciiDigits(s: string): string {
  return s.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) => {
    const c = d.charCodeAt(0);
    return String(c - (c >= 0x06f0 ? 0x06f0 : 0x0660));
  });
}

const MOBILE_DZ = /^0[567]\d{8}$/;

export function normalizeDzPhone(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;
  let s = toAsciiDigits(input).trim();
  if (!/^[+\d\s\-.()]+$/.test(s)) return null;
  s = s.replace(/[\s\-.()]/g, "");

  let intl = false;
  if (s.startsWith("+213")) { s = s.slice(4); intl = true; }
  else if (s.startsWith("00213")) { s = s.slice(5); intl = true; }
  else if (s.startsWith("213") && s.length === 12) { s = s.slice(3); intl = true; }

  if (s.includes("+")) return null;
  if (intl && s.startsWith("0")) s = s.slice(1);
  if (/^[567]\d{8}$/.test(s)) s = "0" + s;
  return MOBILE_DZ.test(s) ? s : null;
}