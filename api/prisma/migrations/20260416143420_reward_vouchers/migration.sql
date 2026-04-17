-- AlterTable
ALTER TABLE "reward_claims" ADD COLUMN     "redeemCode" TEXT,
ADD COLUMN     "redeemedAt" TIMESTAMP(3),
ADD COLUMN     "redeemedTripId" UUID;

-- AlterTable
ALTER TABLE "reward_items" ADD COLUMN     "grantsFreeTrip" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "trip_registrations" ADD COLUMN     "rewardClaimId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "reward_claims_redeemCode_key" ON "reward_claims"("redeemCode");

-- CreateIndex
CREATE INDEX "reward_claims_redeemCode_idx" ON "reward_claims"("redeemCode");

-- CreateIndex
CREATE INDEX "trip_registrations_rewardClaimId_idx" ON "trip_registrations"("rewardClaimId");

-- AddForeignKey
ALTER TABLE "trip_registrations" ADD CONSTRAINT "trip_registrations_rewardClaimId_fkey" FOREIGN KEY ("rewardClaimId") REFERENCES "reward_claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;
