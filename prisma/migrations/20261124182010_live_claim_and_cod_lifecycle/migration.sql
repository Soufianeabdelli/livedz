-- CreateEnum
CREATE TYPE "LiveSessionStatus" AS ENUM ('PENDING', 'RUNNING', 'STOPPING', 'STOPPED', 'ERROR');

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('CONFIRMED', 'NO_ANSWER', 'UNREACHABLE', 'CANCELLED', 'CALLBACK');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'PENDING_CONFIRMATION';
ALTER TYPE "OrderStatus" ADD VALUE 'SHIPMENT_UNKNOWN';
ALTER TYPE "OrderStatus" ADD VALUE 'CASH_COLLECTED';
ALTER TYPE "OrderStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "draftHoldMinutes" INTEGER NOT NULL DEFAULT 120,
ADD COLUMN     "liveCodePrefix" TEXT NOT NULL DEFAULT 'K';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "callAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "claimedAt" TIMESTAMP(3),
ADD COLUMN     "draftExpiresAt" TIMESTAMP(3),
ADD COLUMN     "lastCallAt" TIMESTAMP(3),
ADD COLUMN     "lastCallOutcome" "CallOutcome",
ADD COLUMN     "liveSessionId" TEXT,
ADD COLUMN     "officialRegionKey" TEXT,
ADD COLUMN     "shipAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shipmentAttemptKey" TEXT,
ADD COLUMN     "shippingFeeDzd" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tiktokMsgId" TEXT,
ADD COLUMN     "tiktokUsername" TEXT;

-- CreateTable
CREATE TABLE "LiveSession" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "tiktokUsername" TEXT NOT NULL,
    "status" "LiveSessionStatus" NOT NULL DEFAULT 'PENDING',
    "roomId" TEXT,
    "workerId" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "heartbeatAt" TIMESTAMP(3),
    "commentsSeen" INTEGER NOT NULL DEFAULT 0,
    "ordersCreated" INTEGER NOT NULL DEFAULT 0,
    "questionsSeen" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "startedAt" TIMESTAMP(3),
    "stoppedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveQuestion" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "liveSessionId" TEXT,
    "tiktokUsername" TEXT NOT NULL,
    "productCode" TEXT,
    "comment" TEXT NOT NULL,
    "msgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryRate" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "wilayaCode" INTEGER NOT NULL,
    "homeDzd" INTEGER NOT NULL,
    "stopdeskDzd" INTEGER NOT NULL,

    CONSTRAINT "DeliveryRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerReputation" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "returnedCount" INTEGER NOT NULL DEFAULT 0,
    "refusedCount" INTEGER NOT NULL DEFAULT 0,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerReputation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallLog" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "userId" TEXT,
    "outcome" "CallOutcome" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LiveSession_sessionToken_key" ON "LiveSession"("sessionToken");

-- CreateIndex
CREATE INDEX "LiveSession_merchantId_status_idx" ON "LiveSession"("merchantId", "status");

-- CreateIndex
CREATE INDEX "LiveSession_status_leaseExpiresAt_idx" ON "LiveSession"("status", "leaseExpiresAt");

-- CreateIndex
CREATE INDEX "LiveQuestion_merchantId_createdAt_idx" ON "LiveQuestion"("merchantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryRate_merchantId_wilayaCode_key" ON "DeliveryRate"("merchantId", "wilayaCode");

-- CreateIndex
CREATE UNIQUE INDEX "BuyerReputation_merchantId_phone_key" ON "BuyerReputation"("merchantId", "phone");

-- CreateIndex
CREATE INDEX "CallLog_orderId_createdAt_idx" ON "CallLog"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "CallLog_merchantId_createdAt_idx" ON "CallLog"("merchantId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_merchantId_tiktokUsername_status_idx" ON "Order"("merchantId", "tiktokUsername", "status");

-- CreateIndex
CREATE INDEX "Order_status_draftExpiresAt_idx" ON "Order"("status", "draftExpiresAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveQuestion" ADD CONSTRAINT "LiveQuestion_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveQuestion" ADD CONSTRAINT "LiveQuestion_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryRate" ADD CONSTRAINT "DeliveryRate_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerReputation" ADD CONSTRAINT "BuyerReputation_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
