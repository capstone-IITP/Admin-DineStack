const jwt = require("jsonwebtoken");
const prisma = require("../prisma");

/**
 * Unified Super Admin authentication middleware.
 * 
 * Verifies JWT from cookie (preferred) or Authorization header.
 * Checks role === SUPER_ADMIN and account isActive === true in DB.
 */
exports.requireSuperAdmin = async (req, res, next) => {
    try {
        // 1. Extract token — prefer cookie, fallback to Authorization header
        let token = req.cookies?.access_token;

        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith("Bearer ")) {
                token = authHeader.split(" ")[1];
            }
        }

        if (!token) {
            return res.status(401).json({
                message: "Authentication required",
                code: "TOKEN_MISSING"
            });
        }

        // 2. Verify JWT
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === "TokenExpiredError") {
                return res.status(401).json({
                    message: "Token has expired",
                    code: "TOKEN_EXPIRED",
                    expiredAt: err.expiredAt
                });
            }
            return res.status(401).json({
                message: "Invalid token",
                code: "TOKEN_INVALID"
            });
        }

        // 3. Check role claim
        if (decoded.role !== "SUPER_ADMIN") {
            return res.status(403).json({
                message: "Access denied. Super Admin role required.",
                code: "ROLE_FORBIDDEN"
            });
        }

        // 4. Verify admin exists and is active in DB
        const admin = await prisma.superAdmin.findUnique({
            where: { id: decoded.adminId }
        });

        if (!admin) {
            return res.status(403).json({
                message: "Access denied. Admin account not found.",
                code: "ACCOUNT_NOT_FOUND"
            });
        }

        if (!admin.isActive) {
            return res.status(403).json({
                message: "Access denied. Account is disabled.",
                code: "ACCOUNT_DISABLED"
            });
        }

        // 5. Attach admin info to request
        req.superAdmin = decoded;
        req.user = admin; // Full admin record for controllers needing admin.email etc.
        req.userRole = admin.role;

        // Throttled non-blocking lastActive update
        if (!admin.lastActive || (Date.now() - new Date(admin.lastActive).getTime() > 60 * 1000)) {
            prisma.superAdmin.update({
                where: { id: admin.id },
                data: { lastActive: new Date() }
            }).catch(err => console.error("Failed to update lastActive:", err.message));
        }

        next();
    } catch (err) {
        console.error("Auth middleware error:", err);
        return res.status(401).json({
            message: "Authentication failed",
            code: "AUTH_ERROR"
        });
    }
};

/**
 * Role-Based Access Control middleware
 * Restricts access to specified roles.
 * Must be used after requireSuperAdmin middleware.
 */
exports.requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: "Authentication required",
                code: "AUTH_REQUIRED"
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Access denied. Insufficient permissions.",
                code: "ROLE_FORBIDDEN"
            });
        }

        next();
    };
};
