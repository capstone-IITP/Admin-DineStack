const express = require("express");
const { z } = require("zod");
const router = express.Router();

const { createActivationCode, getAllActivationCodes, deleteActivationCode } = require("./activation.controller");
const { requireSuperAdmin, requireRole } = require("../auth/auth.middleware");
const { validate } = require("../middleware/validation.middleware");

// Validation Schemas
const createActivationCodeSchema = {
    body: z.object({
        restaurantName: z.string().min(1, "Restaurant name is required").max(100),
        notes: z.string().max(500).optional().nullable()
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
