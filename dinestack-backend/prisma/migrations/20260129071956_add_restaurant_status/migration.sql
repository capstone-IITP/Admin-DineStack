-- CreateEnum
CREATE TYPE "RestaurantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');

-- DropForeignKey
ALTER TABLE "Restaurant" DROP CONSTRAINT "Restaurant_activationCodeId_fkey";

-- AlterTable
ALTER TABLE "ActivationCode" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "revocationReason" TEXT,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "revokedBy" TEXT,
ADD COLUMN     "status" "RestaurantStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "ownerEmail" DROP NOT NULL,
ALTER COLUMN "subscriptionEndsAt" DROP NOT NULL,
ALTER COLUMN "activationCodeId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_activationCodeId_fkey" FOREIGN KEY ("activationCodeId") REFERENCES "ActivationCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
