/*
  Warnings:

  - You are about to drop the `History` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "HistoryStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- DropForeignKey
ALTER TABLE "public"."History" DROP CONSTRAINT "History_userId_fkey";

-- DropTable
DROP TABLE "public"."History";

-- CreateTable
CREATE TABLE "crop_analysis_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT NOT NULL,
    "cropType" TEXT,
    "diseaseName" TEXT,
    "confidence" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "imageName" TEXT,
    "analysisResult" JSONB NOT NULL,
    "status" "HistoryStatus" NOT NULL DEFAULT 'COMPLETED',
    "severity" TEXT,
    "notes" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "crop_analysis_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crop_analysis_history_userId_idx" ON "crop_analysis_history"("userId");

-- CreateIndex
CREATE INDEX "crop_analysis_history_userEmail_idx" ON "crop_analysis_history"("userEmail");

-- CreateIndex
CREATE INDEX "crop_analysis_history_diseaseName_idx" ON "crop_analysis_history"("diseaseName");

-- CreateIndex
CREATE INDEX "crop_analysis_history_cropType_idx" ON "crop_analysis_history"("cropType");

-- CreateIndex
CREATE INDEX "crop_analysis_history_createdAt_idx" ON "crop_analysis_history"("createdAt");

-- AddForeignKey
ALTER TABLE "crop_analysis_history" ADD CONSTRAINT "crop_analysis_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
