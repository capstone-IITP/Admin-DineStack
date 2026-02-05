// using native fetch (Node 18+)


// Configuration
const API_BASE = 'http://localhost:5000/api/super-admin';
const LOGIN_URL = 'http://localhost:5000/super-admin/login'; // Existing auth route

// Mock Credentials (UPDATE THESE TO MATCH YOUR LOCAL DB SEED)
const ADMIN_EMAIL = 'navdeepak@dinestack.in';
const ADMIN_PASSWORD = 'DineStack@69'; // Default/Seed password


async function runTest() {
    console.log("🚀 Starting Super Admin Verification...");

    // 1. Login to get Token
    console.log(`\n🔹 Authenticating as ${ADMIN_EMAIL}...`);
    let token;
    try {
        const loginRes = await fetch(LOGIN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        });

        if (!loginRes.ok) {
            console.error("❌ Login Failed:", await loginRes.text());
            return;
        }

        const loginData = await loginRes.json();
        token = loginData.token;
        console.log("✅ Authenticated. Token received.");
    } catch (e) {
        console.error("❌ Login Request Error:", e.message);
        return;
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    // 2. Fetch Restaurants
    console.log("\n🔹 Fetching All Restaurants...");
    let restaurantId;
    try {
        const listRes = await fetch(`${API_BASE}/restaurants`, { headers });
        const restaurants = await listRes.json();
        console.log(`✅ Fetched ${restaurants.length} restaurants.`);

        if (restaurants.length > 0) {
            restaurantId = restaurants[0].id;
            console.log(`ℹ️ Selected Restaurant ID for testing: ${restaurantId} (${restaurants[0].name})`);
        } else {
            console.warn("⚠️ No restaurants found. Skipping modification tests.");
            return;
        }
    } catch (e) {
        console.error("❌ Fetch Restaurants Error:", e);
    }

    // 3. Revoke Access
    console.log("\n🔹 Revoking Access...");
    try {
        const revokeRes = await fetch(`${API_BASE}/restaurants/${restaurantId}/revoke`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ reason: "Automated Test Verification" })
        });
        const revokeData = await revokeRes.json();
        if (revokeRes.ok) {
            console.log("✅ Access Revoked:", revokeData.message);
        } else {
            console.error("❌ Revoke Failed:", revokeData);
        }
    } catch (e) {
        console.error("❌ Revoke Error:", e);
    }

    // 4. Check Status
    console.log("\n🔹 Checking Status...");
    try {
        const statusRes = await fetch(`${API_BASE}/restaurants/${restaurantId}/status`, { headers });
        const statusData = await statusRes.json();
        console.log("ℹ️ Current Status:", statusData.status);
    } catch (e) {
        console.error("❌ Status Check Error:", e);
    }

    // 5. Reactivate Access
    console.log("\n🔹 Reactivating Access...");
    try {
        const activateRes = await fetch(`${API_BASE}/restaurants/${restaurantId}/activate`, {
            method: 'POST',
            headers,
            body: JSON.stringify({})
        });
        const activateData = await activateRes.json();
        if (activateRes.ok) {
            console.log("✅ Access Reactivated:", activateData.message);
        } else {
            console.error("❌ Activation Failed:", activateData);
        }
    } catch (e) {
        console.error("❌ Activation Error:", e);
    }
}

runTest();
