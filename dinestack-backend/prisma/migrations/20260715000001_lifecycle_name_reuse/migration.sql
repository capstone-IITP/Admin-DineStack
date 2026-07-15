ALTER TABLE "Restaurant"
ADD COLUMN IF NOT EXISTS "archivedDisplayName" TEXT,
ADD COLUMN IF NOT EXISTS "deletionMarker" TEXT;

DROP INDEX IF EXISTS "Restaurant_name_key";
DROP INDEX IF EXISTS "Restaurant_active_name_key";

CREATE UNIQUE INDEX "Restaurant_active_name_key"
ON "Restaurant"("name")
WHERE "status" NOT IN ('DELETED', 'PURGED');
