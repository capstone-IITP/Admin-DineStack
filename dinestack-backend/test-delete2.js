const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const id = "cd257429-2214-4e3b-b0f1-152187ce417c"; // ID of the Cafe restaurant
        console.log("Attempting to delete Restaurant:", id);

        const result = await prisma.$transaction(async (tx) => {
            const restaurant = await tx.restaurant.findUnique({ where: { id } });
            if (!restaurant) {
                console.log("Restaurant not found.");
                return;
            }

            console.log("Restaurant found:", restaurant.name);

            await tx.tableSession.deleteMany({ where: { restaurantId: id } });
            await tx.pairCode.deleteMany({ where: { restaurantId: id } });

            const orders = await tx.order.findMany({ where: { restaurantId: id }, select: { id: true } });
            const orderIds = orders.map(o => o.id);
            if (orderIds.length > 0) {
                await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
            }

            await tx.order.deleteMany({ where: { restaurantId: id } });
            await tx.session.deleteMany({ where: { restaurantId: id } });
            await tx.menuItem.deleteMany({ where: { restaurantId: id } });
            await tx.category.deleteMany({ where: { restaurantId: id } });
            await tx.table.deleteMany({ where: { restaurantId: id } });
            await tx.recoveryCode.deleteMany({ where: { restaurantId: id } });
            await tx.customer.deleteMany({ where: { restaurantId: id } });
            await tx.device.deleteMany({ where: { restaurantId: id } });
            await tx.refreshToken.deleteMany({ where: { restaurantId: id } });

            await tx.restaurant.update({
                where: { id },
                data: { activationCodeId: null }
            });

            await tx.activationCode.deleteMany({ where: { restaurantId: id } });

            const deleted = await tx.restaurant.delete({ where: { id } });
            console.log("Deleted restaurant:", deleted.name);
            return deleted;
        }, {
            maxWait: 15000,
            timeout: 30000
        });

        console.log("Transaction succeeded.");

    } catch (e) {
        console.error("Deletion Failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
