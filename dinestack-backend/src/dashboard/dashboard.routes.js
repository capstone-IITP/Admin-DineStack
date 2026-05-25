const express = require("express");
const { requireSuperAdmin, requireRole } = require("../auth/auth.middleware");
const {
    getDashboardStats,
    getRestaurants,
    getKeys,
    getDevices,
    getLogs,
    createRestaurant,
    deleteRestaurant,
    ping
} = require("./dashboard.controller");

const router = express.Router();

router.use(requireSuperAdmin);

router.get("/ping", ping);
router.get("/stats", getDashboardStats);
router.get("/restaurants", getRestaurants);

// OWNER and MANAGER can create entities and update status
router.post("/restaurants", requireRole(["OWNER", "MANAGER"]), createRestaurant);
router.patch("/restaurants/:id/status", requireRole(["OWNER", "MANAGER"]), require("./dashboard.controller").updateRestaurantStatus);

// Only OWNER can soft-delete/deactivate entities
router.delete("/restaurants/:id", requireRole(["OWNER"]), deleteRestaurant);

// OWNER and MANAGER can manage keys/devices
router.get("/keys", requireRole(["OWNER", "MANAGER"]), getKeys);
router.get("/devices", requireRole(["OWNER", "MANAGER"]), getDevices);

// OWNER and MANAGER can view logs (with manager logs filtered)
router.get("/logs", requireRole(["OWNER", "MANAGER"]), getLogs);

module.exports = router;
