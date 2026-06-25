const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

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
        res.status(500).json({ error: error.message });
    }
};

const getRestaurants = async (req, res) => {
    try {
        let restaurants = [];
        try {
            restaurants = await prisma.restaurant.findMany({
                include: { _count: { select: { devices: true } } }
            });
        } catch (dbError) {
            console.warn("Prisma findMany failed for Restaurants (schema mismatch), falling back to raw query.");
            restaurants = await prisma.$queryRaw`SELECT * FROM "Restaurant"`;
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
        res.status(500).json({ error: error.message });
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
                code: k.code,
                restaurant: k.restaurantName || k.entityName || (k.restaurant ? k.restaurant.name : "Unassigned"),
                entityId: k.restaurantId || null,
                status: k.status,
                created: createdDate instanceof Date ? createdDate.toISOString().split('T')[0] : (typeof createdDate === 'string' ? createdDate.split('T')[0] : "Unknown"),
                activatedAt: activatedDate instanceof Date ? activatedDate.toISOString() : (typeof activatedDate === 'string' ? activatedDate : null),
                notes: k.notes,
                generatedBy: k.generatedBy
            };
        });

        res.json(formatted);
    } catch (error) {
        console.error("GET KEYS ERROR:", error);
        res.status(500).json({ error: error.message });
    }
};

const deleteKey = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.$transaction(async (tx) => {
            // 1. Clear circular reference from any restaurant pointing to this key
            await tx.restaurant.updateMany({
                where: { activationCodeId: id },
                data: { activationCodeId: null }
            });

            // 2. Delete the key
            await tx.activationCode.delete({
                where: { id }
            });
            
            // 3. Log the deletion
            if (req.user && req.user.email) {
                await tx.auditLog.create({
                    data: {
                        action: 'KEY_DELETE',
                        actor: req.user.email,
                        target: `ActivationCode:${id}`,
                        details: `Deleted activation key from dashboard`,
                        severity: 'WARNING'
                    }
                });
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error("DELETE KEY ERROR:", error);
        res.status(500).json({ error: error.message });
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
        const existing = await prisma.restaurant.findUnique({ where: { name } });
        if (existing) {
            return res.status(409).json({
                message: `Entity with name "${name}" already exists (ID: ${existing.id}). Use the existing entity instead.`
            });
        }

        const restaurant = await prisma.restaurant.create({
            data: {
                name,
                isActive: true
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

        const result = await prisma.$transaction(async (tx) => {
            const restaurant = await tx.restaurant.findUnique({ where: { id } });
            if (!restaurant) {
                throw new Error("Restaurant entity not found");
            }

            // 1. Delete TableSessions
            await tx.tableSession.deleteMany({ where: { restaurantId: id } });

            // 2. Delete PairCodes
            await tx.pairCode.deleteMany({ where: { restaurantId: id } });

            // 3. Delete OrderItems
            const orders = await tx.order.findMany({ where: { restaurantId: id }, select: { id: true } });
            const orderIds = orders.map(o => o.id);
            if (orderIds.length > 0) {
                await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
            }

            // 4. Delete Orders
            await tx.order.deleteMany({ where: { restaurantId: id } });

            // 5. Delete Sessions
            await tx.session.deleteMany({ where: { restaurantId: id } });

            // 6. Delete MenuItems
            await tx.menuItem.deleteMany({ where: { restaurantId: id } });

            // 7. Delete Categories
            await tx.category.deleteMany({ where: { restaurantId: id } });

            // 8. Delete Tables
            await tx.table.deleteMany({ where: { restaurantId: id } });

            // 9. Delete RecoveryCodes
            await tx.recoveryCode.deleteMany({ where: { restaurantId: id } });

            // 10. Delete Customers
            await tx.customer.deleteMany({ where: { restaurantId: id } });

            // 11. Delete Devices
            await tx.device.deleteMany({ where: { restaurantId: id } });

            // Delete ApiKeys
            await tx.apiKey.deleteMany({ where: { restaurantId: id } });

            // Delete RefreshTokens
            await tx.refreshToken.deleteMany({ where: { restaurantId: id } });

            // Delete Subscriptions
            await tx.subscription.deleteMany({ where: { restaurantId: id } });

            // Delete Payments
            await tx.payment.deleteMany({ where: { restaurantId: id } });

            // 12. Clear circular reference
            await tx.restaurant.update({
                where: { id },
                data: { activationCodeId: null }
            });

            // 13. Delete ActivationCodes
            await tx.activationCode.deleteMany({ where: { restaurantId: id } });

            // 14. Delete Restaurant itself
            const deleted = await tx.restaurant.delete({ where: { id } });

            // Log hard delete audit (CRITICAL severity)
            await tx.auditLog.create({
                data: {
                    action: 'ENTITY_DELETE_HARD',
                    actor: req.user.email,
                    target: `Restaurant:${id}`,
                    details: `Hard deleted restaurant "${restaurant.name}" and all associated data`,
                    severity: 'CRITICAL'
                }
            });

            return deleted;
        }, {
            maxWait: 15000,
            timeout: 30000
        });

        res.json({ message: "Restaurant deleted successfully", restaurant: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateRestaurantStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason, revokedBy } = req.body;

        if (!['ACTIVE', 'SUSPENDED', 'REVOKED'].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const result = await prisma.$transaction(async (tx) => {
            const updateData = {
                status,
                isActive: status === 'ACTIVE', // Keep legacy field in sync
            };

            if (status === 'REVOKED' || status === 'SUSPENDED') {
                updateData.revokedAt = new Date();
                updateData.revokedBy = revokedBy || req.user.email || "Super Admin";
                updateData.revocationReason = reason;

                // Invalidate Activation Codes associated with this restaurant (use FK, not name)
                await tx.activationCode.updateMany({
                    where: {
                        restaurantId: id,
                        isUsed: false,
                        status: 'ACTIVE'
                    },
                    data: {
                        status: 'INVALIDATED'
                    }
                });
            } else {
                // Reactivation
                updateData.revokedAt = null;
                updateData.revokedBy = null;
                updateData.revocationReason = null;
            }

            const updatedRest = await tx.restaurant.update({
                where: { id },
                data: updateData
            });

            // Write status change log
            await tx.auditLog.create({
                data: {
                    action: 'STATUS_CHANGE',
                    actor: req.user.email,
                    target: `Restaurant:${id}`,
                    details: `Updated status of restaurant "${updatedRest.name}" to ${status}. Reason: ${reason || "None specified"}.`,
                    severity: (status === 'REVOKED' || status === 'SUSPENDED') ? 'CRITICAL' : 'WARNING'
                }
            });

            return updatedRest;
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
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
