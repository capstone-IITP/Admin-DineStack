-- Safe migration: rename password -> passwordHash, add new columns with defaults
-- NO DATA LOSS

-- 1. Rename existing column
ALTER TABLE "SuperAdmin" RENAME COLUMN "password" TO "passwordHash";

-- 2. Add new columns with defaults (safe for existing rows)
ALTER TABLE "SuperAdmin" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SuperAdmin" ADD COLUMN IF NOT EXISTS "failedAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SuperAdmin" ADD COLUMN IF NOT EXISTS "lockUntil" TIMESTAMP(3);
ALTER TABLE "SuperAdmin" ADD COLUMN IF NOT EXISTS "lastLogin" TIMESTAMP(3);
ALTER TABLE "SuperAdmin" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- 3. Create SuperAdminAuditLog table
CREATE TABLE IF NOT EXISTS "SuperAdminAuditLog" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SuperAdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- 4. Create RefreshToken table
CREATE TABLE IF NOT EXISTS "RefreshToken" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tokenHash" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- 5. Add unique index on tokenHash
CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- 6. Add foreign key (if not exists)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RefreshToken_adminId_fkey') THEN
        ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_adminId_fkey"
            FOREIGN KEY ("adminId") REFERENCES "SuperAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 7. Fix Device nullable columns (set NULL values to defaults so schema push won't complain)
UPDATE "Device" SET "lastSeen" = NOW() WHERE "lastSeen" IS NULL;
UPDATE "Device" SET "status" = 'ACTIVE' WHERE "status" IS NULL;
UPDATE "Device" SET "type" = 'UNKNOWN' WHERE "type" IS NULL;
