-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BIRTHDAY_GREETING', 'TRIP_REGISTRATION_PENDING', 'TRIP_REGISTRATION_APPROVED', 'TRIP_REGISTRATION_REJECTED', 'REWARD_CLAIM_PENDING', 'REWARD_CLAIM_APPROVED', 'REWARD_CLAIM_REJECTED', 'GROUP_JOIN_PENDING', 'GROUP_JOIN_APPROVED', 'GROUP_JOIN_REJECTED', 'MEMBER_REQUEST_PENDING', 'MEMBER_REQUEST_APPROVED');

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "actorUserId" UUID,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
