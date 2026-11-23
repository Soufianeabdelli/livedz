import { config } from "dotenv";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local" });
if (process.env.NODE_ENV === "production") throw new Error("Dev only");
const email = process.argv[2];
if (!email) throw new Error("Usage: npm run db:claim -- you@gmail.com");

const e = process.env;
initializeApp({
  credential: cert({
    projectId: e.FIREBASE_PROJECT_ID!,
    clientEmail: e.FIREBASE_CLIENT_EMAIL!,
    privateKey: e.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  }),
});
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: e.DATABASE_URL! }) });

async function main() {
  const u = await getAuth().getUserByEmail(email);
  const merchant = await prisma.merchant.findUniqueOrThrow({ where: { slug: "boutique-dz" } });
  await prisma.membership.upsert({
    where: { userId_merchantId: { userId: u.uid, merchantId: merchant.id } },
    update: {},
    create: { userId: u.uid, merchantId: merchant.id, role: "OWNER" },
  });
  console.log("OK: linked", email, "->", merchant.slug);
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());