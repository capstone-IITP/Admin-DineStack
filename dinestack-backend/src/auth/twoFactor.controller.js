/**
 * Two-Factor Authentication Controller
 *
 * Endpoints:
 *   POST /2fa/setup         — Generate TOTP secret + QR (only time secret is shown)
 *   POST /2fa/verify-setup  — Verify first OTP to activate 2FA, return backup codes
 *   POST /2fa/verify-login  — Verify OTP during login (temp-token auth via header)
 *   POST /2fa/disable       — Disable 2FA (requires password + OTP)
 *   GET  /2fa/status        — Check 2FA status
 */

const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const prisma = require("../prisma");
const { encrypt, decrypt } = require("../utils/crypto");
const { logAudit } = require("../utils/auditLogger");

// --- Constants ---
const MAX_OTP_ATTEMPTS = 5;
const OTP_BLOCK_DURATION_MINUTES = 10;
const BACKUP_CODE_COUNT = 8;
const BCRYPT_SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

// --- Helpers ---
function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

function generateRefreshToken() {
    return crypto.randomBytes(64).toString("hex");
}

function getRefreshCookieOptions() {
    const isProduction = process.env.NODE_ENV === "production";
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",
        path: "/",
        maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    };
}

function getAccessCookieOptions() {
    const isProduction = process.env.NODE_ENV === "production";
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",
        path: "/",
        maxAge: 15 * 60 * 1000
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

/**
 * Log security event with IP and user-agent.
 */
async function logSecurityEvent(adminId, action, req, metadata = null) {
    try {
        const admin = await prisma.superAdmin.findUnique({
            where: { id: adminId },
            select: { email: true }
        });
        const actor = admin ? admin.email : adminId;

        await prisma.auditLog.create({
            data: {
                actor,
                action,
                severity: "SECURITY",
                details: `Security Event: ${action}`,
                ipAddress: req.ip || req.headers["x-forwarded-for"] || "unknown",
                userAgent: req.headers["user-agent"] || "unknown",
                metadata: metadata ? (typeof metadata === "string" ? metadata : JSON.stringify(metadata)) : null
            }
        });
    } catch (err) {
        console.error("Security audit log write failed:", err.message);
    }
}

/**
 * Check if admin is OTP-blocked. Returns remaining minutes or null.
 */
function getOtpBlockRemaining(admin) {
    if (admin.otpBlockedUntil && admin.otpBlockedUntil > new Date()) {
        const remainingMs = admin.otpBlockedUntil.getTime() - Date.now();
        return Math.ceil(remainingMs / 60000);
    }
    return null;
}

// ============================================================================
// POST /2fa/setup — Generate TOTP secret + QR code
// ============================================================================
exports.setup2FA = async (req, res) => {
    try {
        const adminId = req.superAdmin.adminId;

        const admin = await prisma.superAdmin.findUnique({
            where: { id: adminId }
        });

        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        if (admin.twoFactorEnabled) {
            return res.status(400).json({
                message: "2FA is already enabled. Disable it first to reconfigure."
            });
        }

        // Generate TOTP secret
        const secret = speakeasy.generateSecret({
            name: `DineStack Admin (${admin.email})`,
            length: 20
        });

        // Generate QR code as data URL
        const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

        // Store encrypted secret (but don't enable yet)
        await prisma.superAdmin.update({
            where: { id: adminId },
            data: {
                twoFactorSecret: encrypt(secret.base32)
            }
        });

        await logSecurityEvent(adminId, "2FA_SETUP_INITIATED", req);

        // This is the ONLY time the secret and QR are sent to the client
        res.json({
            qrCode: qrCodeDataUrl,
            manualKey: secret.base32,
            message: "Scan the QR code with your authenticator app, then verify with a 6-digit code."
        });
    } catch (err) {
        console.error("2FA setup error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// ============================================================================
// POST /2fa/verify-setup — Verify first OTP to activate 2FA
// ============================================================================
exports.verifySetup2FA = async (req, res) => {
    try {
        const adminId = req.superAdmin.adminId;
        const { otp } = req.body;

        if (!otp || otp.length !== 6) {
            return res.status(400).json({ message: "A valid 6-digit code is required" });
        }

        const admin = await prisma.superAdmin.findUnique({
            where: { id: adminId }
        });

        if (!admin || !admin.twoFactorSecret) {
            return res.status(400).json({ message: "2FA setup not initiated. Call /2fa/setup first." });
        }

        if (admin.twoFactorEnabled) {
            return res.status(400).json({ message: "2FA is already enabled." });
        }

        // Decrypt and verify
        const decryptedSecret = decrypt(admin.twoFactorSecret);

        const verified = speakeasy.totp.verify({
            secret: decryptedSecret,
            encoding: "base32",
            token: otp,
            window: 1
        });

        if (!verified) {
            await logSecurityEvent(adminId, "2FA_SETUP_VERIFY_FAILED", req);
            return res.status(401).json({ message: "Invalid code. Please try again." });
        }

        // Generate backup codes
        const plainBackupCodes = [];
        const hashedBackupCodes = [];

        for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
            const code = crypto.randomBytes(4).toString("hex"); // 8-char hex codes
            plainBackupCodes.push(code);
            const hash = await bcrypt.hash(code, BCRYPT_SALT_ROUNDS);
            hashedBackupCodes.push(hash);
        }

        // Enable 2FA
        await prisma.superAdmin.update({
            where: { id: adminId },
            data: {
                twoFactorEnabled: true,
                twoFactorEnabledAt: new Date(),
                twoFactorBackupCodes: hashedBackupCodes,
                otpAttempts: 0,
                otpBlockedUntil: null
            }
        });

        await logSecurityEvent(adminId, "2FA_ENABLED", req);

        // Return plain backup codes (shown only once)
        res.json({
            message: "2FA has been enabled successfully.",
            backupCodes: plainBackupCodes,
            warning: "Save these backup codes in a secure place. They will NOT be shown again."
        });
    } catch (err) {
        console.error("2FA verify-setup error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// ============================================================================
// POST /2fa/verify-login — Verify OTP during login (temp token via header)
// ============================================================================
exports.verifyLogin2FA = async (req, res) => {
    try {
        // 1. Extract temp token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Temp token required in Authorization header",
                code: "TEMP_TOKEN_MISSING"
            });
        }

        const tempToken = authHeader.split(" ")[1];

        // 2. Verify temp token
        let decoded;
        try {
            decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === "TokenExpiredError") {
                return res.status(401).json({
                    message: "Verification session expired. Please login again.",
                    code: "TEMP_TOKEN_EXPIRED"
                });
            }
            return res.status(401).json({
                message: "Invalid verification token",
                code: "TEMP_TOKEN_INVALID"
            });
        }

        // 3. Validate purpose
        if (decoded.purpose !== "2fa-verify") {
            return res.status(401).json({
                message: "Invalid token purpose",
                code: "INVALID_TOKEN_PURPOSE"
            });
        }

        const adminId = decoded.adminId;
        const { otp } = req.body;

        if (!otp) {
            return res.status(400).json({ message: "OTP or backup code is required" });
        }

        const admin = await prisma.superAdmin.findUnique({
            where: { id: adminId }
        });

        if (!admin || !admin.twoFactorEnabled || !admin.twoFactorSecret) {
            return res.status(400).json({ message: "2FA is not configured for this account" });
        }

        // 4. Check OTP rate limiting
        const blockRemaining = getOtpBlockRemaining(admin);
        if (blockRemaining) {
            await logSecurityEvent(adminId, "2FA_OTP_BLOCKED", req, {
                remainingMinutes: blockRemaining
            });
            return res.status(423).json({
                message: "Too many failed attempts. Please try again later.",
                code: "OTP_BLOCKED",
                retryAfterMinutes: blockRemaining
            });
        }

        // 5. Try TOTP verification first
        const decryptedSecret = decrypt(admin.twoFactorSecret);
        const totpVerified = speakeasy.totp.verify({
            secret: decryptedSecret,
            encoding: "base32",
            token: otp,
            window: 1
        });

        // 6. If TOTP fails, try backup code
        let backupCodeUsed = false;
        if (!totpVerified) {
            // Try each backup code
            for (let i = 0; i < admin.twoFactorBackupCodes.length; i++) {
                const isMatch = await bcrypt.compare(otp, admin.twoFactorBackupCodes[i]);
                if (isMatch) {
                    backupCodeUsed = true;
                    // Remove the used backup code
                    const updatedCodes = [...admin.twoFactorBackupCodes];
                    updatedCodes.splice(i, 1);
                    await prisma.superAdmin.update({
                        where: { id: adminId },
                        data: { twoFactorBackupCodes: updatedCodes }
                    });
                    await logSecurityEvent(adminId, "2FA_BACKUP_CODE_USED", req, {
                        remainingCodes: updatedCodes.length
                    });
                    break;
                }
            }

            // Neither TOTP nor backup code matched
            if (!backupCodeUsed) {
                const newAttempts = admin.otpAttempts + 1;
                const updateData = { otpAttempts: newAttempts };

                if (newAttempts >= MAX_OTP_ATTEMPTS) {
                    updateData.otpBlockedUntil = new Date(
                        Date.now() + OTP_BLOCK_DURATION_MINUTES * 60 * 1000
                    );
                    await logSecurityEvent(adminId, "2FA_OTP_BLOCKED", req, {
                        failedAttempts: newAttempts,
                        blockDurationMinutes: OTP_BLOCK_DURATION_MINUTES
                    });
                }

                await prisma.superAdmin.update({
                    where: { id: adminId },
                    data: updateData
                });

                await logSecurityEvent(adminId, "2FA_OTP_FAILED", req, {
                    failedAttempts: newAttempts
                });

                return res.status(401).json({
                    message: "Invalid code. Please try again.",
                    attemptsRemaining: Math.max(0, MAX_OTP_ATTEMPTS - newAttempts)
                });
            }
        }

        // 7. OTP verified — create real session
        // Reset OTP attempts, failed login attempts, update lastLogin
        await prisma.superAdmin.update({
            where: { id: adminId },
            data: {
                otpAttempts: 0,
                otpBlockedUntil: null,
                failedAttempts: 0,
                lockUntil: null,
                lastLogin: new Date()
            }
        });

        // Generate CSRF token
        const csrfToken = crypto.randomBytes(32).toString("hex");

        // Generate access token
        const accessToken = jwt.sign(
            { adminId: admin.id, role: "SUPER_ADMIN", subRole: admin.role, csrfToken },
            process.env.JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRY }
        );

        // Generate refresh token
        const rawRefreshToken = generateRefreshToken();
        const refreshTokenHash = hashToken(rawRefreshToken);
        const refreshExpiresAt = new Date(
            Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
        );

        // Clean up expired refresh tokens first
        await prisma.refreshToken.deleteMany({
            where: {
                OR: [
                    { expiresAt: { lt: new Date() } },
                    { adminId: admin.id, expiresAt: { lt: new Date() } }
                ]
            }
        }).catch(err => console.error("Clean expired 2fa tokens failed:", err));

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

        await logSecurityEvent(adminId, "2FA_OTP_VERIFIED", req, {
            method: backupCodeUsed ? "backup_code" : "totp"
        });
        await logAudit(adminId, "LOGIN_SUCCESS", {
            via: "2FA",
            ip: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
            userAgent: req.headers["user-agent"] || "unknown"
        });

        // Set tokens in httpOnly cookies and CSRF in standard cookie
        res.cookie("access_token", accessToken, getAccessCookieOptions());
        res.cookie("refresh_token", rawRefreshToken, getRefreshCookieOptions());
        res.cookie("csrf_token", csrfToken, getCsrfCookieOptions());

        res.json({
            admin: {
                id: admin.id,
                email: admin.email,
                role: admin.role
            },
            ...(backupCodeUsed && {
                warning: `Backup code used. ${admin.twoFactorBackupCodes.length - 1} codes remaining.`
            })
        });
    } catch (err) {
        console.error("2FA verify-login error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// ============================================================================
// POST /2fa/disable — Disable 2FA (requires password + OTP)
// ============================================================================
exports.disable2FA = async (req, res) => {
    try {
        const adminId = req.superAdmin.adminId;
        const { password, otp } = req.body;

        if (!password || !otp) {
            return res.status(400).json({ message: "Password and OTP are required" });
        }

        const admin = await prisma.superAdmin.findUnique({
            where: { id: adminId }
        });

        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        if (!admin.twoFactorEnabled) {
            return res.status(400).json({ message: "2FA is not enabled" });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, admin.passwordHash);
        if (!passwordMatch) {
            await logSecurityEvent(adminId, "2FA_DISABLE_FAILED", req, {
                reason: "invalid_password"
            });
            return res.status(401).json({ message: "Invalid password" });
        }

        // Verify OTP
        const decryptedSecret = decrypt(admin.twoFactorSecret);
        const verified = speakeasy.totp.verify({
            secret: decryptedSecret,
            encoding: "base32",
            token: otp,
            window: 1
        });

        if (!verified) {
            await logSecurityEvent(adminId, "2FA_DISABLE_FAILED", req, {
                reason: "invalid_otp"
            });
            return res.status(401).json({ message: "Invalid OTP" });
        }

        // Disable 2FA — clear all fields
        await prisma.superAdmin.update({
            where: { id: adminId },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
                twoFactorBackupCodes: [],
                twoFactorEnabledAt: null,
                otpAttempts: 0,
                otpBlockedUntil: null
            }
        });

        await logSecurityEvent(adminId, "2FA_DISABLED", req);

        res.json({ message: "2FA has been disabled successfully." });
    } catch (err) {
        console.error("2FA disable error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// ============================================================================
// GET /2fa/status — Check 2FA status
// ============================================================================
exports.get2FAStatus = async (req, res) => {
    try {
        const adminId = req.superAdmin.adminId;

        const admin = await prisma.superAdmin.findUnique({
            where: { id: adminId },
            select: {
                twoFactorEnabled: true,
                twoFactorEnabledAt: true,
                twoFactorBackupCodes: true
            }
        });

        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        res.json({
            enabled: admin.twoFactorEnabled,
            enabledAt: admin.twoFactorEnabledAt,
            backupCodesRemaining: admin.twoFactorBackupCodes?.length || 0
        });
    } catch (err) {
        console.error("2FA status error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
