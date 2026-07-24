/*
  Warnings:

  - The values [XIBO_PUBLISH,XIBO_UNPUBLISH] on the enum `AuditAction` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `tenantId` to the `PublishTarget` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AuditAction_new" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'USER_CREATE', 'USER_DISABLE', 'USER_ROLE_CHANGE', 'ARTWORK_APPROVE', 'ARTWORK_REJECT', 'ARTWORK_PUBLISH', 'TOILET_ISSUE_CREATE', 'TOILET_ISSUE_RESOLVE', 'TOILET_CLEAN', 'FLIGHT_SUBSCRIBE', 'FLIGHT_UNSUBSCRIBE', 'XIBO_SYNC_SUCCESS', 'XIBO_SYNC_ERROR');
ALTER TABLE "AuditLog" ALTER COLUMN "action" TYPE "AuditAction_new" USING ("action"::text::"AuditAction_new");
ALTER TYPE "AuditAction" RENAME TO "AuditAction_old";
ALTER TYPE "AuditAction_new" RENAME TO "AuditAction";
DROP TYPE "AuditAction_old";
COMMIT;

-- DropIndex
DROP INDEX "PublishTarget_targetType_targetId_idx";

-- AlterTable
ALTER TABLE "Artwork" ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "width" INTEGER;

-- AlterTable
ALTER TABLE "PublishTarget" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "PublishTarget_tenantId_targetId_idx" ON "PublishTarget"("tenantId", "targetId");
