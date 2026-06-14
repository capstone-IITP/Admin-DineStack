const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Trying findMany...");
        const restaurants = await prisma.restaurant.findMany({
            include: { _count: { select: { devices: true } } }
        });
        console.log("SUCCESS. Count:", restaurants.length);
    } catch (e) {
        console.error("FAILED. Error:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
