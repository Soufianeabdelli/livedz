import { OrderInput } from "@/lib/order-input";
import { createOrder } from "@/lib/orders";
import { orderLimiter } from "@/lib/rate-limit";
import { resolveDzRegion } from "@/lib/countries/dz/regions";

export type OrderFormState =
  | { status: "idle" }
  | { status: "error"; error: string; fields: string[] }
  | { status: "success"; ref: string; totalDzd: number };

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};

export async function processOrderForm(
  fd: FormData,
  clientKey: string,
  allow: (key: string) => boolean = orderLimiter,
): Promise<OrderFormState> {
  if (!allow(clientKey)) return { status: "error", error: "rate_limited", fields: [] };

  const region = resolveDzRegion(str(fd, "region"));
  const parsed = OrderInput.safeParse({
    token: str(fd, "token"),
    idempotencyKey: str(fd, "idempotencyKey"),
    variantId: str(fd, "variantId"),
    quantity: str(fd, "quantity") || "1",
    customerName: str(fd, "customerName"),
    phone: str(fd, "phone"),
    wilayaCode: region?.courierCode ?? 0,
    commune: str(fd, "commune"),
    deliveryType: str(fd, "deliveryType"),
    address: str(fd, "address") || undefined,
    messagingConsent: str(fd, "consent") === "on",
  });

  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => String(i.path[0] ?? "")))]
      .map((f) => (f === "wilayaCode" ? "region" : f));
    return { status: "error", error: "invalid_input", fields };
  }

  try {
    const r = await createOrder(parsed.data);
    if (!r.ok) return { status: "error", error: r.error, fields: [] };
    return { status: "success", ref: r.orderId.slice(-6).toUpperCase(), totalDzd: r.totalDzd };
  } catch (e) {
    console.error("[order-form] createOrder failed", e); // details stay on the server
    return { status: "error", error: "server_error", fields: [] };
  }
}