const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixOldKeys() {
    console.log("🛠️ Scanning database for old Activation Codes missing 'entityName'...");
    
    try {
        const result = await prisma.$executeRaw`UPDATE "ActivationCode" SET "entityName" = "restaurantName" WHERE "entityName" IS NULL AND "restaurantName" IS NOT NULL`;
        console.log(`✅ Success! Fixed ${result} old activation codes!`);
        console.log("🚀 You can now successfully use your old keys, including DINE-HPME-5PKM-QQYF!");
    } catch (error) {
        console.error("❌ Failed to fix keys:", error);
    } finally {
        await prisma.$disconnect();
    }
}

fixOldKeys();
