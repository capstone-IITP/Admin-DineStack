const prisma = require("../prisma");

function maskString(str) {
    if (!str) return "";
    if (str.length <= 8) return "****";
    return str.slice(0, 4) + "****" + str.slice(-4);
}

// GET /api/super-admin/payments
exports.getAllPayments = async (req, res) => {
    try {
        const { status } = req.query;
        
        const whereClause = {};
        if (status && ["SUCCESS", "PENDING", "FAILED", "REFUNDED"].includes(status)) {
            whereClause.status = status;
        }

        const payments = await prisma.payment.findMany({
            where: whereClause,
            include: {
                restaurant: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        // If the user role is INTERN, mask sensitive fields
        if (req.userRole === "INTERN") {
            const maskedPayments = payments.map(p => ({
                ...p,
                transactionId: maskString(p.transactionId),
                invoiceRef: maskString(p.invoiceRef)
            }));
            return res.json(maskedPayments);
        }

        res.json(payments);
    } catch (error) {
        console.error("Get all payments error:", error);
        res.status(500).json({ message: "Failed to fetch payments" });
    }
};

// POST /api/super-admin/payments/:id/refund
exports.refundPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason || reason.trim() === "") {
            return res.status(400).json({ message: "A refund reason is required" });
        }

        const payment = await prisma.payment.findUnique({
            where: { id },
            include: {
                restaurant: {
                    select: {
                        name: true
                    }
                }
            }
        });

        if (!payment) {
            return res.status(404).json({ message: "Payment not found" });
        }

        if (payment.status === "REFUNDED") {
            return res.status(400).json({ message: "Payment has already been refunded" });
        }

        if (payment.status !== "SUCCESS") {
            return res.status(400).json({ message: "Only successful payments can be refunded" });
        }

        const updatedPayment = await prisma.payment.update({
            where: { id },
            data: {
                status: "REFUNDED"
            }
        });

        // Log payment action to AuditLog with CRITICAL severity
        const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
        const ua = req.headers["user-agent"] || "unknown";
        const details = `Refunded payment of ${payment.amount} ${payment.currency} for restaurant "${payment.restaurant.name}" (ID: ${payment.restaurantId}). Reason: ${reason}. [IP: ${ip}] [UA: ${ua}]`;

        await prisma.auditLog.create({
            data: {
                action: "PAYMENT_REFUND",
                actor: req.user.email,
                target: `Payment:${id}`,
                details: details,
                severity: "CRITICAL"
            }
        });

        res.json(updatedPayment);
    } catch (error) {
        console.error("Refund payment error:", error);
        res.status(500).json({ message: "Failed to refund payment" });
    }
};
