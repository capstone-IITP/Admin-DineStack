class DeletionPolicy {
    static generateDeletionMarker(entityId) {
        const timestamp = Date.now();
        const shortId = entityId.substring(0, 6);
        return `DELETED-${timestamp}-${shortId}`;
    }

    static buildArchiveMetadata(entityName, entityId) {
        return {
            archivedDisplayName: entityName,
            deletionMarker: DeletionPolicy.generateDeletionMarker(entityId)
        };
    }

    static shouldReleaseNamespace(entityStatus) {
        return ['DELETED', 'PURGED'].includes(entityStatus);
    }
}

module.exports = DeletionPolicy;
