import { getSessionUser } from "@/lib/session";
import { getMerchantContext } from "@/lib/merchant";

// merchantId comes only from the verified session, never from the client
export async function requireMerchant(): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const ctx = await getMerchantContext(user);
  if (!ctx?.merchantId) throw new Error("FORBIDDEN");

  return ctx.merchantId;
}