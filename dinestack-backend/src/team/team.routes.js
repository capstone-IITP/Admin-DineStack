const express = require("express");
const router = express.Router();
const { getAllTeamMembers, createTeamMember, updateTeamMember, deleteTeamMember } = require("./team.controller");
const { requireSuperAdmin, requireRole } = require("../auth/auth.middleware");

// All team routes require super admin session AND OWNER role
router.use(requireSuperAdmin);
router.use(requireRole(["OWNER"]));

// Endpoints
router.get("/", getAllTeamMembers);
router.post("/", createTeamMember);
router.put("/:id", updateTeamMember);
router.delete("/:id", deleteTeamMember);

module.exports = router;
