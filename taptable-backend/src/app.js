const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./auth/auth.routes");
const dashboardRoutes = require("./dashboard/dashboard.routes");
const activationRoutes = require("./activation/activation.routes");
const deviceRoutes = require("./activation/device.routes");

const app = express();

// middlewares
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    credentials: true
}));
app.use(express.json());

// health check
app.get("/", (req, res) => {
    res.json({ message: "TapTable Backend is running on Vercel" });
});

app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date() });
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

module.exports = app;
