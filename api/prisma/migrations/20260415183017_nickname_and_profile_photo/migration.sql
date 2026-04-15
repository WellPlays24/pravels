/*
  Warnings:

  - Added the required column `profilePhotoUrl` to the `registration_requests` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum (safe to re-run if prior attempt created it)
DO $$
BEGIN
  CREATE TYPE "DisplayNamePreference" AS ENUM ('FULL_NAME', 'NICKNAME');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "registration_requests" ADD COLUMN     "displayNamePreference" "DisplayNamePreference" NOT NULL DEFAULT 'FULL_NAME',
ADD COLUMN     "nickname" TEXT,
ADD COLUMN     "profilePhotoUrl" TEXT;

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "displayNamePreference" "DisplayNamePreference" NOT NULL DEFAULT 'FULL_NAME',
ADD COLUMN     "nickname" TEXT,
ADD COLUMN     "profilePhotoUrl" TEXT;
