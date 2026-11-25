import { z } from "zod";

const DIGIT_MAP: Record<string, string> = {};
"۰۱۲۳۴۵۶۷۸۹".split("").forEach((d, i) => (DIGIT_MAP[d] = String(i)));
"٠١٢٣٤٥٦٧٨٩".split("").forEach((d, i) => (DIGIT_MAP[d] = String(i)));

export function normalizeDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (ch) => DIGIT_MAP[ch] ?? ch);
}

export const storeProfileSchema = z.object({
  displayName: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  tagline: z.string().trim().max(120).optional(),
  category: z.enum(["SELLER", "SERVICE", "AFFILIATE", "ECOMMERCE"]),
  city: z.string().trim().max(60).optional(),
  whatsapp: z
    .string()
    .transform(normalizeDigits)
    .pipe(z.string().regex(/^\+?\d{8,15}$/, "Enter a valid phone number"))
    .optional()
    .or(z.literal("")),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Choose a valid color").default("#8B5E3C"),
});

export type StoreProfileInput = z.infer<typeof storeProfileSchema>;