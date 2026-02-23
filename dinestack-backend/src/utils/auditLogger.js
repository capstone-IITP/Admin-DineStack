/**
 * Super Admin Audit Logger
 * 
 * Logs security-relevant actions to SuperAdminAuditLog table.
 * Actions: LOGIN_SUCCESS, LOGIN_FAILURE, ACCOUNT_LOCKED,
 *          PASSWORD_CHANGE, LICENSE_CREATE, LICENSE_REVOKE,
 *          FORCE_RESET, TOKEN_REFRESH, LOGOUT
 */

const prisma = require('../prisma');

async function logAudit(adminId, action, metadata = null) {
    try {
        await prisma.superAdminAuditLog.create({
            data: {
                adminId,
                action,
                metadata: metadata ? JSON.stringify(metadata) : null
            }
        });
    } catch (err) {
        // Never let audit logging crash the main flow
        console.error('Audit log write failed:', err.message);
    }
}

module.exports = { logAudit };
