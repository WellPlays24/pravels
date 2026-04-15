-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "isBannedFromMain" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "member_provinces" (
    "userId" UUID NOT NULL,
    "provinceId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedByUserId" UUID,

    CONSTRAINT "member_provinces_pkey" PRIMARY KEY ("userId","provinceId")
);

-- CreateIndex
CREATE INDEX "member_provinces_provinceId_idx" ON "member_provinces"("provinceId");

-- AddForeignKey
ALTER TABLE "member_provinces" ADD CONSTRAINT "member_provinces_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_provinces" ADD CONSTRAINT "member_provinces_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "provinces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_provinces" ADD CONSTRAINT "member_provinces_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
