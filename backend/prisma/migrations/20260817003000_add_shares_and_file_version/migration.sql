-- CreateEnum
CREATE TYPE "ShareTargetType" AS ENUM ('DATA_ROOM', 'FOLDER', 'FILE');

-- CreateEnum
CREATE TYPE "ShareMode" AS ENUM ('PUBLIC', 'PERMISSIONED');

-- AlterTable
ALTER TABLE "File" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "Share" (
    "id" TEXT NOT NULL,
    "dataRoomId" TEXT NOT NULL,
    "targetType" "ShareTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "mode" "ShareMode" NOT NULL,
    "token" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Share_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Share_token_key" ON "Share"("token");

-- CreateIndex
CREATE INDEX "Share_dataRoomId_idx" ON "Share"("dataRoomId");

-- CreateIndex
CREATE INDEX "Share_targetType_targetId_idx" ON "Share"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "Share_recipientUserId_idx" ON "Share"("recipientUserId");

-- CreateIndex
CREATE INDEX "Share_token_idx" ON "Share"("token");

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_dataRoomId_fkey" FOREIGN KEY ("dataRoomId") REFERENCES "DataRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
