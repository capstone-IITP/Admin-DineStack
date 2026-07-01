const express = require("express");
const router = express.Router();
const controller = require("./superAdmin.controller");
const { requireSuperAdmin, requireRole } = require("../auth/auth.middleware");
const { validate } = require("../middleware/validation.middleware");
const { z } = require("zod");
const { adminWriteLimiter } = require("../middleware/rate-limit.middleware");

const restaurantIdSchema = {
    params: z.object({ id: z.string().uuid("Invalid Restaurant ID format") })
};
const revokeSchema = {
    params: z.object({ id: z.string().uuid("Invalid Restaurant ID format") }),
    body: z.object({ reason: z.string().min(1).max(1000) })
};

// Protection: All routes here require Super Admin
router.use(requireSuperAdmin);

// Routes
router.get("/restaurants", requireRole(["OWNER", "MANAGER"]), controller.getAllRestaurants);
router.post("/restaurants/:id/revoke", adminWriteLimiter, requireRole(["OWNER"]), validate(revokeSchema), controller.revokeRestaurantAccess);
router.post("/restaurants/:id/activate", adminWriteLimiter, requireRole(["OWNER"]), validate(restaurantIdSchema), controller.reactivateRestaurantAccess);
router.get("/restaurants/:id/status", requireRole(["OWNER", "MANAGER"]), validate(restaurantIdSchema), controller.getRestaurantStatus);

module.exports = router;
