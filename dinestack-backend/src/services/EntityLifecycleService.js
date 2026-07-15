const EntityPolicy = require('../policies/EntityPolicy');
const DeletionPolicy = require('../policies/DeletionPolicy');
const EntityPersistenceService = require('./EntityPersistenceService');

class EntityLifecycleService {
    static async transitionToDeleted(entity) {
        if (!EntityPolicy.canDelete(entity.status)) {
            throw new Error(`Cannot delete entity in state ${entity.status}`);
        }

        const newName = DeletionPolicy.shouldReleaseNamespace(entity.status) 
            ? DeletionPolicy.generateDeletionIdentity(entity.name, entity.id) 
            : entity.name;

        const mutatedEntity = {
            ...entity,
            name: newName,
            status: 'DELETED',
            isActive: false,
            deletedAt: new Date(),
            lifecycleRevision: (entity.lifecycleRevision || 0) + 1,
            entityVersion: (entity.entityVersion || 0) + 1
        };

        return await EntityPersistenceService.applyDeletionTransition(mutatedEntity);
    }

    static async updateStatus(entity, newStatus, reason, revokedBy) {
        const mutatedEntity = {
            ...entity,
            status: newStatus,
            isActive: newStatus === 'ACTIVE',
            lifecycleRevision: (entity.lifecycleRevision || 0) + 1,
            entityVersion: (entity.entityVersion || 0) + 1
        };
        
        if (newStatus === 'REVOKED' || newStatus === 'SUSPENDED') {
            mutatedEntity.revokedAt = new Date();
            mutatedEntity.revokedBy = revokedBy;
            mutatedEntity.revocationReason = reason;
        } else {
            mutatedEntity.revokedAt = null;
            mutatedEntity.revokedBy = null;
            mutatedEntity.revocationReason = null;
        }

        return await EntityPersistenceService.applyStatusUpdate(mutatedEntity, newStatus);
    }
}

module.exports = EntityLifecycleService;
