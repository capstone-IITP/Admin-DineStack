const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
require('dotenv').config();

const BASE_URL = 'http://localhost:5000';

const fs = require('fs');
const logFile = 'verification.log';
// Clear log file
try { fs.unlinkSync(logFile); } catch (e) { }

const log = (msg) => {
    console.log(`[TEST] ${msg}`);
    fs.appendFileSync(logFile, `[TEST] ${msg}\n`);
};

async function main() {
    try {
        // 1. Ensure env vars
        const email = process.env.SUPER_ADMIN_EMAIL;
        const password = process.env.SUPER_ADMIN_PASSWORD;
        if (!email || !password) throw new Error("Missing env vars");

        // 2. Login
        log("Logging in...");
        const loginRes = await fetch(`${BASE_URL}/super-admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
        const { token } = await loginRes.json();
        log("Logged in.");

        // 3. Create Restaurant
        log("Creating Restaurant...");
        const createRes = await fetch(`${BASE_URL}/super-admin/dashboard/restaurants`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: "Verification Test Resto" })
        });
        if (!createRes.ok) throw new Error(`Create Restaurant failed: ${await createRes.text()}`);
        const restaurant = await createRes.json();
        log(`Restaurant created: ${restaurant.name} (${restaurant.id})`);

        // 4. Create Activation Code
        log("Creating Activation Code...");
        const createCodeRes = await fetch(`${BASE_URL}/super-admin/activation-codes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                entityName: "Verification Test Resto",
                plan: "Pro",
                durationDays: 30,
                maxTables: 10
            })
        });
        if (!createCodeRes.ok) throw new Error(`Create Code failed: ${createCodeRes.status} ${await createCodeRes.text()}`);
        const code = await createCodeRes.json();
        log(`Activation Code created: ${code.code}`);

        // 5. Revoke Restaurant
        log("Revoking Restaurant...");
        const revokeRes = await fetch(`${BASE_URL}/super-admin/dashboard/restaurants/${restaurant.id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                status: "REVOKED",
                reason: "Automated test revocation",
                revokedBy: "Verification Script"
            })
        });
        if (!revokeRes.ok) throw new Error(`Revoke failed: ${await revokeRes.text()}`);
        log("Restaurant revoked.");

        // 6. Verify Code Invalidation (DB)
        const codeDb = await prisma.activationCode.findUnique({ where: { id: code.id } });
        if (codeDb.status !== 'INVALIDATED') throw new Error(`Code status mismatch. Expected INVALIDATED, got ${codeDb.status}`);
        log("Code is INVALIDATED in DB.");

        // 7. Verify Activation Rejection (API)
        log("Attempting activation (should fail)...");
        const activateRes = await fetch(`${BASE_URL}/api/activate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activationCode: code.code })
        });

        if (activateRes.status === 401) {
            const body = await activateRes.json();
            if (body.error && body.error.includes("invalidated")) {
                log("Activation rejected successfully due to invalidation.");
            } else {
                throw new Error(`Activation rejected but wrong message: ${body.error}`);
            }
        } else {
            throw new Error(`Activation unexpectedly succeeded or got wrong status: ${activateRes.status}`);
        }

        // Cleanup
        log("Cleaning up...");
        await prisma.activationCode.deleteMany({ where: { entityName: "Verification Test Resto" } });
        // Can't delete restaurant easily due to foreign keys if activation succeeded (which it didn't).
        // But restaurant creation doesn't link code yet.
        await prisma.device.deleteMany({ where: { restaurantId: restaurant.id } }); // Should be empty
        await prisma.restaurant.delete({ where: { id: restaurant.id } });
        log("Cleanup done. Verification SUCCESS.");

    } catch (e) {
        console.error("Verification FAILED:", e);
        fs.appendFileSync(logFile, `[ERROR] Verification FAILED: ${e.message}\n${e.stack}\n`);
        // Log response text if available in error message (handled in throw)
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
