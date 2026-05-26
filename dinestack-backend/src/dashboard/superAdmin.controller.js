const prisma = require("../prisma");


exports.getAllRestaurants = async (req, res) => {
    try {
        const { status } = req.query;
        const where = {};
        if (status) {
            where.status = status;
        }

        const restaurants = await prisma.restaurant.findMany({
            where,
            select: {
                id: true,
                name: true,
                ownerEmail: true,
                status: true,
                isActive: true, // Legacy
                createdAt: true,
                revokedAt: true,
                revokedBy: true,
                revocationReason: true,
                subscriptionEndsAt: true,
                _count: {
                    select: { devices: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(restaurants);
    } catch (error) {
        console.error("Get All Restaurants Error:", error);
        res.status(500).json({ message: "Failed to fetch restaurants" });
    }
};

exports.revokeRestaurantAccess = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ message: "Revocation reason is required" });
        }

        const restaurant = await prisma.restaurant.findUnique({ where: { id } });
        if (!restaurant) {
            return res.status(404).json({ message: "Restaurant not found" });
        }

        if (restaurant.status === 'REVOKED') {
            return res.status(409).json({ message: "Restaurant is already revoked" });
        }

        const updatedRestaurant = await prisma.$transaction(async (tx) => {
            // Update Restaurant
            const updated = await tx.restaurant.update({
                where: { id },
                data: {
                    status: 'REVOKED',
                    isActive: false, // Legacy sync
                    revokedAt: new Date(),
                    revokedBy: req.user.email, // Or ID
                    revocationReason: reason
                }
            });

            // Audit
            await tx.auditLog.create({
                data: {
                    action: 'REVOKE_ACCESS',
                    actor: req.user.email,
                    target: `Restaurant:${id}`,
                    details: `Revoked restaurant access. Reason: ${reason}`,
                    metadata: { reason, previousStatus: restaurant.status }
                }
            });

            return updated;
        });

        // Trigger Real-time Event (Mock/Placeholder)
        // eventEmitter.emit('restaurant:revoked', { id, reason });

        res.json({
            success: true,
            message: "Restaurant access revoked",
            restaurant: updatedRestaurant
        });

    } catch (error) {
        console.error("Revoke Access Error:", error);
        res.status(500).json({ message: "Failed to revoke access" });
    }
};

exports.reactivateRestaurantAccess = async (req, res) => {
    try {
        const { id } = req.params;

        const restaurant = await prisma.restaurant.findUnique({ where: { id } });
        if (!restaurant) {
            return res.status(404).json({ message: "Restaurant not found" });
        }

        if (restaurant.status === 'ACTIVE') {
            return res.status(409).json({ message: "Restaurant is already active" });
        }

        const updatedRestaurant = await prisma.$transaction(async (tx) => {
            const updated = await tx.restaurant.update({
                where: { id },
                data: {
                    status: 'ACTIVE',
                    isActive: true, // Legacy sync
                    revokedAt: null, // Clear these or keep history? Plan said clear.
                    revokedBy: null,
                    revocationReason: null
                }
            });

            await tx.auditLog.create({
                data: {
                    action: 'ACTIVATE_ACCESS',
                    actor: req.user.email,
                    target: `Restaurant:${id}`,
                    details: `Reactivated restaurant access`,
                    metadata: { previousStatus: restaurant.status }
                }
            });

            return updated;
        });

        res.json({
            success: true,
            message: "Restaurant access reactivated",
            restaurant: updatedRestaurant
        });

    } catch (error) {
        console.error("Reactivate Access Error:", error);
        res.status(500).json({ message: "Failed to reactivate access" });
    }
};

exports.getRestaurantStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const restaurant = await prisma.restaurant.findUnique({
            where: { id },
            select: { id: true, status: true, isActive: true, revokedAt: true }
        });

        if (!restaurant) {
            return res.status(404).json({ message: "Restaurant not found" });
        }

        res.json(restaurant);
    } catch (error) {
        console.error("Get Status Error:", error);
        res.status(500).json({ message: "Failed to fetch status" });
    }
};
