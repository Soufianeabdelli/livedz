-- CreateEnum
CREATE TYPE "ProfileCategory" AS ENUM ('SELLER', 'SERVICE', 'AFFILIATE', 'ECOMMERCE');

-- CreateTable
CREATE TABLE "StoreProfile" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "tagline" TEXT,
    "category" "ProfileCategory" NOT NULL DEFAULT 'SELLER',
    "city" TEXT,
    "whatsapp" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT '#8B5E3C',
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreProfile_merchantId_key" ON "StoreProfile"("merchantId");

-- AddForeignKey
ALTER TABLE "StoreProfile" ADD CONSTRAINT "StoreProfile_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
