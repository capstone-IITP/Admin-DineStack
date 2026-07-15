const ACTIVE_STATES = ['PROVISIONED', 'LICENSE_ASSIGNED', 'ACTIVATED', 'RUNNING', 'ACTIVE', 'SUSPENDED', 'REVOKED'];
const TERMINAL_STATES = ['DELETED', 'PURGED'];

class EntityPolicy {
    static ACTIVE_STATES = ACTIVE_STATES;
    static TERMINAL_STATES = TERMINAL_STATES;

    static isNameReserved(entityOrStatus) {
        const entityStatus = typeof entityOrStatus === 'string'
            ? entityOrStatus
            : entityOrStatus?.status;
        return ACTIVE_STATES.includes(entityStatus);
    }
    
    static canActivate(entityStatus) {
        return ['PROVISIONED', 'LICENSE_ASSIGNED', 'SUSPENDED'].includes(entityStatus);
    }

    static canDelete(entityStatus) {
        return !TERMINAL_STATES.includes(entityStatus);
    }
}

module.exports = EntityPolicy;
