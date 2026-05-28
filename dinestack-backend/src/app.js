const express = require("express");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const helmet = require("helmet");
const winston = require("winston");
const { v4: uuidv4 } = require("uuid");
const prisma = require("./prisma");
require("dotenv").config();

// Sentry Observability Integration
const Sentry = require("@sentry/node");
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: 1.0,
    });
    console.log("✅ Sentry initialized successfully.");
}

// Winston Structured Logger
const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [new winston.transports.Console()]
});

const authRoutes = require("./auth/auth.routes");
const dashboardRoutes = require("./dashboard/dashboard.routes");
const activationRoutes = require("./activation/activation.routes");
const deviceRoutes = require("./activation/device.routes");
const couponRoutes = require("./coupon/coupon.routes");
const paymentRoutes = require("./payment/payment.routes");
const teamRoutes = require("./team/team.routes");
const superAdminRoutes = require("./dashboard/superAdmin.routes");

const app = express();

// 0. Restrict HTTP Methods
const ALLOWED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
app.use((req, res, next) => {
    if (!ALLOWED_METHODS.includes(req.method)) {
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
    next();
});

// 0b. Validate Content-Type for state-changing requests
app.use((req, res, next) => {
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
        const contentType = req.headers["content-type"] || "";
        if (!contentType.startsWith("application/json")) {
            return res.status(415).json({
                error: "Unsupported Media Type. Content-Type must be application/json"
            });
        }
    }
    next();
});

// 1. CSP Nonce Generation Middleware
app.use((req, res, next) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString("base64");
    next();
});

// 2. Global Security Headers (Helmet)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://admin-dinestack.vercel.app"],
            frameAncestors: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false,
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "strict-origin" },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// 3. Strict CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [
        "http://localhost:3000",
        "https://admin-dinestack.vercel.app",
        "https://admin.dinestack.in"
    ];

function isOriginAllowed(origin) {
    if (!origin) return false; // Reject empty origins in production
    return allowedOrigins.includes(origin);
}

app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (!origin) {
        return next();
    }

    if (isOriginAllowed(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Access-Control-Allow-Credentials", "true");
        res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-CSRF-Token");
        res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");

        if (req.method === "OPTIONS") {
            return res.sendStatus(200);
        }

        return next();
    }

    console.error("CORS blocked origin:", origin);
    return res.status(403).json({
        error: "CORS blocked"
    });
});

app.use(express.json());
app.use(cookieParser());

// 4. Database-ping Health Check Endpoints
app.get("/", async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ message: "DineStack Backend is running on Vercel" });
    } catch (err) {
        res.status(503).json({ error: "Database offline" });
    }
});

app.get("/health", async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: "ok", timestamp: new Date().toISOString(), database: "connected" });
    } catch (err) {
        logger.error("Health check failed:", { error: err.message });
        res.status(503).json({ status: "error", error: "Database unavailable" });
    }
});

app.get("/api/health", async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: "OK", timestamp: new Date().toISOString(), database: "connected" });
    } catch (err) {
        logger.error("API Health check failed:", { error: err.message });
        res.status(503).json({ status: "ERROR", error: "Database unavailable" });
    }
});

// 5. Routers
app.use("/super-admin", authRoutes); 
app.use("/super-admin/dashboard", dashboardRoutes); 
app.use("/super-admin/activation-codes", activationRoutes); 
app.use("/super-admin/coupons", couponRoutes);
app.use("/super-admin/payments", paymentRoutes);
app.use("/super-admin/team", teamRoutes);

app.use("/api/super-admin", authRoutes);
app.use("/api/super-admin/dashboard", dashboardRoutes);
app.use("/api/super-admin/activation-codes", activationRoutes);
app.use("/api/super-admin/coupons", couponRoutes);
app.use("/api/super-admin/payments", paymentRoutes);
app.use("/api/super-admin/team", teamRoutes);

app.use("/api/super-admin", superAdminRoutes);
app.use("/api", deviceRoutes);

// 6. Global Error Handler - Scrubs Stack Traces in Production
app.use((err, req, res, next) => {
    const trackingId = uuidv4();
    
    // Structured Logging
    logger.error("Unhandled exception occurred", {
        trackingId,
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip || req.headers["x-forwarded-for"]
    });

    const isProduction = process.env.NODE_ENV === "production";

    res.status(err.status || 500).json({
        error: isProduction ? "Internal Server Error" : (err.message || "Internal Server Error"),
        code: err.code || "INTERNAL_ERROR",
        trackingId
    });
});

app.use((req, res) => {
    res.status(404).json({ error: "Route not found", path: req.originalUrl });
});

module.exports = app;
