const express = require("express");
const { requireSuperAdmin } = require("../auth/auth.middleware");
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
router.post("/restaurants", createRestaurant);
router.delete("/restaurants/:id", deleteRestaurant);
router.patch("/restaurants/:id/status", require("./dashboard.controller").updateRestaurantStatus);
router.get("/keys", getKeys);
router.get("/devices", getDevices);
router.get("/logs", getLogs);

module.exports = router;
