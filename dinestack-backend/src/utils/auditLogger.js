const prisma = require('../prisma');

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
                metadata: metadata ? (typeof metadata === "string" ? JSON.parse(metadata) : metadata) : null
            }
        });
    } catch (err) {
        // Never let audit logging crash the main flow
        console.error('Audit log write failed:', err.message);
    }
}

module.exports = { logAudit };
