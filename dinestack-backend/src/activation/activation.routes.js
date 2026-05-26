const express = require("express");
const { z } = require("zod");
const router = express.Router();

const { createActivationCode, getAllActivationCodes, deleteActivationCode } = require("./activation.controller");
const { requireSuperAdmin, requireRole } = require("../auth/auth.middleware");
const { validate } = require("../middleware/validation.middleware");

// Validation Schemas
const createActivationCodeSchema = {
    body: z.object({
        restaurantId: z.string().uuid("Invalid Restaurant ID format"),
        plan: z.string().min(1, "Plan is required").max(50),
        durationDays: z.number().int().positive("Duration must be a positive integer"),
        maxTables: z.number().int().positive("Max tables must be a positive integer")
    })
};

const deleteActivationCodeSchema = {
    params: z.object({
        id: z.string().uuid("Invalid Activation Code ID format")
    })
};

// All activation code management requires OWNER or MANAGER role
router.use(requireSuperAdmin);
router.use(requireRole(["OWNER", "MANAGER"]));

router.post("/", validate(createActivationCodeSchema), createActivationCode);
router.get("/", getAllActivationCodes);
router.delete("/:id", validate(deleteActivationCodeSchema), deleteActivationCode); // Soft invalidation in controller

module.exports = router;
