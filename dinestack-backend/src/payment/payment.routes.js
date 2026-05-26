const express = require("express");
const { z } = require("zod");
const router = express.Router();
const { getAllPayments, refundPayment } = require("./payment.controller");
const { requireSuperAdmin, requireRole } = require("../auth/auth.middleware");
const { refundLimiter } = require("../middleware/rate-limit.middleware");
const { validate } = require("../middleware/validation.middleware");

// Validation Schemas
const refundPaymentSchema = {
    params: z.object({
        id: z.string().uuid("Invalid Payment ID format")
    }),
    body: z.object({
        reason: z.string().min(1, "A refund reason is required").max(500)
    })
};

// Require active session for all payment routes
router.use(requireSuperAdmin);

// All roles (OWNER, MANAGER, INTERN) can list payments
router.get("/", getAllPayments);

// Only OWNER and MANAGER can execute refunds, and it is rate-limited and validated
router.post("/:id/refund", requireRole(["OWNER", "MANAGER"]), refundLimiter, validate(refundPaymentSchema), refundPayment);

module.exports = router;
