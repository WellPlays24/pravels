-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "isPermanentlyBanned" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "user_strikes" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdByUserId" UUID,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_strikes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_strikes_userId_expiresAt_idx" ON "user_strikes"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "user_strikes_expiresAt_idx" ON "user_strikes"("expiresAt");

-- AddForeignKey
ALTER TABLE "user_strikes" ADD CONSTRAINT "user_strikes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_strikes" ADD CONSTRAINT "user_strikes_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
