const express = require("express");
require("dotenv").config();

// DEBUG: Check if Clerk keys are loaded
if (!process.env.CLERK_SECRET_KEY) {
    console.error("❌ CRITICAL: CLERK_SECRET_KEY is missing from process.env");
} else {
    console.log("✅ CLERK_SECRET_KEY loaded:", process.env.CLERK_SECRET_KEY.substring(0, 10) + "...");
}


// const authRoutes = require("./auth/auth.routes");
const dashboardRoutes = require("./dashboard/dashboard.routes");
const activationRoutes = require("./activation/activation.routes");
const deviceRoutes = require("./activation/device.routes");

const app = express();

// Allowed origins for CORS - configurable via environment variable
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [
        "http://localhost:3000",
        "https://admin-dinestack.vercel.app",
        "https://admin.dinestack.in"
    ];

// Check if origin is allowed (supports Vercel preview deployments and custom domains)
function isOriginAllowed(origin) {
    // Allow server-to-server requests (no origin header)
    if (!origin) return true;

    // Exact match for known origins
    if (allowedOrigins.includes(origin)) return true;

    // Allow all Vercel preview deployments for admin-dinestack
    // Pattern: https://admin-dinestack-*.vercel.app
    if (origin.match(/^https:\/\/admin-dinestack(-[a-z0-9]+)*\.vercel\.app$/)) {
        return true;
    }

    // Allow dinestack.in subdomains (e.g., admin.dinestack.in, app.dinestack.in)
    if (origin.match(/^https:\/\/[a-z0-9-]+\.dinestack\.in$/)) {
        return true;
    }

    // Allow all localhost ports for development
    if (origin.match(/^http:\/\/localhost:\d+$/)) {
        return true;
    }

    return false;
}

// Dynamic CORS middleware
app.use((req, res, next) => {
    const origin = req.headers.origin;

    // Allow server-to-server / curl requests (no origin header)
    if (!origin) {
        return next();
    }

    if (isOriginAllowed(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Access-Control-Allow-Credentials", "true");
        res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
        res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");

        // Handle OPTIONS preflight requests (CRITICAL for POST requests)
        if (req.method === "OPTIONS") {
            return res.sendStatus(200);
        }

        return next();
    }

    console.error("CORS blocked origin:", origin);
    return res.status(403).json({
        error: "CORS blocked",
        origin
    });
});

app.use(express.json());

// health check
app.get("/", (req, res) => {
    res.json({ message: "DineStack Backend is running on Vercel" });
});

app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date() });
});

// Health check at /api/health for standardized endpoint
app.get("/api/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// -----------------------------------------------------------------------------
// SUPER ADMIN ROUTES (Management Portal)
// -----------------------------------------------------------------------------
// app.use("/super-admin", authRoutes); // Auth (Login) - REMOVED for Clerk
app.use("/super-admin/dashboard", dashboardRoutes); // Dashboard Stats
app.use("/super-admin/activation-codes", activationRoutes); // Code Management

// Support /api/super-admin prefix for Vercel rewrites
// app.use("/api/super-admin", authRoutes); - REMOVED for Clerk
app.use("/api/super-admin/dashboard", dashboardRoutes);
app.use("/api/super-admin/activation-codes", activationRoutes);

// New Super Admin Access Management Routes
// Implements implementation level plan for /api/super-admin/* endpoints
const superAdminRoutes = require("./dashboard/superAdmin.routes");
app.use("/api/super-admin", superAdminRoutes);


// -----------------------------------------------------------------------------
// DEVICE ROUTES (Restaurant Tablet)
// -----------------------------------------------------------------------------
// Public endpoints for device onboarding and operations
// strictly separate from admin routes.
app.use("/api", deviceRoutes);

// Global error handler - ensures JSON responses only
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(err.status || 500).json({
        error: err.message || "Internal server error",
        code: err.code || "INTERNAL_ERROR"
    });
});

// 404 catch-all - always returns JSON
app.use((req, res) => {
    res.status(404).json({ error: "Route not found", path: req.originalUrl });
});

module.exports = app;

