const express = require("express");
const router = express.Router();
const {
    loginSuperAdmin,
    refreshToken,
    logoutSuperAdmin
} = require("./auth.controller");
const { requireSuperAdmin } = require("./auth.middleware");

// Public routes
router.post("/login", loginSuperAdmin);
router.post("/refresh", refreshToken);

// Protected routes
router.post("/logout", requireSuperAdmin, logoutSuperAdmin);

router.get("/verify", requireSuperAdmin, (req, res) => {
    res.json({
        valid: true,
        admin: req.superAdmin,
        message: "Token is valid"
    });
});

module.exports = router;
