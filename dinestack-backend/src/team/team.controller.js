const prisma = require("../prisma");
const bcrypt = require("bcrypt");
const { validatePassword, BCRYPT_SALT_ROUNDS } = require("../utils/passwordPolicy");

// GET /api/super-admin/team
exports.getAllTeamMembers = async (req, res) => {
    try {
        const team = await prisma.superAdmin.findMany({
            select: {
                id: true,
                email: true,
                role: true,
                isActive: true,
                lastActive: true,
                lastLogin: true,
                twoFactorEnabled: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: {
                createdAt: "desc"
            }
        });
        res.json(team);
    } catch (error) {
        console.error("Get team members error:", error);
        res.status(500).json({ message: "Failed to fetch team members" });
    }
};

// POST /api/super-admin/team
exports.createTeamMember = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({ message: "Email, password, and role are required" });
        }

        const trimmedEmail = email.toLowerCase().trim();

        if (!["OWNER", "MANAGER", "INTERN"].includes(role)) {
            return res.status(400).json({ message: "Invalid role. Must be OWNER, MANAGER, or INTERN" });
        }

        // Validate password policy
        const passwordCheck = validatePassword(password);
        if (!passwordCheck.valid) {
            return res.status(400).json({ 
                message: "Password does not meet requirements", 
                errors: passwordCheck.errors 
            });
        }

        // Check if user already exists
        const existing = await prisma.superAdmin.findUnique({
            where: { email: trimmedEmail }
        });

        if (existing) {
            return res.status(409).json({ message: "A staff member with this email already exists" });
        }

        const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

        const newMember = await prisma.superAdmin.create({
            data: {
                email: trimmedEmail,
                passwordHash,
                role,
                isActive: true
            },
            select: {
                id: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true
            }
        });

        // Write Audit Log with SECURITY severity
        const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
        const ua = req.headers["user-agent"] || "unknown";
        const details = `Created staff member ${newMember.email} with role ${role}. [IP: ${ip}] [UA: ${ua}]`;

        await prisma.auditLog.create({
            data: {
                action: "TEAM_CREATE",
                actor: req.user.email,
                target: `SuperAdmin:${newMember.id}`,
                details,
                severity: "SECURITY"
            }
        });

        res.status(201).json(newMember);
    } catch (error) {
        console.error("Create team member error:", error);
        res.status(500).json({ message: "Failed to create team member" });
    }
};

// PUT /api/super-admin/team/:id
exports.updateTeamMember = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, isActive, password } = req.body;

        const targetUser = await prisma.superAdmin.findUnique({
            where: { id }
        });

        if (!targetUser) {
            return res.status(404).json({ message: "Staff member not found" });
        }

        // Prevent non-OWNER from modifying OWNER accounts
        if (req.user.role !== 'OWNER' && targetUser.role === 'OWNER') {
            return res.status(403).json({ message: "Cannot modify an OWNER account" });
        }

        const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
        const ua = req.headers["user-agent"] || "unknown";

        const updateData = {};
        let shouldRevokeSessions = false;
        let auditDetails = [];

        // 1. Handle Role Change
        if (role !== undefined) {
            if (!["OWNER", "MANAGER", "INTERN"].includes(role)) {
                return res.status(400).json({ message: "Invalid role. Must be OWNER, MANAGER, or INTERN" });
            }

            if (id === req.user.id && role !== targetUser.role) {
                return res.status(400).json({ message: "You cannot change your own role" });
            }

            // Prevent non-OWNER from assigning OWNER role
            if (role === 'OWNER' && req.user.role !== 'OWNER') {
                return res.status(403).json({ message: "Only OWNER can assign OWNER role" });
            }

            if (role !== targetUser.role) {
                updateData.role = role;
                shouldRevokeSessions = true;
                auditDetails.push(`changed role from ${targetUser.role} to ${role}`);
            }
        }

        // 2. Handle Status (Deactivation)
        if (isActive !== undefined) {
            if (typeof isActive !== "boolean") {
                return res.status(400).json({ message: "isActive must be a boolean" });
            }

            if (id === req.user.id && isActive === false) {
                return res.status(400).json({ message: "You cannot deactivate your own account" });
            }

            if (isActive !== targetUser.isActive) {
                updateData.isActive = isActive;
                if (isActive === false) {
                    shouldRevokeSessions = true;
                }
                auditDetails.push(isActive ? "activated account" : "deactivated account");
            }
        }

        // 3. Handle Password Reset
        if (password !== undefined && password !== "") {
            const passwordCheck = validatePassword(password);
            if (!passwordCheck.valid) {
                return res.status(400).json({ 
                    message: "Password does not meet requirements", 
                    errors: passwordCheck.errors 
                });
            }

            const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
            updateData.passwordHash = passwordHash;
            shouldRevokeSessions = true;
            auditDetails.push("reset password");
        }

        // If no actual changes, just return the user
        if (Object.keys(updateData).length === 0) {
            const { passwordHash, ...rest } = targetUser;
            return res.json(rest);
        }

        // Perform Database Update
        const updatedUser = await prisma.superAdmin.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                email: true,
                role: true,
                isActive: true,
                lastActive: true,
                lastLogin: true,
                twoFactorEnabled: true,
                createdAt: true,
                updatedAt: true
            }
        });

        // Revoke active sessions if role/status/password changed
        if (shouldRevokeSessions) {
            await prisma.refreshToken.deleteMany({
                where: { adminId: id }
            });
            auditDetails.push("revoked all active sessions");
        }

        // Write Audit Log
        const actionDetails = `Updated staff member ${targetUser.email}: ${auditDetails.join(", ")}. [IP: ${ip}] [UA: ${ua}]`;
        await prisma.auditLog.create({
            data: {
                action: "TEAM_UPDATE",
                actor: req.user.email,
                target: `SuperAdmin:${id}`,
                details: actionDetails,
                severity: "SECURITY"
            }
        });

        res.json(updatedUser);
    } catch (error) {
        console.error("Update team member error:", error);
        res.status(500).json({ message: "Failed to update team member" });
    }
};

// DELETE /api/super-admin/team/:id
exports.deleteTeamMember = async (req, res) => {
    try {
        const { id } = req.params;

        const targetUser = await prisma.superAdmin.findUnique({
            where: { id }
        });

        if (!targetUser) {
            return res.status(404).json({ message: "Staff member not found" });
        }

        if (targetUser.isActive) {
            return res.status(400).json({ message: "Only suspended staff members can be deleted" });
        }

        if (id === req.user.id) {
            return res.status(400).json({ message: "You cannot delete your own account" });
        }

        // Delete user
        await prisma.superAdmin.delete({
            where: { id }
        });

        const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
        const ua = req.headers["user-agent"] || "unknown";
        const details = `Deleted staff member ${targetUser.email}. [IP: ${ip}] [UA: ${ua}]`;

        await prisma.auditLog.create({
            data: {
                action: "TEAM_DELETE",
                actor: req.user.email,
                target: `SuperAdmin:${id}`,
                details,
                severity: "SECURITY"
            }
        });

        res.json({ message: "Staff member deleted successfully", email: targetUser.email });
    } catch (error) {
        console.error("Delete team member error:", error);
        res.status(500).json({ message: "Failed to delete team member" });
    }
};
