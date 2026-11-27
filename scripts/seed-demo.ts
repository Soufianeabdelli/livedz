import { randomBytes } from "node:crypto";
import { prisma } from "../src/lib/db";

async function main() {
  const m = await prisma.merchant.findUniqueOrThrow({
    where: { slug: "boutique-dz" },
    select: { id: true },
  });

  let p = await prisma.product.findFirst({
    where: { merchantId: m.id, code: "02" },
    select: { id: true },
  });

  if (p) {
    await prisma.product.update({ where: { id: p.id }, data: { isActive: true } });
    console.log("EXISTS: product #02 (re-activated)");
  } else {
    p = await prisma.product.create({
      data: {
        merchantId: m.id,
        code: "02",
        name: "Essential Hoodie",
        priceDzd: 2800,
        variants: {
          create: [
            { sku: "BDZ-02-M-BLK", size: "M", color: "Black", stock: 8 },
            { sku: "BDZ-02-L-SAG", size: "L", color: "Sage", stock: 4 },
          ],
        },
      },
      select: { id: true },
    });
    console.log("CREATED: product #02 Essential Hoodie");
  }

  const card = await prisma.card.findFirst({
    where: { merchantId: m.id, productId: p.id, isActive: true },
    select: { id: true },
  });

  if (card) {
    console.log("EXISTS: active card for #02");
  } else {
    await prisma.card.create({
      data: {
        token: randomBytes(12).toString("base64url"),
        merchantId: m.id,
        productId: p.id,
      },
    });
    console.log("CREATED: active card for #02");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("SEED FAILED:", e instanceof Error ? e.message : e);
    await prisma.$disconnect();
    process.exit(1);
  });
