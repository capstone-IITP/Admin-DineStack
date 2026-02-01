const express = require("express");
const router = express.Router();
const { loginSuperAdmin } = require("./auth.controller");

const { requireSuperAdmin } = require("./auth.middleware");

router.post("/login", loginSuperAdmin);

// Token verification endpoint
router.get("/verify", requireSuperAdmin, (req, res) => {
    res.json({
        valid: true,
        admin: req.superAdmin,
        message: "Token is valid"
    });
});

module.exports = router;
