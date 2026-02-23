// Safe migration: Add 2FA columns to SuperAdmin table
// Uses ALTER TABLE with IF NOT EXISTS — no data loss, no table drops

const { PrismaClient } = require("@prisma/client");

async function migrate() {
    const prisma = new PrismaClient();
    try {
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "SuperAdmin"
            ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
            ADD COLUMN IF NOT EXISTS "twoFactorSecret" TEXT,
            ADD COLUMN IF NOT EXISTS "twoFactorBackupCodes" TEXT[] DEFAULT '{}',
            ADD COLUMN IF NOT EXISTS "twoFactorEnabledAt" TIMESTAMP(3),
            ADD COLUMN IF NOT EXISTS "otpAttempts" INTEGER NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "otpBlockedUntil" TIMESTAMP(3)
        `);
        console.log("SUCCESS: 2FA columns added to SuperAdmin table");
    } catch (err) {
        console.error("FAILED:", err.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

migrate();
