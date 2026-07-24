-- CreateEnum
CREATE TYPE "ArtworkStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PUBLISHED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PublishTargetType" AS ENUM ('PLAYLIST', 'DISPLAY_GROUP', 'LAYOUT_REGION_PLAYLIST');

-- CreateEnum
CREATE TYPE "ToiletIssueStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "FlightEventType" AS ENUM ('GATE_CHANGE', 'BOARDING', 'FINAL_CALL', 'DELAY', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlightSubscription" (
    "id" SERIAL NOT NULL,
    "flightKey" TEXT NOT NULL,
    "airportCode" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "pushSub" JSONB,
    "phoneE164" TEXT,
    "smsVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "FlightSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artwork" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "grade" TEXT,
    "className" TEXT,
    "studentName" TEXT,
    "imagePath" TEXT NOT NULL,
    "status" "ArtworkStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedById" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "xiboMediaId" INTEGER,
    "xiboPlaylistId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishTarget" (
    "id" SERIAL NOT NULL,
    "artworkId" INTEGER NOT NULL,
    "targetType" "PublishTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublishTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlightSnapshot" (
    "id" SERIAL NOT NULL,
    "flightKey" TEXT NOT NULL,
    "airline" TEXT,
    "flightNo" TEXT,
    "status" TEXT,
    "gate" TEXT,
    "scheduledTime" TIMESTAMP(3),
    "estimatedTime" TIMESTAMP(3),
    "actualTime" TIMESTAMP(3),
    "delayMinutes" INTEGER,
    "providerName" TEXT NOT NULL,
    "providerRaw" JSONB,
    "providerUpdatedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlightSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationEvent" (
    "id" SERIAL NOT NULL,
    "subscriptionId" INTEGER NOT NULL,
    "flightKey" TEXT NOT NULL,
    "type" "FlightEventType" NOT NULL,
    "eventKey" TEXT NOT NULL,
    "message" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToiletIssue" (
    "id" SERIAL NOT NULL,
    "locationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "status" "ToiletIssueStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ToiletIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToiletCleaningLog" (
    "id" SERIAL NOT NULL,
    "locationId" TEXT NOT NULL,
    "cleanedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cleanedBy" TEXT,

    CONSTRAINT "ToiletCleaningLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XiboDisplayHealth" (
    "id" SERIAL NOT NULL,
    "displayId" TEXT NOT NULL,
    "displayName" TEXT,
    "displayGroupId" TEXT,
    "status" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XiboDisplayHealth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "FlightSubscription_flightKey_isActive_idx" ON "FlightSubscription"("flightKey", "isActive");

-- CreateIndex
CREATE INDEX "FlightSubscription_expiresAt_idx" ON "FlightSubscription"("expiresAt");

-- CreateIndex
CREATE INDEX "FlightSubscription_phoneE164_idx" ON "FlightSubscription"("phoneE164");

-- CreateIndex
CREATE INDEX "Artwork_status_createdAt_idx" ON "Artwork"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Artwork_xiboMediaId_idx" ON "Artwork"("xiboMediaId");

-- CreateIndex
CREATE INDEX "PublishTarget_targetType_targetId_idx" ON "PublishTarget"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "PublishTarget_artworkId_idx" ON "PublishTarget"("artworkId");

-- CreateIndex
CREATE UNIQUE INDEX "FlightSnapshot_flightKey_key" ON "FlightSnapshot"("flightKey");

-- CreateIndex
CREATE INDEX "NotificationEvent_flightKey_createdAt_idx" ON "NotificationEvent"("flightKey", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationEvent_subscriptionId_eventKey_key" ON "NotificationEvent"("subscriptionId", "eventKey");

-- CreateIndex
CREATE INDEX "ToiletIssue_locationId_status_idx" ON "ToiletIssue"("locationId", "status");

-- CreateIndex
CREATE INDEX "ToiletIssue_createdAt_idx" ON "ToiletIssue"("createdAt");

-- CreateIndex
CREATE INDEX "ToiletCleaningLog_locationId_cleanedAt_idx" ON "ToiletCleaningLog"("locationId", "cleanedAt");

-- CreateIndex
CREATE UNIQUE INDEX "XiboDisplayHealth_displayId_key" ON "XiboDisplayHealth"("displayId");

-- AddForeignKey
ALTER TABLE "FlightSubscription" ADD CONSTRAINT "FlightSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artwork" ADD CONSTRAINT "Artwork_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishTarget" ADD CONSTRAINT "PublishTarget_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "FlightSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
