-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'PROVINCE_ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DISABLED');

-- CreateEnum
CREATE TYPE "IdType" AS ENUM ('CEDULA', 'PASSPORT');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "GroupKind" AS ENUM ('MAIN', 'PROVINCE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TripMediaKind" AS ENUM ('FLYER', 'PHOTO');

-- CreateEnum
CREATE TYPE "TripRegistrationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RewardClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "provinces" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cantons" (
    "id" SERIAL NOT NULL,
    "provinceId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cantons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING',
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "displayName" TEXT,
    "pointsBalance" INTEGER NOT NULL DEFAULT 0,
    "primaryProvinceId" INTEGER,
    "primaryCantonId" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_provinces" (
    "userId" UUID NOT NULL,
    "provinceId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_provinces_pkey" PRIMARY KEY ("userId","provinceId")
);

-- CreateTable
CREATE TABLE "registration_requests" (
    "id" UUID NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "idType" "IdType" NOT NULL,
    "idNumber" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,
    "socialUrl" TEXT NOT NULL,
    "photo1Url" TEXT NOT NULL,
    "photo2Url" TEXT NOT NULL,
    "photo3Url" TEXT NOT NULL,
    "priorityProvinceId" INTEGER NOT NULL,
    "priorityCantonId" INTEGER NOT NULL,
    "approvedAuthUserId" UUID,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" UUID,
    "reviewNote" TEXT,

    CONSTRAINT "registration_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_request_provinces" (
    "requestId" UUID NOT NULL,
    "provinceId" INTEGER NOT NULL,

    CONSTRAINT "registration_request_provinces_pkey" PRIMARY KEY ("requestId","provinceId")
);

-- CreateTable
CREATE TABLE "whatsapp_groups" (
    "id" UUID NOT NULL,
    "kind" "GroupKind" NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "provinceId" INTEGER,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_access" (
    "userId" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "grantedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_access_pkey" PRIMARY KEY ("userId","groupId")
);

-- CreateTable
CREATE TABLE "content_pages" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" UUID NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "provinceId" INTEGER NOT NULL,
    "cantonId" INTEGER NOT NULL,
    "priceCents" INTEGER,
    "capacity" INTEGER,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_media" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "kind" "TripMediaKind" NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_registrations" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "TripRegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" INTEGER,
    "paymentProofUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_transactions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_items" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pointsCost" INTEGER NOT NULL,
    "stock" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_claims" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "rewardId" UUID NOT NULL,
    "status" "RewardClaimStatus" NOT NULL DEFAULT 'PENDING',
    "pointsCostAtClaim" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" UUID,
    "reviewNote" TEXT,

    CONSTRAINT "reward_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "provinces_name_key" ON "provinces"("name");

-- CreateIndex
CREATE UNIQUE INDEX "provinces_slug_key" ON "provinces"("slug");

-- CreateIndex
CREATE INDEX "cantons_provinceId_idx" ON "cantons"("provinceId");

-- CreateIndex
CREATE UNIQUE INDEX "cantons_provinceId_slug_key" ON "cantons"("provinceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_email_key" ON "user_profiles"("email");

-- CreateIndex
CREATE INDEX "user_profiles_role_idx" ON "user_profiles"("role");

-- CreateIndex
CREATE INDEX "user_profiles_status_idx" ON "user_profiles"("status");

-- CreateIndex
CREATE INDEX "admin_provinces_provinceId_idx" ON "admin_provinces"("provinceId");

-- CreateIndex
CREATE UNIQUE INDEX "registration_requests_email_key" ON "registration_requests"("email");

-- CreateIndex
CREATE INDEX "registration_requests_status_idx" ON "registration_requests"("status");

-- CreateIndex
CREATE INDEX "registration_requests_priorityProvinceId_idx" ON "registration_requests"("priorityProvinceId");

-- CreateIndex
CREATE INDEX "registration_request_provinces_provinceId_idx" ON "registration_request_provinces"("provinceId");

-- CreateIndex
CREATE INDEX "whatsapp_groups_kind_idx" ON "whatsapp_groups"("kind");

-- CreateIndex
CREATE INDEX "whatsapp_groups_provinceId_idx" ON "whatsapp_groups"("provinceId");

-- CreateIndex
CREATE INDEX "group_access_groupId_idx" ON "group_access"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "content_pages_slug_key" ON "content_pages"("slug");

-- CreateIndex
CREATE INDEX "trips_status_idx" ON "trips"("status");

-- CreateIndex
CREATE INDEX "trips_provinceId_idx" ON "trips"("provinceId");

-- CreateIndex
CREATE INDEX "trips_startsAt_idx" ON "trips"("startsAt");

-- CreateIndex
CREATE INDEX "trip_media_tripId_idx" ON "trip_media"("tripId");

-- CreateIndex
CREATE INDEX "trip_registrations_userId_idx" ON "trip_registrations"("userId");

-- CreateIndex
CREATE INDEX "trip_registrations_tripId_idx" ON "trip_registrations"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "trip_registrations_tripId_userId_key" ON "trip_registrations"("tripId", "userId");

-- CreateIndex
CREATE INDEX "point_transactions_userId_idx" ON "point_transactions"("userId");

-- CreateIndex
CREATE INDEX "point_transactions_createdAt_idx" ON "point_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "reward_items_isActive_idx" ON "reward_items"("isActive");

-- CreateIndex
CREATE INDEX "reward_claims_userId_idx" ON "reward_claims"("userId");

-- CreateIndex
CREATE INDEX "reward_claims_status_idx" ON "reward_claims"("status");

-- AddForeignKey
ALTER TABLE "cantons" ADD CONSTRAINT "cantons_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "provinces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_provinces" ADD CONSTRAINT "admin_provinces_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_provinces" ADD CONSTRAINT "admin_provinces_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "provinces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_requests" ADD CONSTRAINT "registration_requests_priorityProvinceId_fkey" FOREIGN KEY ("priorityProvinceId") REFERENCES "provinces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_requests" ADD CONSTRAINT "registration_requests_priorityCantonId_fkey" FOREIGN KEY ("priorityCantonId") REFERENCES "cantons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_requests" ADD CONSTRAINT "registration_requests_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_request_provinces" ADD CONSTRAINT "registration_request_provinces_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "registration_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_request_provinces" ADD CONSTRAINT "registration_request_provinces_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "provinces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_groups" ADD CONSTRAINT "whatsapp_groups_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "provinces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_groups" ADD CONSTRAINT "whatsapp_groups_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_access" ADD CONSTRAINT "group_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_access" ADD CONSTRAINT "group_access_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "whatsapp_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_access" ADD CONSTRAINT "group_access_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "provinces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_cantonId_fkey" FOREIGN KEY ("cantonId") REFERENCES "cantons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_media" ADD CONSTRAINT "trip_media_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_registrations" ADD CONSTRAINT "trip_registrations_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_registrations" ADD CONSTRAINT "trip_registrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_claims" ADD CONSTRAINT "reward_claims_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_claims" ADD CONSTRAINT "reward_claims_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "reward_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_claims" ADD CONSTRAINT "reward_claims_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
