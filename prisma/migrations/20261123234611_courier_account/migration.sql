-- CreateTable
CREATE TABLE "CourierAccount" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "courier" TEXT NOT NULL,
    "credentialsEnc" TEXT NOT NULL,
    "hint" TEXT NOT NULL,
    "fromWilaya" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourierAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourierAccount_merchantId_courier_key" ON "CourierAccount"("merchantId", "courier");

-- AddForeignKey
ALTER TABLE "CourierAccount" ADD CONSTRAINT "CourierAccount_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
