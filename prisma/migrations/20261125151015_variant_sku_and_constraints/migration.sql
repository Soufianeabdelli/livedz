/*
  Warnings:

  - A unique constraint covering the columns `[merchantId,msgId]` on the table `LiveQuestion` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Variant" ADD COLUMN     "sku" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "LiveQuestion_merchantId_msgId_key" ON "LiveQuestion"("merchantId", "msgId");

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
