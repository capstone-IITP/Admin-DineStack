const express = require("express");
const { z } = require("zod");
const router = express.Router();
const {
    loginSuperAdmin,
    refreshToken,
    logoutSuperAdmin,
    getActiveSessions,
    revokeSession,
    revokeAllSessions
} = require("./auth.controller");
const {
    setup2FA,
    verifySetup2FA,
    verifyLogin2FA,
    disable2FA,
    get2FAStatus
} = require("./twoFactor.controller");
const { requireSuperAdmin } = require("./auth.middleware");
const { authLimiter } = require("../middleware/rate-limit.middleware");
const { validate } = require("../middleware/validation.middleware");

// Validation Schemas
const loginSchema = {
    body: z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(1, "Password is required")
    })
};

const verifyOTPSchema = {
    body: z.object({
        otp: z.string().length(6, "OTP must be exactly 6 characters")
    })
};

const disable2FASchema = {
    body: z.object({
        password: z.string().min(1, "Password is required"),
        otp: z.string().length(6, "OTP must be exactly 6 characters")
    })
};

const revokeSessionSchema = {
    body: z.object({
        sessionId: z.string().uuid("Invalid Session ID format")
    })
};

const revokeAllSessionsSchema = {
    body: z.object({
        adminId: z.string().uuid("Invalid Admin ID format").optional()
    })
};

// Public routes
router.post("/login", authLimiter, validate(loginSchema), loginSuperAdmin);
router.post("/refresh", refreshToken);

// 2FA routes — verify-login is public (uses temp token via Authorization header)
router.post("/2fa/verify-login", authLimiter, validate(verifyOTPSchema), verifyLogin2FA);

// 2FA routes — protected (require active session)
router.post("/2fa/setup", requireSuperAdmin, setup2FA);
router.post("/2fa/verify-setup", requireSuperAdmin, validate(verifyOTPSchema), verifySetup2FA);
router.post("/2fa/disable", requireSuperAdmin, validate(disable2FASchema), disable2FA);
router.get("/2fa/status", requireSuperAdmin, get2FAStatus);

// Protected routes
router.post("/logout", requireSuperAdmin, logoutSuperAdmin);

// Session management
router.get("/sessions", requireSuperAdmin, getActiveSessions);
router.post("/sessions/revoke", requireSuperAdmin, validate(revokeSessionSchema), revokeSession);
router.post("/sessions/revoke-all", requireSuperAdmin, validate(revokeAllSessionsSchema), revokeAllSessions);

router.get("/verify", requireSuperAdmin, (req, res) => {
    res.json({
        valid: true,
        admin: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role
        },
        message: "Token is valid"
    });
});

module.exports = router;
