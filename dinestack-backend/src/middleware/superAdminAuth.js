const jwt = require("jsonwebtoken");
const prisma = require("../prisma");


const requireSuperAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: "Authorization header missing" });
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "Token missing" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if user is actually a SuperAdmin
        if (!decoded.adminId || decoded.role !== 'SUPER_ADMIN') {
            // Fallback: check DB if role claim isn't in token, or just enforce strict token structure
            // For now, let's assume standard generic structure, but we should verify against SuperAdmin table
            // to allow for invalidation/deletion of admins.
        }

        const superAdmin = await prisma.superAdmin.findUnique({
            where: { id: decoded.adminId }
        });

        if (!superAdmin) {
            return res.status(403).json({ message: "Access denied. Valid Super Admin required." });
        }

        req.user = superAdmin;
        req.userRole = 'SUPER_ADMIN';
        next();
    } catch (error) {
        console.error("Super Admin Auth Error:", error);
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

module.exports = requireSuperAdmin;
