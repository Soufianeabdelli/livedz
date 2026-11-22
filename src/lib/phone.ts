// Arabic-Indic and Persian digits to ASCII
export function toAsciiDigits(s: string): string {
  return s.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) => {
    const c = d.charCodeAt(0);
    return String(c - (c >= 0x06f0 ? 0x06f0 : 0x0660));
  });
}

// Algerian mobile: 05 / 06 / 07 + 8 digits
const MOBILE_DZ = /^0[567]\d{8}$/;

export function normalizeDzPhone(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;
  let s = toAsciiDigits(input).trim();
  if (!/^[+\d\s\-.()]+$/.test(s)) return null; // letters are rejected
  s = s.replace(/[\s\-.()]/g, "");

  if (s.startsWith("+213")) s = "0" + s.slice(4);
  else if (s.startsWith("00213")) s = "0" + s.slice(5);
  else if (s.startsWith("213") && s.length === 12) s = "0" + s.slice(3);

  if (s.includes("+")) return null;
  if (/^00[567]\d{8}$/.test(s)) s = s.slice(1); // "+213 0550..." extra zero
  return MOBILE_DZ.test(s) ? s : null;
}