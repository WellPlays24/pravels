/*
  Warnings:

  - Added the required column `passwordHash` to the `registration_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "registration_requests" ADD COLUMN     "passwordHash" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "trip_registrations" ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedByUserId" UUID;

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "bankAccountName" TEXT,
ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "bankAccountType" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "paymentInstructions" TEXT;

-- AddForeignKey
ALTER TABLE "trip_registrations" ADD CONSTRAINT "trip_registrations_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
