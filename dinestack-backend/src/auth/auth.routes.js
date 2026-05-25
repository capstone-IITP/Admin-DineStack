const express = require("express");
const router = express.Router();
const {
    loginSuperAdmin,
    refreshToken,
    logoutSuperAdmin
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

// Public routes
router.post("/login", authLimiter, loginSuperAdmin);
router.post("/refresh", refreshToken);

// 2FA routes — verify-login is public (uses temp token via Authorization header)
router.post("/2fa/verify-login", authLimiter, verifyLogin2FA);

// 2FA routes — protected (require active session)
router.post("/2fa/setup", requireSuperAdmin, setup2FA);
router.post("/2fa/verify-setup", requireSuperAdmin, verifySetup2FA);
router.post("/2fa/disable", requireSuperAdmin, disable2FA);
router.get("/2fa/status", requireSuperAdmin, get2FAStatus);

// Protected routes
router.post("/logout", requireSuperAdmin, logoutSuperAdmin);

// Session management
const { getActiveSessions, revokeSession, revokeAllSessions } = require("./auth.controller");
router.get("/sessions", requireSuperAdmin, getActiveSessions);
router.post("/sessions/revoke", requireSuperAdmin, revokeSession);
router.post("/sessions/revoke-all", requireSuperAdmin, revokeAllSessions);

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
