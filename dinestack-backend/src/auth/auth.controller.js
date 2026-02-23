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
        path: "/",
        maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000 // 7 days in ms
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

        // Generate access token (short-lived)
        const accessToken = jwt.sign(
            { adminId: admin.id, role: "SUPER_ADMIN" },
            process.env.JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRY }
        );

        // Generate refresh token (long-lived, stored hashed in DB)
        const rawRefreshToken = generateRefreshToken();
        const refreshTokenHash = hashToken(rawRefreshToken);
        const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

        // Clean up old refresh tokens for this admin (optional: keep max 5)
        await prisma.refreshToken.deleteMany({
            where: { adminId: admin.id }
        });

        // Store hashed refresh token
        await prisma.refreshToken.create({
            data: {
                tokenHash: refreshTokenHash,
                adminId: admin.id,
                expiresAt: refreshExpiresAt
            }
        });

        await logAudit(admin.id, "LOGIN_SUCCESS", null);

        // Set tokens in httpOnly cookies
        res.cookie("access_token", accessToken, getAccessCookieOptions());
        res.cookie("refresh_token", rawRefreshToken, getRefreshCookieOptions());

        // Return access token in body (for Authorization header usage)
        // Refresh token is NEVER returned in the JSON body — only via cookie
        res.json({
            token: accessToken,
            admin: {
                id: admin.id,
                email: admin.email
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
                expiresAt: newExpiresAt
            }
        });

        // Generate new access token
        const accessToken = jwt.sign(
            { adminId: storedToken.adminId, role: "SUPER_ADMIN" },
            process.env.JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRY }
        );

        await logAudit(storedToken.adminId, "TOKEN_REFRESH", null);

        // Set new tokens in cookies
        res.cookie("access_token", accessToken, getAccessCookieOptions());
        res.cookie("refresh_token", newRawRefreshToken, getRefreshCookieOptions());

        // Return access token in body (for Authorization header usage)
        // Refresh token is NEVER in the body
        res.json({
            token: accessToken,
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

        res.json({ message: "Logged out successfully" });
    } catch (err) {
        console.error("Logout error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
