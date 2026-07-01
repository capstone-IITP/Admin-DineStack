const express = require("express");
const { z } = require("zod");
const router = express.Router();

const { createActivationCode, getAllActivationCodes, deleteActivationCode } = require("./activation.controller");
const { requireSuperAdmin, requireRole } = require("../auth/auth.middleware");
const { validate } = require("../middleware/validation.middleware");
const { codeGenLimiter } = require("../middleware/rate-limit.middleware");

// Validation Schemas
const createActivationCodeSchema = {
    body: z.object({
        restaurantName: z.string().min(1, "Restaurant name is required").max(100),
        notes: z.string().max(500).optional().nullable()
    })
};

const revokeActivationCodeSchema = {
    params: z.object({
        id: z.string().uuid("Invalid Activation Code ID format")
    }),
    body: z.object({
        reason: z.string().max(500).optional().nullable()
    }).optional()
};

// All activation code management requires OWNER or MANAGER role
router.use(requireSuperAdmin);
router.use(requireRole(["OWNER", "MANAGER"]));

router.post("/", codeGenLimiter, validate(createActivationCodeSchema), createActivationCode);
router.get("/", getAllActivationCodes);
router.patch("/:id/revoke", codeGenLimiter, validate(revokeActivationCodeSchema), deleteActivationCode);

module.exports = router;
