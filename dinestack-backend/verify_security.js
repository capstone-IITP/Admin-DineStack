require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function verify() {
    const a = await p.superAdmin.findFirst();
    console.log('=== Password Hash ===');
    console.log('Hash prefix:', a.passwordHash.substring(0, 7));
    console.log('Uses bcrypt 12 rounds:', a.passwordHash.substring(0, 7) === '$2b$12$');
    console.log('isActive:', a.isActive);
    console.log('failedAttempts:', a.failedAttempts);
    console.log('lockUntil:', a.lockUntil);

    console.log('\n=== Audit Logs ===');
    const l = await p.superAdminAuditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 });
    console.log('Total entries:', l.length);
    l.forEach(x => console.log(' ', x.action, x.metadata || ''));

    console.log('\n=== Resetting lock ===');
    await p.superAdmin.updateMany({ data: { failedAttempts: 0, lockUntil: null } });
    console.log('Lock reset done');

    await p.$disconnect();
}

verify().catch(e => { console.error(e); process.exit(1); });
