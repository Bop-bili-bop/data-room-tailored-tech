-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateTable
CREATE TABLE "DataRoom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataRoomMember" (
    "id" TEXT NOT NULL,
    "dataRoomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataRoomMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DataRoom_ownerId_idx" ON "DataRoom"("ownerId");

-- CreateIndex
CREATE INDEX "DataRoomMember_userId_idx" ON "DataRoomMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DataRoomMember_dataRoomId_userId_key" ON "DataRoomMember"("dataRoomId", "userId");

-- AddForeignKey
ALTER TABLE "DataRoom" ADD CONSTRAINT "DataRoom_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataRoomMember" ADD CONSTRAINT "DataRoomMember_dataRoomId_fkey" FOREIGN KEY ("dataRoomId") REFERENCES "DataRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataRoomMember" ADD CONSTRAINT "DataRoomMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
