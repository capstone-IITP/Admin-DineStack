const EntityLifecycleService = require('./EntityLifecycleService');
const prisma = require('../prisma');

class EntityDeletionManager {
    static async executeDeletion(entity, userEmail) {
        const deletedEntity = await EntityLifecycleService.transitionToDeleted(entity);
        
        await prisma.auditLog.create({
            data: {
                action: 'ENTITY_DELETE_SOFT',
                actor: userEmail,
                target: `Restaurant:${entity.id}`,
                details: `Soft deleted restaurant "${entity.name}" and cleared associated relational data`,
                severity: 'CRITICAL'
            }
        });

        return deletedEntity;
    }
}

module.exports = EntityDeletionManager;
