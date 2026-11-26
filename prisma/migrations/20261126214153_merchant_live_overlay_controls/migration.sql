-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "activeCardId" TEXT,
ADD COLUMN     "overlayHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "overlayPlatform" TEXT NOT NULL DEFAULT 'tiktok';
