const express = require("express");
const { z } = require("zod");
const { requireSuperAdmin, requireRole } = require("../auth/auth.middleware");
const { validate } = require("../middleware/validation.middleware");
const {
    getDashboardStats,
    getRestaurants,
    getKeys,
    getDevices,
    getLogs,
    createRestaurant,
    deleteRestaurant,
    updateRestaurantStatus,
    ping
} = require("./dashboard.controller");

const router = express.Router();

// Validation Schemas
const getLogsSchema = {
    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).optional().default("1"),
        limit: z.string().regex(/^\d+$/).transform(Number).optional().default("50"),
        severity: z.string().optional(),
        action: z.string().optional(),
        search: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional()
    })
};

const createRestaurantSchema = {
    body: z.object({
        name: z.string().min(1, "Name is required").max(100)
    })
};

const updateRestaurantStatusSchema = {
    params: z.object({
        id: z.string().uuid("Invalid Restaurant ID format")
    }),
    body: z.object({
        status: z.enum(["ACTIVE", "SUSPENDED", "REVOKED"]),
        reason: z.string().max(1000).optional().nullable(),
        revokedBy: z.string().optional().nullable()
    })
};

const deleteRestaurantSchema = {
    params: z.object({
        id: z.string().uuid("Invalid Restaurant ID format")
    })
};

router.use(requireSuperAdmin);

router.get("/ping", ping);
router.get("/stats", getDashboardStats);
router.get("/restaurants", getRestaurants);

// OWNER and MANAGER can create entities and update status
router.post("/restaurants", requireRole(["OWNER", "MANAGER"]), validate(createRestaurantSchema), createRestaurant);
router.patch("/restaurants/:id/status", requireRole(["OWNER", "MANAGER"]), validate(updateRestaurantStatusSchema), updateRestaurantStatus);

// Only OWNER can soft-delete/deactivate entities
router.delete("/restaurants/:id", requireRole(["OWNER"]), validate(deleteRestaurantSchema), deleteRestaurant);

// OWNER and MANAGER can manage keys/devices
router.get("/keys", requireRole(["OWNER", "MANAGER"]), getKeys);
router.get("/devices", requireRole(["OWNER", "MANAGER"]), getDevices);

// OWNER and MANAGER can view logs (with manager logs filtered)
router.get("/logs", requireRole(["OWNER", "MANAGER"]), validate(getLogsSchema), getLogs);

module.exports = router;
