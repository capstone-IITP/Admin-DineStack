const jwt = require("jsonwebtoken");

exports.requireSuperAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: "Authorization header missing",
            code: "AUTH_HEADER_MISSING"
        });
    }

    if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Invalid authorization format. Expected: Bearer <token>",
            code: "AUTH_FORMAT_INVALID"
        });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Token not provided",
            code: "TOKEN_MISSING"
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== "SUPER_ADMIN") {
            return res.status(403).json({
                message: "Access denied. Super Admin role required.",
                code: "ROLE_FORBIDDEN"
            });
        }

        req.superAdmin = decoded;
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({
                message: "Token has expired. Please login again.",
                code: "TOKEN_EXPIRED",
                expiredAt: err.expiredAt
            });
        }
        if (err.name === "JsonWebTokenError") {
            return res.status(401).json({
                message: "Invalid token",
                code: "TOKEN_INVALID"
            });
        }
        return res.status(401).json({
            message: "Token verification failed",
            code: "TOKEN_ERROR"
        });
    }
};
