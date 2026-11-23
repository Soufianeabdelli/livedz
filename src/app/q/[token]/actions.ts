"use server";

import { headers } from "next/headers";
import { processOrderForm, type OrderFormState } from "@/lib/order-form";

export async function submitOrder(_prev: OrderFormState, fd: FormData): Promise<OrderFormState> {
  const h = await headers();
  // DEV: x-forwarded-for can be spoofed. In production read only the proxy/CDN header.
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return processOrderForm(fd, ip);
}