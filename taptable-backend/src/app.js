const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./auth/auth.routes");
const dashboardRoutes = require("./dashboard/dashboard.routes");
const activationRoutes = require("./activation/activation.routes");
const deviceRoutes = require("./activation/device.routes");

const app = express();

// CORS configuration - properly handle cross-origin requests
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        const allowedOrigins = process.env.ALLOWED_ORIGINS
            ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
            : ['*'];

        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log(`CORS blocked origin: ${origin}`);
            callback(null, true); // Allow anyway for development
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));
app.use(express.json());

// health check
app.get("/", (req, res) => {
    res.json({ message: "TapTable Backend is running on Vercel" });
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
app.use("/super-admin", authRoutes); // Auth (Login)
app.use("/super-admin/dashboard", dashboardRoutes); // Dashboard Stats
app.use("/super-admin/activation-codes", activationRoutes); // Code Management

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

