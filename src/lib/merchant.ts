import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

export type MerchantContext = { merchantId: string; merchantName: string; role: string };

// merchantId always comes from the verified session user, never from the URL or a form
export async function getMerchantContext(user: { uid: string; email: string | null }): Promise<MerchantContext> {
  const find = () =>
    prisma.membership.findFirst({
      where: { userId: user.uid },
      orderBy: { id: "asc" },
      include: { merchant: { select: { id: true, name: true } } },
    });

  let m = await find();
  if (!m) {
    await prisma.$transaction(async (tx) => {
      // One lock per user: parallel first visits create only one merchant
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.uid}))`;
      if (await tx.membership.findFirst({ where: { userId: user.uid } })) return;
      const name = (user.email ?? "").split("@")[0].slice(0, 30) || "Ma boutique";
      const merchant = await tx.merchant.create({
        data: { name, slug: `m-${randomBytes(5).toString("hex")}` },
      });
      await tx.membership.create({ data: { userId: user.uid, merchantId: merchant.id, role: "OWNER" } });
    });
    m = await find();
  }
  if (!m) throw new Error("merchant_not_found");
  return { merchantId: m.merchant.id, merchantName: m.merchant.name, role: m.role };
}