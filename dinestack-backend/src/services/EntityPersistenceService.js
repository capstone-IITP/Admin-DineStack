const prisma = require('../prisma');

class EntityPersistenceService {
    static async applyDeletionTransition(mutatedEntity) {
        return await prisma.$transaction(async (tx) => {
            await tx.tableSession.deleteMany({ where: { restaurantId: mutatedEntity.id } });
            await tx.pairCode.deleteMany({ where: { restaurantId: mutatedEntity.id } });
            
            const orders = await tx.order.findMany({ where: { restaurantId: mutatedEntity.id }, select: { id: true } });
            const orderIds = orders.map(o => o.id);
            if (orderIds.length > 0) {
                await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
            }
            await tx.order.deleteMany({ where: { restaurantId: mutatedEntity.id } });
            
            await tx.session.deleteMany({ where: { restaurantId: mutatedEntity.id } });
            await tx.menuItem.deleteMany({ where: { restaurantId: mutatedEntity.id } });
            await tx.category.deleteMany({ where: { restaurantId: mutatedEntity.id } });
            await tx.table.deleteMany({ where: { restaurantId: mutatedEntity.id } });
            await tx.recoveryCode.deleteMany({ where: { restaurantId: mutatedEntity.id } });
            await tx.customer.deleteMany({ where: { restaurantId: mutatedEntity.id } });
            await tx.device.deleteMany({ where: { restaurantId: mutatedEntity.id } });
            await tx.apiKey.deleteMany({ where: { restaurantId: mutatedEntity.id } });
            await tx.refreshToken.deleteMany({ where: { restaurantId: mutatedEntity.id } });
            await tx.subscription.deleteMany({ where: { restaurantId: mutatedEntity.id } });
            await tx.payment.deleteMany({ where: { restaurantId: mutatedEntity.id } });
            
            await tx.restaurant.update({
                where: { id: mutatedEntity.id },
                data: { activationCodeId: null }
            });
            await tx.activationCode.deleteMany({ where: { restaurantId: mutatedEntity.id } });
            
            const updated = await tx.restaurant.update({
                where: { id: mutatedEntity.id },
                data: {
                    status: mutatedEntity.status,
                    isActive: mutatedEntity.isActive,
                    deletedAt: mutatedEntity.deletedAt,
                    archivedDisplayName: mutatedEntity.archivedDisplayName,
                    deletionMarker: mutatedEntity.deletionMarker,
                    lifecycleRevision: mutatedEntity.lifecycleRevision,
                    entityVersion: mutatedEntity.entityVersion
                }
            });
            
            return updated;
        }, {
            maxWait: 15000,
            timeout: 30000
        });
    }

    static async applyStatusUpdate(mutatedEntity, newStatus) {
        return await prisma.$transaction(async (tx) => {
            const updateData = {
                status: mutatedEntity.status,
                isActive: mutatedEntity.isActive,
                lifecycleRevision: mutatedEntity.lifecycleRevision,
                entityVersion: mutatedEntity.entityVersion,
                revokedAt: mutatedEntity.revokedAt,
                revokedBy: mutatedEntity.revokedBy,
                revocationReason: mutatedEntity.revocationReason
            };

            if (newStatus === 'REVOKED' || newStatus === 'SUSPENDED') {
                await tx.activationCode.updateMany({
                    where: {
                        restaurantId: mutatedEntity.id,
                        isUsed: false,
                        status: 'ACTIVE'
                    },
                    data: {
                        status: 'INVALIDATED'
                    }
                });
            }

            const updatedRest = await tx.restaurant.update({
                where: { id: mutatedEntity.id },
                data: updateData
            });

            return updatedRest;
        });
    }
}

module.exports = EntityPersistenceService;
