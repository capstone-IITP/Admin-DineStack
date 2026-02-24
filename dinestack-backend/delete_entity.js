require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ENTITY_ID = '7ba2c4f1-3f2c-41ae-8d58-8b93ee13b2c5';

async function deleteEntity() {
    console.log(`\n🗑️  Deleting entity: ${ENTITY_ID}\n`);

    try {
        // Step 1: Delete all legacy/dependent tables in correct FK order using raw SQL
        // We use individual try/catch so missing tables don't block the rest
        const cascadeSteps = [
            { name: 'TableSession', sql: `DELETE FROM "TableSession" WHERE "tableId" IN (SELECT "id" FROM "Table" WHERE "restaurantId" = $1)` },
            { name: 'PairCode', sql: `DELETE FROM "PairCode" WHERE "restaurantId" = $1` },
            { name: 'OrderItem', sql: `DELETE FROM "OrderItem" WHERE "orderId" IN (SELECT "id" FROM "Order" WHERE "restaurantId" = $1)` },
            { name: 'Order', sql: `DELETE FROM "Order" WHERE "restaurantId" = $1` },
            { name: 'Session', sql: `DELETE FROM "Session" WHERE "restaurantId" = $1` },
            { name: 'MenuItem', sql: `DELETE FROM "MenuItem" WHERE "restaurantId" = $1` },
            { name: 'Category', sql: `DELETE FROM "Category" WHERE "restaurantId" = $1` },
            { name: 'Table', sql: `DELETE FROM "Table" WHERE "restaurantId" = $1` },
            { name: 'RecoveryCode', sql: `DELETE FROM "RecoveryCode" WHERE "restaurantId" = $1` },
            { name: 'Customer', sql: `DELETE FROM "Customer" WHERE "restaurantId" = $1` },
        ];

        for (const step of cascadeSteps) {
            try {
                const result = await prisma.$executeRawUnsafe(step.sql, ENTITY_ID);
                console.log(`  ✅ ${step.name}: ${result} rows deleted`);
            } catch (e) {
                if (e.message.includes('does not exist') || e.code === 'P2010') {
                    console.log(`  ⏭️  ${step.name}: table does not exist (skipped)`);
                } else {
                    console.log(`  ⚠️  ${step.name}: ${e.message}`);
                }
            }
        }

        // Step 2: Delete Prisma-managed relations
        const devices = await prisma.device.deleteMany({ where: { restaurantId: ENTITY_ID } });
        console.log(`  ✅ Device: ${devices.count} rows deleted`);

        // Step 3: Clear circular FK (activationCodeId on Restaurant)
        try {
            await prisma.restaurant.update({
                where: { id: ENTITY_ID },
                data: { activationCodeId: null }
            });
            console.log(`  ✅ Cleared activationCodeId on Restaurant`);
        } catch (e) {
            console.log(`  ⏭️  activationCodeId clear: ${e.message}`);
        }

        // Step 4: Delete activation codes
        const codes = await prisma.activationCode.deleteMany({ where: { restaurantId: ENTITY_ID } });
        console.log(`  ✅ ActivationCode: ${codes.count} rows deleted`);

        // Step 5: Delete the restaurant itself
        await prisma.restaurant.delete({ where: { id: ENTITY_ID } });
        console.log(`\n🎉 Entity ${ENTITY_ID} deleted successfully!\n`);

    } catch (error) {
        console.error(`\n❌ Failed to delete entity:`, error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

deleteEntity();
