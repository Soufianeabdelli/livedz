import { config } from "dotenv";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

// 16 random bytes, URL-safe, unguessable
const newToken = () => randomBytes(16).toString("base64url");

async function main() {
  const merchant = await prisma.merchant.upsert({
    where: { slug: "boutique-dz" },
    update: {},
    create: { name: "Boutique DZ (demo)", slug: "boutique-dz" },
  });

  const product = await prisma.product.upsert({
    where: { merchantId_code: { merchantId: merchant.id, code: "01" } },
    update: {},
    create: { merchantId: merchant.id, code: "01", name: "Air-X Sneakers", priceDzd: 4500 },
  });

  for (const size of ["40", "41", "42", "43", "44"]) {
    await prisma.variant.upsert({
      where: { productId_size_color: { productId: product.id, size, color: "Black" } },
      update: {},
      create: { productId: product.id, size, color: "Black", stock: 10 },
    });
  }

  const affiliate = await prisma.affiliate.upsert({
    where: { merchantId_handle: { merchantId: merchant.id, handle: "ali_aff" } },
    update: {},
    create: { merchantId: merchant.id, handle: "ali_aff", commissionBps: 1000 },
  });

  async function ensureCard(affiliateId: string | null) {
    const found = await prisma.card.findFirst({
      where: { merchantId: merchant.id, productId: product.id, affiliateId },
    });
    return found ?? prisma.card.create({
      data: { token: newToken(), merchantId: merchant.id, productId: product.id, affiliateId },
    });
  }

  const shopCard = await ensureCard(null);
  const affCard = await ensureCard(affiliate.id);

  console.log("Shop card:     ", `${APP_URL}/q/${shopCard.token}`);
  console.log("Affiliate card:", `${APP_URL}/q/${affCard.token}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());