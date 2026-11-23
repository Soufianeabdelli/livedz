-- CreateTable
CREATE TABLE "Commune" (
    "id" SERIAL NOT NULL,
    "wilayaCode" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,

    CONSTRAINT "Commune_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Commune_wilayaCode_idx" ON "Commune"("wilayaCode");

-- CreateIndex
CREATE UNIQUE INDEX "Commune_wilayaCode_name_key" ON "Commune"("wilayaCode", "name");
