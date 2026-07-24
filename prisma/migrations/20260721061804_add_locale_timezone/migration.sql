-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Tokyo';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "locale" TEXT;
