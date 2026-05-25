const express = require("express");
const router = express.Router();
const { getAllPayments, refundPayment } = require("./payment.controller");
const { requireSuperAdmin, requireRole } = require("../auth/auth.middleware");
const { refundLimiter } = require("../middleware/rate-limit.middleware");

// Require active session for all payment routes
router.use(requireSuperAdmin);

// All roles (OWNER, MANAGER, INTERN) can list payments
router.get("/", getAllPayments);

// Only OWNER and MANAGER can execute refunds, and it is rate-limited
router.post("/:id/refund", requireRole(["OWNER", "MANAGER"]), refundLimiter, refundPayment);

module.exports = router;
