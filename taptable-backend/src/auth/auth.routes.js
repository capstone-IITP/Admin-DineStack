const express = require("express");
const router = express.Router();
const { loginSuperAdmin } = require("./auth.controller");

router.post("/login", loginSuperAdmin);

module.exports = router;
