-- CreateTable
CREATE TABLE "general_settings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "communityName" TEXT NOT NULL DEFAULT 'Pravels',
    "logoUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "general_settings_pkey" PRIMARY KEY ("id")
);
