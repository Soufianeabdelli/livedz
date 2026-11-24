import { z } from "zod";
import { normalizeDzPhone } from "./phone";
import { CARD_TOKEN_RE } from "./token";

export const OrderInput = z
  .object({
    token: z.string().regex(CARD_TOKEN_RE),
    idempotencyKey: z.string().min(16).max(64),
    variantId: z.string().min(1).max(40),
    quantity: z.coerce.number().int().min(1).max(5),
    customerName: z.string().trim().min(2).max(60),
    phone: z.string().transform((v, ctx) => {
      const p = normalizeDzPhone(v);
      if (!p) { ctx.addIssue({ code: "custom", message: "invalid_phone" }); return z.NEVER; }
      return p;
    }),
    wilayaCode: z.coerce.number().int().min(1).max(58), // couriers still use 58
    officialRegionKey: z.string().max(40).optional(),
    commune: z.string().trim().min(2).max(80),
    deliveryType: z.enum(["HOME", "STOPDESK"]),
    address: z.string().trim().max(200).optional(),
    messagingConsent: z.boolean().default(false),
  })
  .superRefine((o, ctx) => {
    if (o.deliveryType === "HOME" && (!o.address || o.address.length < 5)) {
      ctx.addIssue({ code: "custom", path: ["address"], message: "address_required" });
    }
  });

export type OrderInput = z.infer<typeof OrderInput>;
