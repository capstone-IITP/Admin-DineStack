class DeletionPolicy {
    static generateDeletionIdentity(entityName, entityId) {
        const timestamp = Date.now();
        const shortId = entityId.substring(0, 6);
        return `${entityName} [DELETED-${timestamp}-${shortId}]`;
    }

    static shouldReleaseNamespace(entityStatus) {
        return true;
    }
}

module.exports = DeletionPolicy;
