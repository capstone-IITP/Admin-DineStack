const prisma = require("../prisma");

// GET /api/super-admin/coupons
exports.getAllCoupons = async (req, res) => {
    try {
        const coupons = await prisma.coupon.findMany({
            orderBy: { createdAt: "desc" }
        });
        res.json(coupons);
    } catch (error) {
        console.error("Get all coupons error:", error);
        res.status(500).json({ message: "Failed to fetch coupons" });
    }
};

// POST /api/super-admin/coupons
exports.createCoupon = async (req, res) => {
    try {
        const { code, discountType, discountValue, expiresAt, maxUsage } = req.body;

        if (!code || !discountType || discountValue === undefined) {
            return res.status(400).json({ message: "Code, discountType, and discountValue are required" });
        }

        if (!["PERCENTAGE", "FLAT"].includes(discountType)) {
            return res.status(400).json({ message: "discountType must be PERCENTAGE or FLAT" });
        }

        const existing = await prisma.coupon.findUnique({ where: { code } });
        if (existing) {
            return res.status(409).json({ message: `Coupon with code "${code}" already exists` });
        }

        const coupon = await prisma.coupon.create({
            data: {
                code: code.toUpperCase().trim(),
                discountType,
                discountValue: parseFloat(discountValue),
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                maxUsage: maxUsage ? parseInt(maxUsage) : null
            }
        });

        // Log coupon creation (WARNING severity for operations)
        await prisma.auditLog.create({
            data: {
                action: 'COUPON_CREATE',
                user: req.user.email,
                target: `Coupon:${coupon.id}`,
                details: `Created coupon ${coupon.code} (${discountType}: ${discountValue})`,
                severity: 'WARNING'
            }
        });

        res.status(201).json(coupon);
    } catch (error) {
        console.error("Create coupon error:", error);
        res.status(500).json({ message: "Failed to create coupon" });
    }
};

// PATCH /api/super-admin/coupons/:id/status
exports.updateCouponStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !["ACTIVE", "DISABLED", "EXPIRED"].includes(status)) {
            return res.status(400).json({ message: "Valid status (ACTIVE, DISABLED, EXPIRED) is required" });
        }

        const existing = await prisma.coupon.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: "Coupon not found" });
        }

        const coupon = await prisma.coupon.update({
            where: { id },
            data: { status }
        });

        // Log coupon status change (WARNING severity)
        await prisma.auditLog.create({
            data: {
                action: 'COUPON_STATUS_CHANGE',
                user: req.user.email,
                target: `Coupon:${coupon.id}`,
                details: `Updated coupon ${coupon.code} status to ${status}`,
                severity: 'WARNING'
            }
        });

        res.json(coupon);
    } catch (error) {
        console.error("Update coupon status error:", error);
        res.status(500).json({ message: "Failed to update coupon status" });
    }
};
