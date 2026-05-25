require("dotenv").config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const admin = await prisma.superAdmin.findFirst();
    if (!admin) {
        console.log("No super admin found.");
        return;
    }
    console.log("Admin email:", admin.email);
    console.log("Current 2FA Enabled:", admin.twoFactorEnabled);
    
    await prisma.superAdmin.update({
        where: { id: admin.id },
        data: {
            twoFactorEnabled: false,
            twoFactorSecret: null,
            twoFactorBackupCodes: [],
            twoFactorEnabledAt: null,
            otpAttempts: 0,
            otpBlockedUntil: null
        }
    });

    console.log("2FA has been disabled for the admin. You can now login without 2FA and re-setup if needed.");
}

main().finally(() => prisma.$disconnect());
