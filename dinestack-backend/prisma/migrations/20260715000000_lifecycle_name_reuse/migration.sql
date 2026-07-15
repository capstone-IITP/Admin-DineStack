-- Release deleted/purged display names while preserving one reserved active namespace.
ALTER TYPE "RestaurantStatus" ADD VALUE IF NOT EXISTS 'PROVISIONED';
ALTER TYPE "RestaurantStatus" ADD VALUE IF NOT EXISTS 'LICENSE_ASSIGNED';
ALTER TYPE "RestaurantStatus" ADD VALUE IF NOT EXISTS 'ACTIVATED';
ALTER TYPE "RestaurantStatus" ADD VALUE IF NOT EXISTS 'RUNNING';
ALTER TYPE "RestaurantStatus" ADD VALUE IF NOT EXISTS 'DELETED';
ALTER TYPE "RestaurantStatus" ADD VALUE IF NOT EXISTS 'PURGED';

ALTER TABLE "Restaurant"
ADD COLUMN IF NOT EXISTS "archivedDisplayName" TEXT,
ADD COLUMN IF NOT EXISTS "deletionMarker" TEXT;

DROP INDEX IF EXISTS "Restaurant_name_key";
DROP INDEX IF EXISTS "Restaurant_active_name_key";

CREATE UNIQUE INDEX "Restaurant_active_name_key"
ON "Restaurant"("name")
WHERE "status" NOT IN ('DELETED', 'PURGED');
