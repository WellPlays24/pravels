-- CreateTable
CREATE TABLE "local_credentials" (
    "userId" UUID NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "local_credentials_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "local_credentials" ADD CONSTRAINT "local_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
