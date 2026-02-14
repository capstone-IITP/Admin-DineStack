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

        // 0. List all tables to see what we might be missing
        const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
        console.log("Database Tables:", tables.map(t => t.table_name).sort());

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

        let createdActivationCodeId = null;
        // 2b. Insert an ActivationCode (simulating the issue)
        console.log("Inserting dummy ActivationCode...");
        try {
            const acCode = `DINE-TEST-${Math.floor(Math.random() * 1000)}`;
            const ac = await prisma.activationCode.create({
                data: {
                    code: acCode,
                    restaurantId: createdRestaurantId,
                    entityName: uniqueName,
                    plan: 'Standard',
                    durationDays: 30,
                    maxTables: 10,
                    expiresAt: new Date(Date.now() + 86400000)
                }
            });
            createdActivationCodeId = ac.id;
            console.log("Dummy ActivationCode inserted with ID:", createdActivationCodeId);

            // Simulate circular dependency (Legacy behavior?)
            // If the application sets activationCodeId on Restaurant, we must reproduce that.
            console.log("Setting activationCodeId on Restaurant to " + createdActivationCodeId);
            try {
                await prisma.restaurant.update({
                    where: { id: createdRestaurantId },
                    data: { activationCodeId: createdActivationCodeId }
                });
                console.log("Circular dependency established.");
            } catch (err) {
                console.error("FAILED to set circular dependency:", err.message);
            }

            // 3. Insert a RecoveryCode (New check based on table list)
            console.log("Inserting dummy RecoveryCode...");
            try {
                // Correct columns based on output: used, createdAt, id, codeHash, restaurantId
                console.log("Inserting RecoveryCode with correct columns...");
                await prisma.$executeRaw`
                    INSERT INTO "RecoveryCode" ("id", "codeHash", "restaurantId", "used", "createdAt") 
                    VALUES (gen_random_uuid(), 'hash_of_code', ${createdRestaurantId}, false, NOW())
                `;
                console.log("Dummy RecoveryCode inserted.");
            } catch (e) {
                console.error("Could not insert RecoveryCode (STILL FAILING):", e.message);
            }

        } catch (e) {
            console.warn("Could not insert ActivationCode or set circular dependency:", e.message);
        }

        // 2c. Revoke the restaurant
        console.log("Revoking restaurant...");
        await prisma.restaurant.update({
            where: { id: createdRestaurantId },
            data: { status: 'REVOKED' }
        });
        console.log("Restaurant revoked.");

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

            if (createdActivationCodeId) {
                const acCheck = await prisma.activationCode.findUnique({ where: { id: createdActivationCodeId } });
                if (acCheck) {
                    console.log("FAILURE (Orphaned): ActivationCode still exists.", acCheck);
                } else {
                    console.log("SUCCESS: ActivationCode was deleted.");
                }
            }
        }

    } catch (e) {
        console.error("Verification Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
