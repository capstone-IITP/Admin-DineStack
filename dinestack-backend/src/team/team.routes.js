const express = require("express");
const { z } = require("zod");
const router = Router = express.Router();
const { getAllTeamMembers, createTeamMember, updateTeamMember, deleteTeamMember } = require("./team.controller");
const { requireSuperAdmin, requireRole } = require("../auth/auth.middleware");
const { validate } = require("../middleware/validation.middleware");
const { adminWriteLimiter } = require("../middleware/rate-limit.middleware");

// Validation Schemas
const createTeamSchema = {
    body: z.object({
        email: z.string().email("Invalid email format"),
        password: z.string().min(12, "Password must be at least 12 characters"),
        role: z.enum(["OWNER", "MANAGER", "INTERN"])
    })
};

const updateTeamSchema = {
    params: z.object({
        id: z.string().uuid("Invalid Staff ID format")
    }),
    body: z.object({
        role: z.enum(["OWNER", "MANAGER", "INTERN"]).optional(),
        isActive: z.boolean().optional(),
        password: z.string().min(12, "Password must be at least 12 characters").optional().or(z.literal(""))
    })
};

const deleteTeamSchema = {
    params: z.object({
        id: z.string().uuid("Invalid Staff ID format")
    })
};

// All team routes require super admin session AND OWNER role
router.use(requireSuperAdmin);
router.use(requireRole(["OWNER"]));

// Endpoints
router.get("/", getAllTeamMembers);
router.post("/", adminWriteLimiter, validate(createTeamSchema), createTeamMember);
router.put("/:id", adminWriteLimiter, validate(updateTeamSchema), updateTeamMember);
router.delete("/:id", adminWriteLimiter, validate(deleteTeamSchema), deleteTeamMember);

module.exports = router;
