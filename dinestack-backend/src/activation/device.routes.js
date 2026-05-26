const express = require("express");
const { z } = require("zod");
const router = express.Router();
const { activateDevice, setupPin, getDeviceStatus } = require("./activation.controller");
const { validate } = require("../middleware/validation.middleware");
const {
    activationLimiter,
    pinSetupLimiter,
    deviceStatusLimiter
} = require("../middleware/rate-limit.middleware");

// Validation Schemas
const activateDeviceSchema = {
    body: z.object({
        activationCode: z.string().min(1, "Activation code is required")
    })
};

const setupPinSchema = {
    body: z.object({
        restaurantId: z.string().uuid("Invalid Restaurant ID format"),
        adminPin: z.string().regex(/^\d{4,6}$/, "Admin PIN must be between 4 and 6 digits"),
        kitchenPin: z.string().regex(/^\d{4,6}$/, "Kitchen PIN must be between 4 and 6 digits")
    })
};

const getDeviceStatusSchema = {
    query: z.object({
        restaurantId: z.string().uuid("Invalid Restaurant ID format").optional().nullable().or(z.literal(""))
    })
};

// Public route for device activation
router.post("/activate", activationLimiter, validate(activateDeviceSchema), activateDevice);
router.post("/setup-pin", pinSetupLimiter, validate(setupPinSchema), setupPin);
router.get("/device/status", deviceStatusLimiter, validate(getDeviceStatusSchema), getDeviceStatus);

module.exports = router;
