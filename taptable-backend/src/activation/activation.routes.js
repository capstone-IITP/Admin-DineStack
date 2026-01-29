const express = require("express");
const router = express.Router();

const { createActivationCode, getAllActivationCodes, deleteActivationCode } = require("./activation.controller");
const { requireSuperAdmin } = require("../auth/auth.middleware");

router.post("/", requireSuperAdmin, createActivationCode);
router.get("/", requireSuperAdmin, getAllActivationCodes);
router.delete("/:id", requireSuperAdmin, deleteActivationCode);

module.exports = router;
