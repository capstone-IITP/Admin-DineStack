const prisma = require("../prisma");
const EntityPolicy = require('../policies/EntityPolicy');
const EntityLifecycleService = require('../services/EntityLifecycleService');
const EntityDeletionManager = require('../services/EntityDeletionManager');

const getDashboardStats = async (req, res) => {
    try {
        // Auto-fix missing fields
        try {
            await prisma.$executeRaw`UPDATE "Restaurant" SET "planStatus" = 'TRIAL' WHERE "planStatus" IS NULL`;
            await prisma.$executeRaw`UPDATE "Restaurant" SET "subscriptionStatus" = 'PENDING' WHERE "subscriptionStatus" IS NULL`;
        } catch (e) { }

        let activeNodes = 0;
        try { activeNodes = await prisma.device.count({ where: { status: "Online" } }); } catch (e) { console.error("Error activeNodes", e.message); }

        let registryCount = 0;
        try { registryCount = await prisma.activationCode.count(); } catch (e) { console.error("Error registryCount", e.message); }

        let usedLicenses = 0;
        try { usedLicenses = await prisma.activationCode.count({ where: { isUsed: true } }); } catch (e) { console.error("Error usedLicenses", e.message); }

        let availableLicenses = 0;
        try { 
            availableLicenses = await prisma.activationCode.count({
                where: { isUsed: false, status: 'ACTIVE', expiresAt: { gte: new Date() } }
            }); 
        } catch (e) { console.error("Error availableLicenses", e.message); }

        let licensesIssued24h = 0;
        try {
            licensesIssued24h = await prisma.activationCode.count({
                where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
            });
        } catch (e) { console.error("Error licensesIssued24h", e.message); }

        let incidents = 0;
        try { incidents = await prisma.auditLog.count({ where: { action: "ERROR" } }); } catch (e) { console.error("Error incidents", e.message); }

        res.json({
            apiGateway: "ONLINE",
            activeNodes,
            registryCount,
            usedLicenses,
            availableLicenses,
            licensing: "ACTIVE",
            incidents,
            licensesIssued24h
        });
    } catch (error) {
        console.error("DASHBOARD CRASH:", error);
        res.status(500).json({ error: "Failed to load dashboard stats" });
    }
};

const getRestaurants = async (req, res) => {
    try {
        let restaurants = [];
        try {
            restaurants = await prisma.restaurant.findMany({
                where: {
                    status: { notIn: EntityPolicy.TERMINAL_STATES }
                },
                include: { _count: { select: { devices: true } } }
            });
        } catch (dbError) {
            console.warn("Prisma findMany failed for Restaurants (schema mismatch), falling back to raw query.");
            restaurants = await prisma.$queryRaw`SELECT * FROM "Restaurant" WHERE "status" NOT IN ('DELETED', 'PURGED')`;
            // For raw queries, we won't have _count.devices, so default it to 0
            restaurants = restaurants.map(r => ({ ...r, _count: { devices: 0 } }));
        }

        // Transform to frontend format
        const formatted = restaurants.map(r => {
            const createdDate = r.createdAt || new Date();
            return {
                id: r.id,
                name: r.name,
                status: r.status || 'ACTIVE', // ACTIVE, SUSPENDED, REVOKED
                isActive: (r.status || 'ACTIVE') === 'ACTIVE',
                created: createdDate instanceof Date ? createdDate.toISOString().split('T')[0] : (typeof createdDate === 'string' ? createdDate.split('T')[0] : "Unknown"),
                devices: r._count?.devices || 0,
                licenseType: "Standard", // Default for now
                revokedAt: r.revokedAt || null,
                revocationReason: r.revocationReason || null,
                activationDate: r.activationDate instanceof Date ? r.activationDate.toISOString() : (typeof r.activationDate === 'string' ? r.activationDate : null),
                trialEndDate: r.trialEndDate instanceof Date ? r.trialEndDate.toISOString() : (typeof r.trialEndDate === 'string' ? r.trialEndDate : null),
                planStatus: r.planStatus || 'TRIAL',
                subscriptionStatus: r.subscriptionStatus || 'PENDING'
            };
        });

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch restaurants" });
    }
};

