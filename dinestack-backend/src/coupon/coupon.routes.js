const express = require("express");
const router = express.Router();
const { getAllCoupons, createCoupon, updateCouponStatus } = require("./coupon.controller");
const { requireSuperAdmin, requireRole } = require("../auth/auth.middleware");

// Require active session for all coupon routes
router.use(requireSuperAdmin);

// All roles (OWNER, MANAGER, INTERN) can list coupons
router.get("/", getAllCoupons);

// Only OWNER and MANAGER can create or disable coupons
router.post("/", requireRole(["OWNER", "MANAGER"]), createCoupon);
router.patch("/:id/status", requireRole(["OWNER", "MANAGER"]), updateCouponStatus);

module.exports = router;
