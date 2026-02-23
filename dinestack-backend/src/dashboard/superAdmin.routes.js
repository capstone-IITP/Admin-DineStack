const express = require("express");
const router = express.Router();
const controller = require("./superAdmin.controller");
const { requireSuperAdmin } = require("../auth/auth.middleware");

// Protection: All routes here require Super Admin
router.use(requireSuperAdmin);

// Routes
router.get("/restaurants", controller.getAllRestaurants);
router.post("/restaurants/:id/revoke", controller.revokeRestaurantAccess);
router.post("/restaurants/:id/activate", controller.reactivateRestaurantAccess);
router.get("/restaurants/:id/status", controller.getRestaurantStatus);

module.exports = router;
