const express = require("express");
const { z } = require("zod");
const router = express.Router();
const { getAllCoupons, createCoupon, updateCouponStatus } = require("./coupon.controller");
const { requireSuperAdmin, requireRole } = require("../auth/auth.middleware");
const { validate } = require("../middleware/validation.middleware");
const { couponLimiter } = require("../middleware/rate-limit.middleware");

// Validation Schemas
const createCouponSchema = {
    body: z.object({
        code: z.string().min(1, "Code is required").max(50),
        discountType: z.enum(["PERCENTAGE", "FLAT"]),
        discountValue: z.number().positive("Discount value must be positive"),
        expiresAt: z.string().datetime({ precision: 3, offset: true }).nullable().or(z.string().date()).or(z.string().datetime()).optional(),
        maxUsage: z.number().int().positive("Max usage must be a positive integer").optional().nullable()
    })
};

const updateCouponStatusSchema = {
    params: z.object({
        id: z.string().uuid("Invalid Coupon ID format")
    }),
    body: z.object({
        status: z.enum(["ACTIVE", "DISABLED", "EXPIRED"])
    })
};

// Require active session for all coupon routes
router.use(requireSuperAdmin);

// All roles (OWNER, MANAGER, INTERN) can list coupons
router.get("/", getAllCoupons);

// Only OWNER and MANAGER can create or disable coupons, with limiters and schemas
router.post("/", requireRole(["OWNER", "MANAGER"]), couponLimiter, validate(createCouponSchema), createCoupon);
router.patch("/:id/status", requireRole(["OWNER", "MANAGER"]), couponLimiter, validate(updateCouponStatusSchema), updateCouponStatus);

module.exports = router;
