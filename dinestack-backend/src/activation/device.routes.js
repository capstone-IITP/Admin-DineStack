const express = require("express");
const router = express.Router();
const { activateDevice, setupPin, getDeviceStatus } = require("./activation.controller");
const { activationLimiter } = require("../middleware/rate-limit.middleware");

// Public route for device activation
router.post("/activate", activationLimiter, activateDevice);
router.post("/setup-pin", setupPin); // No limiter for setup? Or maybe add it.
router.get("/device/status", getDeviceStatus);

module.exports = router;
