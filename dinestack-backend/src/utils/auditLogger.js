const prisma = require('../prisma');

const SENSITIVE_KEYS = [
    'password', 'passwordhash', 'secret', 'token', 'pin',
    'adminpin', 'kitchenpin', 'twofactorsecret', 'jwt',
    'activationcode', 'paircode', 'refreshtoken', 'accesstoken',
    'code', 'tokenhash'
];

function scrubSensitiveFields(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(scrubSensitiveFields);
    const scrubbed = {};
    for (const [key, value] of Object.entries(obj)) {
        if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
            scrubbed[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
            scrubbed[key] = scrubSensitiveFields(value);
        } else {
            scrubbed[key] = value;
        }
    }
    return scrubbed;
}

async function logAudit(actorIdOrEmail, action, metadata = null, severity = "INFO", details = "") {
    try {
        let actor = actorIdOrEmail;
        if (actorIdOrEmail && actorIdOrEmail.length === 36) {
            const admin = await prisma.superAdmin.findUnique({
                where: { id: actorIdOrEmail },
                select: { email: true }
            });
            if (admin) actor = admin.email;
        }

        await prisma.auditLog.create({
            data: {
                actor: actor || "SYSTEM",
                action,
                severity,
                details: details || `Performed ${action}`,
                metadata: metadata ? (typeof metadata === "string" ? metadata : JSON.stringify(scrubSensitiveFields(metadata))) : null
            }
        });
    } catch (err) {
        // Never let audit logging crash the main flow
        console.error('Audit log write failed:', err.message);
    }
}

module.exports = { logAudit };
