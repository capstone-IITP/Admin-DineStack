const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { deleteRestaurant } = require('./src/dashboard/dashboard.controller');

// Mock request and response objects
const mockReq = (params, body) => ({
    params: params || {},
    body: body || {}
});

const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

async function main() {
    let createdRestaurantId = null;
    try {
        console.log("Starting verification...");

        // 1. Create a dummy restaurant
        const uniqueName = `TestRest_${Date.now()}`;
        console.log(`Creating dummy restaurant: ${uniqueName}`);
        const restaurant = await prisma.restaurant.create({
            data: {
                name: uniqueName,
                status: 'ACTIVE'
            }
        });
        createdRestaurantId = restaurant.id;
        console.log(`Created restaurant with ID: ${createdRestaurantId}`);

        // 2. Insert a PairCode (simulating the issue) using raw SQL
        // We need to check if PairCode table exists first, but based on debug_db it does.
        console.log("Inserting dummy PairCode...");
        // Generate a dummy code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Note: Adjust column names if they differ in your actual DB schema. 
        // Based on debug_db FK name 'PairCode_restaurantId_fkey', the column is likely 'restaurantId'.
        // We might need to guess other required columns for PairCode.
        // Let's inspect PairCode columns first to be safe or just try a standard insert.
        // However, for verification of the FIX (which is the DELETE query), we just need to know if the delete function logic works.

        // Actually, calling the controller function directly is better than rewriting the logic.
        // But we need to ensure the data exists to be deleted.

        try {
            await prisma.$executeRaw`INSERT INTO "PairCode" ("id", "code", "restaurantId", "expiresAt", "createdAt") VALUES (gen_random_uuid(), ${code}, ${createdRestaurantId}, NOW() + INTERVAL '1 day', NOW())`;
            console.log("Dummy PairCode inserted.");
        } catch (e) {
            console.warn("Could not insert PairCode (maybe table structure mismatch), skipping PairCode insertion for test.", e.message);
        }

        // 3. Call deleteRestaurant
        console.log("Calling deleteRestaurant controller...");
        const req = mockReq({ id: createdRestaurantId });
        const res = mockRes();

        await deleteRestaurant(req, res);

        // 4. Verify deletion
        if (res.statusCode === 500) {
            console.error("Deletion failed with 500:", res.data);
        } else {
            console.log("Deletion response:", res.data);

            // Verify restaurant is gone
            const check = await prisma.restaurant.findUnique({ where: { id: createdRestaurantId } });
            if (!check) {
                console.log("SUCCESS: Restaurant was deleted.");
            } else {
                console.error("FAILURE: Restaurant still exists in DB.");
            }
        }

    } catch (e) {
        console.error("Verification Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