const getKeys = async (req, res) => {
    try {
        // Auto-fix any NULL generatedAt fields from older records
        try {
            await prisma.$executeRaw`UPDATE "ActivationCode" SET "generatedAt" = "createdAt" WHERE "generatedAt" IS NULL`;
        } catch (e) {
            console.warn("Could not auto-fix generatedAt:", e.message);
        }

        let keys = [];
        try {
            keys = await prisma.activationCode.findMany({
                orderBy: { createdAt: 'desc' },
                include: { restaurant: { select: { name: true } } }
            });
        } catch (dbError) {
            console.warn("Prisma findMany failed (likely schema mismatch), falling back to raw query:", dbError.message);
            keys = await prisma.$queryRaw`SELECT * FROM "ActivationCode"`;
        }

        const formatted = keys.map(k => {
            const createdDate = k.generatedAt || k.createdAt || new Date();
            const activatedDate = k.activatedAt || k.usedAt || null;

            return {
                id: k.id,
                code: (k.status === 'USED' || k.status === 'REVOKED' || k.status === 'EXPIRED')
                    ? `${k.code.substring(0, 9)}****-****`
                    : k.code,
                restaurant: k.restaurantName || k.entityName || (k.restaurant ? k.restaurant.name : "Unassigned"),
                entityId: k.restaurantId || null,
                status: k.status,
                created: createdDate instanceof Date ? createdDate.toISOString().split('T')[0] : (typeof createdDate === 'string' ? createdDate.split('T')[0] : "Unknown"),
                activatedAt: activatedDate instanceof Date ? activatedDate.toISOString() : (typeof activatedDate === 'string' ? activatedDate : null),
                notes: k.notes,
                generatedBy: k.generatedBy,
                revokedAt: k.revokedAt ? k.revokedAt.toISOString() : null,
                revokedBy: k.revokedBy || null,
                revokeReason: k.revokeReason || null
            };
        });

        res.json(formatted);
    } catch (error) {
        console.error("GET KEYS ERROR:", error);
        res.status(500).json({ error: "Failed to fetch activation keys" });
    }
};

const deleteKey = async (req, res) => {
    try {
        const { id } = req.params;

        const keyRecord = await prisma.activationCode.findUnique({ where: { id } });
        if (!keyRecord) {
            return res.status(404).json({ error: "Activation key not found" });
        }
        if (keyRecord.status === 'USED') {
            return res.status(400).json({ error: "Cannot revoke a used activation code" });
        }
        if (keyRecord.status === 'REVOKED') {
            return res.status(409).json({ error: "Activation code is already revoked" });
        }

        await prisma.$transaction(async (tx) => {
            await tx.activationCode.update({
                where: { id },
                data: {
                    status: 'REVOKED',
                    revokedAt: new Date(),
                    revokedBy: req.user?.email || 'SYSTEM',
                    revokeReason: 'Revoked from dashboard'
                }
            });

            if (req.user && req.user.email) {
                await tx.auditLog.create({
                    data: {
                        action: 'KEY_REVOKE',
                        actor: req.user.email,
                        target: `ActivationCode:${id}`,
                        details: `Revoked activation key from dashboard`,
                        severity: 'WARNING',
                        metadata: JSON.stringify({
                            revokedAt: new Date().toISOString(),
                            revokedBy: req.user.email,
                            revokeReason: 'Revoked from dashboard'
                        })
                    }
                });
            }
        });

        res.json({ success: true, message: "Activation code revoked" });
    } catch (error) {
        console.error("Revoke key error:", error);
        res.status(500).json({ error: "Failed to revoke key" });
    }
};

