const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');

const requireSuperAdmin = [
    // Middleware to verify the Clerk session token
    // Explicitly pass the secret key to ensure it's picked up even if process.env is lazy
    ClerkExpressRequireAuth({
        secretKey: process.env.CLERK_SECRET_KEY
    }),

    // Custom middleware to enforce security policies
    (req, res, next) => {
        // 1. Verify Authentication
        if (!req.auth || !req.auth.userId) {
            console.error("[AuthGuard] No auth session found. Clerk middleware might have failed or passed without user.");
            return res.status(401).json({
                message: "Unauthorized: No valid session found",
                code: "AUTH_MISSING"
            });
        }

        const { sessionClaims } = req.auth;

        // 2. Primary Access Control: Role Check
        const role = sessionClaims?.metadata?.role || sessionClaims?.role; // Fallback to various claim paths

        // 3. Secondary Access Control: Strict Email Domain
        // IMPORTANT: User must match one of these to access the system.
        const email = sessionClaims?.email || sessionClaims?.primary_email_address || sessionClaims?.user?.email;

        const isSuperAdmin = role === 'super_admin';
        const isInternalEmail = email && email.endsWith('@dinestack.in');

        if (isSuperAdmin || isInternalEmail) {
            // Log successful access for audit (optional, avoid spamming logs)
            // console.log(`[AuthGuard] Authorized access: ${email} (${role})`);
            return next();
        }

        // 4. Deny Access - Strict Lockout
        console.warn(`[AuthGuard] ⛔ ACCESS DENIED for user ${req.auth.userId}. Email: ${email}, Role: ${role}. REASON: Not in allowlist.`);

        return res.status(403).json({
            message: "Access Denied: You are not authorized to use this system. Please contact the administrator.",
            code: "ACCESS_FORBIDDEN_POLICY",
            details: "Your email or role is not allowlisted."
        });
    }
];

exports.requireSuperAdmin = requireSuperAdmin;
