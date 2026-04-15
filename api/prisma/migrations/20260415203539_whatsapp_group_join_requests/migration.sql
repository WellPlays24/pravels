-- CreateEnum
CREATE TYPE "GroupJoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "whatsapp_group_join_requests" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "status" "GroupJoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" UUID,
    "reviewNote" TEXT,

    CONSTRAINT "whatsapp_group_join_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whatsapp_group_join_requests_groupId_idx" ON "whatsapp_group_join_requests"("groupId");

-- CreateIndex
CREATE INDEX "whatsapp_group_join_requests_status_idx" ON "whatsapp_group_join_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_group_join_requests_userId_groupId_key" ON "whatsapp_group_join_requests"("userId", "groupId");

-- AddForeignKey
ALTER TABLE "whatsapp_group_join_requests" ADD CONSTRAINT "whatsapp_group_join_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_group_join_requests" ADD CONSTRAINT "whatsapp_group_join_requests_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "whatsapp_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_group_join_requests" ADD CONSTRAINT "whatsapp_group_join_requests_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
