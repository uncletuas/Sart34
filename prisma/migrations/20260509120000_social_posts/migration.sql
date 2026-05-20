-- CreateEnum
CREATE TYPE "SocialPostStatus" AS ENUM ('DRAFT', 'PUBLISHING', 'PUBLISHED', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "platforms" TEXT[],
    "status" "SocialPostStatus" NOT NULL DEFAULT 'DRAFT',
    "results" JSONB,
    "createdById" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialPost_workspaceId_idx" ON "SocialPost"("workspaceId");

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