const getDevices = async (req, res) => {
    try {
        const devices = await prisma.device.findMany({
            include: { restaurant: true }
        });

        const formatted = devices.map(d => ({
            hash: d.deviceId || d.id,
            restaurant: d.restaurant.name,
            type: d.type,
            status: d.status,
            lastSeen: d.lastSeen.toISOString()
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getLogs = async (req, res) => {
    try {
        const currentUser = req.user;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const { search, severity, action, startDate, endDate } = req.query;

        // Base filter condition
        const where = {};

        // 1. Role-based log filtering: MANAGER can only see operational logs
        // We exclude SECURITY logs for MANAGER
        if (currentUser.role === "MANAGER") {
            where.severity = { not: "SECURITY" };
        } else if (currentUser.role === "INTERN") {
            return res.status(403).json({ message: "Access denied. Interns cannot view logs." });
        }

        // 2. Additional filters from query params
        if (severity) {
            where.severity = severity;
        }
        if (action) {
            where.action = action;
        }
        if (search) {
            where.OR = [
                { actor: { contains: search, mode: "insensitive" } },
                { target: { contains: search, mode: "insensitive" } },
                { details: { contains: search, mode: "insensitive" } },
                { action: { contains: search, mode: "insensitive" } }
            ];
        }

        // Date range filter
        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) {
                where.timestamp.gte = new Date(startDate);
            }
            if (endDate) {
                where.timestamp.lte = new Date(endDate);
            }
        }

        // Fetch logs and total count for pagination
        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                orderBy: { timestamp: 'desc' },
                skip,
                take: limit
            }),
            prisma.auditLog.count({ where })
        ]);

        const formatted = logs.map(l => ({
            id: l.id,
            action: l.action,
            user: l.actor,
            target: l.target,
            timestamp: l.timestamp.toISOString(),
            details: l.details,
            severity: l.severity
        }));

        res.json({
            logs: formatted,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Get logs error:", error);
        res.status(500).json({ error: error.message });
    }
};

const createRestaurant = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: "Name is required" });

        // Prevent duplicate entity names
        const existingRecords = await prisma.restaurant.findMany({ 
            where: { name } 
        });
        const existing = existingRecords.find(r => EntityPolicy.isNameReserved(r));
        if (existing) {
            return res.status(409).json({
                message: `An entity with this name already exists. Use the existing entity instead.`
            });
        }

        const restaurant = await prisma.restaurant.create({
            data: {
                name,
                status: 'ACTIVE',
                isActive: true,
                entityVersion: 1,
                lifecycleRevision: 1
            }
        });

        await prisma.auditLog.create({
            data: {
                action: 'ENTITY_CREATE',
                actor: req.user.email,
                target: `Restaurant:${restaurant.id}`,
                details: `Created restaurant "${name}"`,
                severity: 'INFO'
            }
        });

        res.status(201).json({
            id: restaurant.id,
            name: restaurant.name,
            status: "Operational",
            created: restaurant.createdAt.toISOString().split('T')[0],
            devices: 0,
            licenseType: "Standard"
        });
    } catch (error) {
        console.error("Error creating restaurant:", error);
        // Handle unique constraint violation from DB level as well
        if (error.code === 'P2002') {
            return res.status(409).json({ message: "An entity with this name already exists" });
        }
        res.status(500).json({ message: error.message });
    }
};

const deleteRestaurant = async (req, res) => {
    try {
        const { id } = req.params;
        const restaurant = await prisma.restaurant.findUnique({ where: { id } });
        if (!restaurant) {
            return res.status(404).json({ error: "Restaurant entity not found" });
        }

        const result = await EntityDeletionManager.executeDeletion(restaurant, req.user?.email || 'SYSTEM');
        res.json({ message: "Restaurant deleted successfully", restaurant: result });
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ error: "Failed to delete restaurant" });
    }
};

const updateRestaurantStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason, revokedBy } = req.body;

        if (!['ACTIVE', 'SUSPENDED', 'REVOKED'].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const restaurant = await prisma.restaurant.findUnique({ where: { id } });
        if (!restaurant) {
            return res.status(404).json({ error: "Restaurant entity not found" });
        }

        const updatedRest = await EntityLifecycleService.updateStatus(restaurant, status, reason, revokedBy || req.user?.email || "Super Admin");

        await prisma.auditLog.create({
            data: {
                action: 'STATUS_CHANGE',
                actor: req.user?.email || "SYSTEM",
                target: `Restaurant:${id}`,
                details: `Updated status of restaurant "${updatedRest.name}" to ${status}. Reason: ${reason || "None specified"}.`,
                severity: (status === 'REVOKED' || status === 'SUSPENDED') ? 'CRITICAL' : 'WARNING'
            }
        });

        res.json(updatedRest);
    } catch (error) {
        console.error("Status Update Error:", error);
        res.status(500).json({ error: "Failed to update restaurant status" });
    }
};

const ping = async (req, res) => {
    res.json({ message: "Pong", timestamp: new Date() });
};

module.exports = {
    getDashboardStats,
    getRestaurants,
    getKeys,
    getDevices,
    getLogs,
    createRestaurant,
    deleteRestaurant,
    updateRestaurantStatus,
    ping,
    deleteKey
};
