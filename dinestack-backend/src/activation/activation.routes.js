const express = require("express");
const router = express.Router();

const { createActivationCode, getAllActivationCodes, deleteActivationCode } = require("./activation.controller");
const { requireSuperAdmin, requireRole } = require("../auth/auth.middleware");

// All activation code management requires OWNER or MANAGER role
router.use(requireSuperAdmin);
router.use(requireRole(["OWNER", "MANAGER"]));

router.post("/", createActivationCode);
router.get("/", getAllActivationCodes);
router.delete("/:id", deleteActivationCode); // Soft invalidation in controller

module.exports = router;
