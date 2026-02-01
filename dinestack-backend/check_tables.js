const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    try {
        // Try to count devices. If table doesn't exist, this will throw.
        const count = await prisma.device.count();
        console.log("Device table exists. Count:", count);
    } catch (e) {
        console.log("Error querying Device table:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
