/**
 * Security Verification Test Script
 * Tests all security hardening features
 */

const BASE = 'http://localhost:5000';

async function test() {
    console.log('\n=== SUPER ADMIN SECURITY VERIFICATION ===\n');

    // --- Test 1: Successful Login ---
    console.log('--- TEST 1: Successful Login ---');
    const loginRes = await fetch(`${BASE}/super-admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'navdeepak@dinestack.in', password: 'DineStack@69' })
    });
    const loginData = await loginRes.json();
    console.log(`Status: ${loginRes.status}`);
    console.log(`Has token: ${!!loginData.token}`);
    console.log(`Admin email: ${loginData.admin?.email}`);

    // Check for Set-Cookie headers
    const cookies = loginRes.headers.get('set-cookie');
    console.log(`Set-Cookie header present: ${!!cookies}`);
    console.log(`Token starts with eyJ: ${loginData.token?.startsWith('eyJ')}`);

    const validToken = loginData.token;

    // --- Test 2: Verify Token ---
    console.log('\n--- TEST 2: Token Verification ---');
    const verifyRes = await fetch(`${BASE}/super-admin/verify`, {
        headers: { 'Authorization': `Bearer ${validToken}` }
    });
    const verifyData = await verifyRes.json();
    console.log(`Status: ${verifyRes.status}`);
    console.log(`Valid: ${verifyData.valid}`);
    console.log(`Role: ${verifyData.admin?.role}`);

    // --- Test 3: Wrong Password (build up to lockout) ---
    console.log('\n--- TEST 3: Brute Force Protection ---');
    for (let i = 1; i <= 6; i++) {
        const failRes = await fetch(`${BASE}/super-admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'navdeepak@dinestack.in', password: 'WrongPassword123!' })
        });
        const failData = await failRes.json();
        console.log(`  Attempt ${i}: Status ${failRes.status} - ${failData.message} ${failData.code ? `(${failData.code})` : ''}`);

        if (failRes.status === 423) {
            console.log(`  → Account LOCKED! Retry after ${failData.retryAfterMinutes} minutes`);
            break;
        }
    }

    // --- Test 4: Route Isolation (access with no token) ---
    console.log('\n--- TEST 4: Route Protection (no token) ---');
    const noTokenRes = await fetch(`${BASE}/super-admin/dashboard/stats`);
    console.log(`Status: ${noTokenRes.status}`);
    const noTokenData = await noTokenRes.json();
    console.log(`Code: ${noTokenData.code}`);

    // --- Test 5: Route Isolation (fake non-admin token) ---
    console.log('\n--- TEST 5: Route Protection (wrong role token) ---');
    // Create a token with wrong role using JWT
    const jwt = require('jsonwebtoken');
    const fakeToken = jwt.sign(
        { adminId: 'fake-id', role: 'RESTAURANT_ADMIN' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );
    const fakeRes = await fetch(`${BASE}/super-admin/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${fakeToken}` }
    });
    console.log(`Status: ${fakeRes.status}`);
    const fakeData = await fakeRes.json();
    console.log(`Code: ${fakeData.code}`);

    // --- Test 6: Check Audit Logs in DB ---
    console.log('\n--- TEST 6: Audit Log Verification ---');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const auditLogs = await prisma.superAdminAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
    });
    console.log(`Audit log entries: ${auditLogs.length}`);
    auditLogs.forEach(log => {
        console.log(`  [${log.action}] adminId=${log.adminId.substring(0, 8)}... ${log.metadata || ''}`);
    });

    // --- Test 7: Verify password hash in DB ---
    console.log('\n--- TEST 7: Password Hash Verification ---');
    const admin = await prisma.superAdmin.findFirst();
    console.log(`passwordHash starts with $2b$12$: ${admin.passwordHash.startsWith('$2b$12$')}`);
    console.log(`failedAttempts: ${admin.failedAttempts}`);
    console.log(`lockUntil: ${admin.lockUntil}`);
    console.log(`isActive: ${admin.isActive}`);

    await prisma.$disconnect();

    // --- Reset lock for future use ---
    console.log('\n--- CLEANUP: Resetting account lock ---');
    const prisma2 = new PrismaClient();
    await prisma2.superAdmin.updateMany({
        data: { failedAttempts: 0, lockUntil: null }
    });
    console.log('Account lock reset.');
    await prisma2.$disconnect();

    console.log('\n=== ALL TESTS COMPLETE ===\n');
}

test().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
