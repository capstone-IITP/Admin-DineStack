const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getDashboardStats = async (req, res) => {
    try {
        const activeNodes = await prisma.device.count({ where: { status: "Online" } });

        // Registry count = total activation codes (source of truth)
        const registryCount = await prisma.activationCode.count();

        // Used licenses = activation codes that have been consumed
        const usedLicenses = await prisma.activationCode.count({
            where: { isUsed: true }
        });

        // Available licenses = unused codes with ACTIVE status (not INVALIDATED or expired)
        const availableLicenses = await prisma.activationCode.count({
            where: {
                isUsed: false,
                status: 'ACTIVE',
                expiresAt: { gte: new Date() }
            }
        });

        const rawAllCodes = await prisma.activationCode.count();
        console.log("DEBUG RAW COUNT:", rawAllCodes);

        const licensesIssued24h = await prisma.activationCode.count({
            where: {
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                }
            }
        });
        const incidents = await prisma.auditLog.count({ where: { action: "ERROR" } });

        console.log("Dashboard Stats Debug:", {
            registryCount,
            usedLicenses,
            availableLicenses,
            licensesIssued24h
        });

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
        res.status(500).json({ error: error.message });
    }
};

const getRestaurants = async (req, res) => {
    try {
        const restaurants = await prisma.restaurant.findMany({
            include: { _count: { select: { devices: true } } }
        });

        // Transform to frontend format
        const formatted = restaurants.map(r => ({
            id: r.id,
            name: r.name,
            status: r.status, // ACTIVE, SUSPENDED, REVOKED
            isActive: r.status === 'ACTIVE',
            created: r.createdAt.toISOString().split('T')[0],
            devices: r._count.devices,
            licenseType: "Standard", // Default for now
            revokedAt: r.revokedAt,
            revocationReason: r.revocationReason
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getKeys = async (req, res) => {
    try {
        const keys = await prisma.activationCode.findMany({
            include: { restaurant: true }
        });

        const formatted = keys.map(k => ({
            id: k.id,
            code: k.code,
            restaurant: k.restaurant ? k.restaurant.name : (k.entityName || "Unassigned"),
            entityId: k.restaurant ? k.restaurant.id : null, // Add entity ID
            status: k.isUsed ? "Used" : (new Date(k.expiresAt) < new Date() ? "Expired" : "Unused"),
            created: k.createdAt.toISOString().split('T')[0],
            boundTo: k.isUsed ? "Bound" : null
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getDevices = async (req, res) => {
    try {
        const devices = await prisma.device.findMany({
            include: { restaurant: true }
        });

        const formatted = devices.map(d => ({
            hash: d.hash,
            restaurant: d.restaurant.name,
            type: d.type,
            status: d.status,
            lastSeen: d.lastSeen.toLocaleString()
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getLogs = async (req, res) => {
    try {
        const logs = await prisma.auditLog.findMany({
            orderBy: { timestamp: 'desc' },
            take: 50
        });

        const formatted = logs.map(l => ({
            id: l.id,
            action: l.action,
            user: l.user,
            target: l.target,
            timestamp: l.timestamp.toLocaleString(),
            details: l.details
        }));

        res.json(formatted);
    } catch (error) {
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

        await prisma.$transaction(async (tx) => {
            // Delete related devices first
            await tx.device.deleteMany({
                where: { restaurantId: id }
            });

            // Delete potentially missing schema relationships (Cascading Delete for Legacy Tables)
            const cascadeTables = [
                { name: "PairCode", sql: `DELETE FROM "PairCode" WHERE "restaurantId" = $1` },
                { name: "Payment", sql: `DELETE FROM "Payment" WHERE "billId" IN (SELECT "id" FROM "Bill" WHERE "orderId" IN (SELECT "id" FROM "Order" WHERE "tableId" IN (SELECT "id" FROM "Table" WHERE "restaurantId" = $1)))` },
                { name: "Bill", sql: `DELETE FROM "Bill" WHERE "orderId" IN (SELECT "id" FROM "Order" WHERE "tableId" IN (SELECT "id" FROM "Table" WHERE "restaurantId" = $1))` },
                { name: "OrderItem", sql: `DELETE FROM "OrderItem" WHERE "orderId" IN (SELECT "id" FROM "Order" WHERE "tableId" IN (SELECT "id" FROM "Table" WHERE "restaurantId" = $1))` },
                { name: "Order", sql: `DELETE FROM "Order" WHERE "tableId" IN (SELECT "id" FROM "Table" WHERE "restaurantId" = $1)` },
                { name: "Session", sql: `DELETE FROM "Session" WHERE "tableId" IN (SELECT "id" FROM "Table" WHERE "restaurantId" = $1)` },
                { name: "Table", sql: `DELETE FROM "Table" WHERE "restaurantId" = $1` },
                { name: "MenuItem", sql: `DELETE FROM "MenuItem" WHERE "categoryId" IN (SELECT "id" FROM "Category" WHERE "restaurantId" = $1)` },
                { name: "Category", sql: `DELETE FROM "Category" WHERE "restaurantId" = $1` }
            ];

            for (const table of cascadeTables) {
                try {
                    await tx.$executeRawUnsafe(table.sql, id);
                } catch (e) {
                    console.warn(`[DELETE_WARN] Failed to cascade delete ${table.name}: ${e.message}`);
                }
            }

            // Delete the restaurant
            await tx.restaurant.delete({
                where: { id }
            });
        });

        res.json({ message: "Restaurant deleted successfully" });
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
                updateData.revokedBy = revokedBy || "Super Admin";
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

            return await tx.restaurant.update({
                where: { id },
                data: updateData
            });
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
    ping
};
