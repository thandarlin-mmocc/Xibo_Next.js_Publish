-- AlterTable
ALTER TABLE "Artwork" ADD COLUMN     "votingQrUrl" TEXT;

-- AlterTable
ALTER TABLE "NotificationEvent" ADD COLUMN     "subscribedFrom" TEXT;

-- AlterTable
ALTER TABLE "Vote" ADD COLUMN     "voterIp" TEXT,
ADD COLUMN     "voterSession" TEXT;
