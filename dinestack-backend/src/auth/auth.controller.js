const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const prisma = require("../prisma");
const { logAudit } = require("../utils/auditLogger");
const { BCRYPT_SALT_ROUNDS } = require("../utils/passwordPolicy");

// --- Constants ---
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;
const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

// --- Cookie Config ---
function getRefreshCookieOptions() {
    const isProduction = process.env.NODE_ENV === "production";
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",
        path: "/"
    };
}

function getAccessCookieOptions() {
    const isProduction = process.env.NODE_ENV === "production";
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",
        path: "/",
        maxAge: 15 * 60 * 1000 // 15 minutes in ms
    };
}

function getCsrfCookieOptions() {
    const isProduction = process.env.NODE_ENV === "production";
    return {
        httpOnly: false, // Accessible to client JS
        secure: isProduction,
        sameSite: "strict",
        path: "/"
    };
}

// --- Helpers ---
function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

function generateRefreshToken() {
    return crypto.randomBytes(64).toString("hex");
}

// --- Login ---
exports.loginSuperAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password required" });
        }

        // Always return generic error to prevent email enumeration
        const genericError = { message: "Invalid credentials" };

        const admin = await prisma.superAdmin.findUnique({
            where: { email }
        });

        if (!admin) {
            return res.status(401).json(genericError);
        }

        // Check if account is active
        if (!admin.isActive) {
            return res.status(401).json(genericError);
        }

        // Check if account is locked
        if (admin.lockUntil && admin.lockUntil > new Date()) {
            const remainingMs = admin.lockUntil.getTime() - Date.now();
            const remainingMin = Math.ceil(remainingMs / 60000);

            await logAudit(admin.id, "LOGIN_ATTEMPT_WHILE_LOCKED", {
                remainingMinutes: remainingMin
            });

            return res.status(423).json({
                message: "Account temporarily locked due to too many failed attempts",
                code: "ACCOUNT_LOCKED",
                lockUntil: admin.lockUntil.toISOString(),
                retryAfterMinutes: remainingMin
            });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, admin.passwordHash);

        if (!isMatch) {
            // Increment failed attempts
            const newFailedAttempts = admin.failedAttempts + 1;
            const updateData = { failedAttempts: newFailedAttempts };

            if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
                updateData.lockUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
                await logAudit(admin.id, "ACCOUNT_LOCKED", {
                    failedAttempts: newFailedAttempts,
                    lockDurationMinutes: LOCK_DURATION_MINUTES
                });
            }

            await prisma.superAdmin.update({
                where: { id: admin.id },
                data: updateData
            });

            await logAudit(admin.id, "LOGIN_FAILURE", {
                failedAttempts: newFailedAttempts
            });

            return res.status(401).json(genericError);
        }

        // --- Successful password verification ---

        // If 2FA is enabled, issue a temp token instead of a real session
        if (admin.twoFactorEnabled) {
            let bypass2FA = false;
            
            // Check for valid 2fa_remember cookie
            const rememberToken = req.cookies?.['2fa_remember'];
            if (rememberToken) {
                try {
                    const decoded = jwt.verify(rememberToken, process.env.JWT_SECRET);
                    if (decoded.adminId === admin.id && decoded.purpose === '2fa-remember') {
                        bypass2FA = true;
                    }
                } catch (err) {
                    // Token invalid or expired, do not bypass
                }
            }

            if (!bypass2FA) {
                const tempToken = jwt.sign(
                    { adminId: admin.id, purpose: "2fa-verify" },
                    process.env.JWT_SECRET,
                    { expiresIn: "5m" }
                );

                await logAudit(admin.id, "LOGIN_2FA_PENDING", null);

                // DO NOT reset failedAttempts or set lastLogin yet
                return res.json({
                    requires2FA: true,
                    tempToken
                });
            }
        }

        // --- No 2FA — create session normally ---

        // Reset failed attempts, clear lock, update lastLogin
        await prisma.superAdmin.update({
            where: { id: admin.id },
            data: {
                failedAttempts: 0,
                lockUntil: null,
                lastLogin: new Date()
            }
        });

        // Generate CSRF token
        const csrfToken = crypto.randomBytes(32).toString("hex");

        // Generate access token (short-lived)
        const accessToken = jwt.sign(
            { adminId: admin.id, role: "SUPER_ADMIN", subRole: admin.role, csrfToken, iss: "dinestack-admin", aud: "dinestack-api" },
            process.env.JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRY }
        );

        // Generate refresh token (long-lived, stored hashed in DB)
        const rawRefreshToken = generateRefreshToken();
        const refreshTokenHash = hashToken(rawRefreshToken);
        const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

        // Clean up expired refresh tokens first (avoid deleting other active devices!)
        await prisma.refreshToken.deleteMany({
            where: {
                OR: [
                    { expiresAt: { lt: new Date() } },
                    { adminId: admin.id, expiresAt: { lt: new Date() } } // cleanup helper
                ]
            }
        }).catch(err => console.error("Clean expired tokens failed:", err));

        // Store hashed refresh token along with metadata
        await prisma.refreshToken.create({
            data: {
                tokenHash: refreshTokenHash,
                adminId: admin.id,
                expiresAt: refreshExpiresAt,
                ipAddress: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
                userAgent: req.headers["user-agent"] || "unknown"
            }
        });

        await logAudit(admin.id, "LOGIN_SUCCESS", {
            ip: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
            userAgent: req.headers["user-agent"] || "unknown"
        });

        // Set tokens in httpOnly cookies and CSRF in standard cookie
        res.cookie("access_token", accessToken, getAccessCookieOptions());
        res.cookie("refresh_token", rawRefreshToken, getRefreshCookieOptions());
        res.cookie("csrf_token", csrfToken, getCsrfCookieOptions());

        // Return admin info in body (no raw token exposed)
        res.json({
            admin: {
                id: admin.id,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// --- Refresh Token ---
exports.refreshToken = async (req, res) => {
    try {
        const rawRefreshToken = req.cookies?.refresh_token;

        if (!rawRefreshToken) {
            return res.status(401).json({
                message: "Refresh token not provided",
                code: "REFRESH_TOKEN_MISSING"
            });
        }

        const tokenHash = hashToken(rawRefreshToken);

        // Find the stored token
        const storedToken = await prisma.refreshToken.findUnique({
            where: { tokenHash },
            include: { admin: true }
        });

        if (!storedToken) {
            return res.status(401).json({
                message: "Invalid refresh token",
                code: "REFRESH_TOKEN_INVALID"
            });
        }

        // Check expiry
        if (storedToken.expiresAt < new Date()) {
            // Clean up expired token
            await prisma.refreshToken.delete({ where: { id: storedToken.id } });
            return res.status(401).json({
                message: "Refresh token expired",
                code: "REFRESH_TOKEN_EXPIRED"
            });
        }

        // Check if admin is still active
        if (!storedToken.admin.isActive) {
            await prisma.refreshToken.delete({ where: { id: storedToken.id } });
            return res.status(401).json({
                message: "Account is disabled",
                code: "ACCOUNT_DISABLED"
            });
        }

        const currentIp = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
        if (storedToken.ipAddress && storedToken.ipAddress !== currentIp) {
            await logAudit(storedToken.adminId, "TOKEN_REFRESH_IP_MISMATCH", {
                oldIp: storedToken.ipAddress,
                newIp: currentIp
            }, "WARNING", "IP address changed during token refresh");
        }

        // --- Rotate refresh token ---
        // Delete old token
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });

        // Generate new refresh token
        const newRawRefreshToken = generateRefreshToken();
        const newRefreshTokenHash = hashToken(newRawRefreshToken);
        const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

        await prisma.refreshToken.create({
            data: {
                tokenHash: newRefreshTokenHash,
                adminId: storedToken.adminId,
                expiresAt: newExpiresAt,
                ipAddress: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
                userAgent: req.headers["user-agent"] || "unknown"
            }
        });

        // Generate CSRF token
        const csrfToken = crypto.randomBytes(32).toString("hex");

        // Generate new access token
        const accessToken = jwt.sign(
            { adminId: storedToken.adminId, role: "SUPER_ADMIN", subRole: storedToken.admin.role, csrfToken, iss: "dinestack-admin", aud: "dinestack-api" },
            process.env.JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRY }
        );

        await logAudit(storedToken.adminId, "TOKEN_REFRESH", null);

        // Set new tokens in cookies and CSRF in standard cookie
        res.cookie("access_token", accessToken, getAccessCookieOptions());
        res.cookie("refresh_token", newRawRefreshToken, getRefreshCookieOptions());
        res.cookie("csrf_token", csrfToken, getCsrfCookieOptions());

        // Return success message (no raw token exposed)
        res.json({
            message: "Token refreshed"
        });
    } catch (err) {
        console.error("Refresh token error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// --- Logout ---
exports.logoutSuperAdmin = async (req, res) => {
    try {
        const rawRefreshToken = req.cookies?.refresh_token;

        if (rawRefreshToken) {
            const tokenHash = hashToken(rawRefreshToken);
            // Delete stored refresh token
            await prisma.refreshToken.deleteMany({
                where: { tokenHash }
            });
        }

        // Also try to get adminId from access token for audit logging
        const accessToken = req.cookies?.access_token ||
            req.headers.authorization?.split(" ")[1];

        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
                await logAudit(decoded.adminId, "LOGOUT", null);
            } catch {
                // Token might be expired, that's fine for logout
            }
        }

        // Clear cookies
        res.clearCookie("access_token", { path: "/" });
        res.clearCookie("refresh_token", { path: "/" });
        res.clearCookie("csrf_token", { path: "/" });
        res.clearCookie("2fa_remember", { path: "/" });

        res.json({ message: "Logged out successfully" });
    } catch (err) {
        console.error("Logout error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// --- Session Management ---

// GET /super-admin/sessions
exports.getActiveSessions = async (req, res) => {
    try {
        const currentUser = req.user;
        let where = {};
        
        // If not OWNER, only show current user's sessions
        if (currentUser.role !== "OWNER") {
            where.adminId = currentUser.id;
        } else if (req.query.adminId) {
            // OWNER can filter by adminId
            where.adminId = req.query.adminId;
        }

        const sessions = await prisma.refreshToken.findMany({
            where,
            include: {
                admin: {
                    select: {
                        email: true,
                        role: true
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        const formatted = sessions.map(s => ({
            id: s.id,
            adminId: s.adminId,
            email: s.admin.email,
            role: s.admin.role,
            createdAt: s.createdAt,
            expiresAt: s.expiresAt,
            ipAddress: s.ipAddress || "unknown",
            userAgent: s.userAgent || "unknown",
            isCurrent: req.cookies?.refresh_token ? hashToken(req.cookies.refresh_token) === s.tokenHash : false
        }));

        res.json(formatted);
    } catch (err) {
        console.error("Get active sessions error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// POST /super-admin/sessions/revoke
exports.revokeSession = async (req, res) => {
    try {
        const { sessionId } = req.body;
        const currentUser = req.user;

        if (!sessionId) {
            return res.status(400).json({ message: "Session ID required" });
        }

        const session = await prisma.refreshToken.findUnique({
            where: { id: sessionId },
            include: { admin: true }
        });

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        // Restrict non-owners to their own sessions
        if (currentUser.role !== "OWNER" && session.adminId !== currentUser.id) {
            return res.status(403).json({ message: "Unauthorized to revoke this session" });
        }

        await prisma.refreshToken.delete({
            where: { id: sessionId }
        });

        await logAudit(currentUser.id, "SESSION_REVOKE", {
            targetAdminId: session.adminId,
            targetEmail: session.admin.email,
            ip: session.ipAddress
        });

        res.json({ success: true, message: "Session revoked successfully" });
    } catch (err) {
        console.error("Revoke session error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// POST /super-admin/sessions/revoke-all
exports.revokeAllSessions = async (req, res) => {
    try {
        const { adminId } = req.body;
        const currentUser = req.user;
        
        let targetAdminId = adminId || currentUser.id;

        // Restrict non-owners to their own sessions
        if (currentUser.role !== "OWNER" && targetAdminId !== currentUser.id) {
            return res.status(403).json({ message: "Unauthorized to revoke sessions for this user" });
        }

        const targetUser = await prisma.superAdmin.findUnique({
            where: { id: targetAdminId }
        });

        if (!targetUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Delete all active refresh tokens for the target user
        await prisma.refreshToken.deleteMany({
            where: { adminId: targetAdminId }
        });

        await logAudit(currentUser.id, "SESSION_REVOKE_ALL", {
            targetAdminId,
            targetEmail: targetUser.email
        });

        res.json({ success: true, message: "All sessions revoked successfully" });
    } catch (err) {
        console.error("Revoke all sessions error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
