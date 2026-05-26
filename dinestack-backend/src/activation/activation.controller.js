const prisma = require("../prisma");
const generateCode = require("./code.util");
const bcrypt = require("bcrypt");

exports.createActivationCode = async (req, res) => {
    try {
        const { restaurantId, plan, durationDays, maxTables } = req.body;

        if (!restaurantId || !plan || !durationDays || !maxTables) {
            return res.status(400).json({ message: "All fields are required (restaurantId, plan, duration, maxTables)" });
        }

        // Verify restaurant exists
        const restaurant = await prisma.restaurant.findUnique({
            where: { id: restaurantId },
            include: { ActivationCode: true }
        });

        if (!restaurant) {
            return res.status(404).json({ message: "Restaurant entity not found" });
        }

        if (restaurant.ActivationCode && restaurant.ActivationCode.status === 'ACTIVE' && !restaurant.ActivationCode.isUsed) {
            return res.status(409).json({
                message: "Restaurant already has an active, unused activation code",
                code: restaurant.ActivationCode.code
            });
        }

        const code = generateCode();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);

        const activationCode = await prisma.activationCode.create({
            data: {
                code,
                restaurantId, // Direct linkage
                entityName: restaurant.name, // Keep for backward compat
                plan,
                durationDays,
                maxTables,
                expiresAt,
            },
        });

        await prisma.auditLog.create({
            data: {
                action: 'KEY_GENERATE',
                actor: req.user.email,
                target: `Restaurant:${restaurantId}`,
                details: `Generated activation code ${code} for plan ${plan}`,
                severity: 'INFO'
            }
        });

        res.status(201).json(activationCode);
    } catch (error) {
        console.error(error);
        if (error.code === 'P2002') {
            return res.status(409).json({ message: "Restaurant already has an activation code assigned" });
        }
        res.status(500).json({ message: "Failed to create activation code" });
    }
};

exports.getAllActivationCodes = async (req, res) => {
    try {
        const codes = await prisma.activationCode.findMany({
            orderBy: { createdAt: "desc" },
            include: { Restaurant: true } // Include linked restaurant details
        });
        res.json(codes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch activation codes" });
    }
};

exports.deleteActivationCode = async (req, res) => {
    try {
        const { id } = req.params;
        const code = await prisma.activationCode.findUnique({ where: { id } });
        if (!code) {
            return res.status(404).json({ message: "Activation code not found" });
        }

        await prisma.$transaction(async (tx) => {
            // 1. Clear circular FK reference in Restaurant
            await tx.restaurant.updateMany({
                where: { activationCodeId: id },
                data: { activationCodeId: null }
            });

            // 2. Hard delete ActivationCode
            await tx.activationCode.delete({
                where: { id }
            });

            // 3. Log hard delete audit
            await tx.auditLog.create({
                data: {
                    action: 'KEY_DELETE',
                    actor: req.user.email,
                    target: `ActivationCode:${code.code}`,
                    details: `Hard deleted activation key for restaurant ID ${code.restaurantId}`,
                    severity: 'CRITICAL'
                }
            });
        });

        res.json({ message: "Activation code deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to delete activation code" });
    }
};

exports.activateDevice = async (req, res) => {
    try {
        const { activationCode } = req.body;

        if (!activationCode) {
            return res.status(400).json({ error: "Activation code is required" });
        }

        // 1. Find the code details
        const codeRecord = await prisma.activationCode.findUnique({
            where: { code: activationCode },
            include: { restaurant: true } // Fetch linked restaurant immediately
        });

        if (!codeRecord) {
            return res.status(401).json({ error: "Invalid activation code" });
        }

        // 2. Security Checks
        if (codeRecord.isUsed) {
            return res.status(409).json({ error: "Activation code already used" });
        }

        if (new Date() > new Date(codeRecord.expiresAt)) {
            return res.status(401).json({ error: "Activation code expired" });
        }

        if (codeRecord.status === 'INVALIDATED') {
            return res.status(401).json({ error: "Activation code has been invalidated" });
        }

        // 3. Verify restaurant linkage (must exist from license generation)
        if (!codeRecord.restaurant) {
            return res.status(500).json({ error: "Activation code is not linked to a valid restaurant entity" });
        }

        // 4. Verify restaurant is in an activatable state
        if (codeRecord.restaurant.status === 'REVOKED') {
            return res.status(403).json({ error: "Restaurant access has been revoked. Contact administrator." });
        }

        if (codeRecord.restaurant.status === 'SUSPENDED') {
            return res.status(403).json({ error: "Restaurant is currently suspended. Contact administrator." });
        }

        // 5. Perform Activation (Transaction) — NO new entity creation!
        const result = await prisma.$transaction(async (tx) => {

            // Mark code as used
            await tx.activationCode.update({
                where: { id: codeRecord.id },
                data: { isUsed: true, usedAt: new Date() }
            });

            // Calculate and set subscription end date
            const subscriptionEndsAt = new Date();
            subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + codeRecord.durationDays);

            // Update existing restaurant (NOT creating a new one)
            const restaurant = await tx.restaurant.update({
                where: { id: codeRecord.restaurant.id },
                data: {
                    status: 'ACTIVE',
                    isActive: true,
                    subscriptionEndsAt
                }
            });

            // Audit log
            await tx.auditLog.create({
                data: {
                    action: 'DEVICE_ACTIVATED',
                    actor: 'DEVICE',
                    target: `Restaurant:${restaurant.id}`,
                    details: 'Device activated successfully',
                    metadata: {
                        activationCode: codeRecord.code,
                        plan: codeRecord.plan,
                        durationDays: codeRecord.durationDays,
                        maxTables: codeRecord.maxTables,
                        subscriptionEndsAt: subscriptionEndsAt.toISOString()
                    }
                }
            });

            return restaurant;
        });

        // 6. Success — return EXISTING restaurant, never a duplicate
        return res.json({
            success: true,
            restaurant: result,
            message: "Device activated successfully"
        });

    } catch (error) {
        console.error("Activation Error:", error);
        return res.status(500).json({ error: "Internal Server Error during activation" });
    }
};

exports.setupPin = async (req, res) => {
    try {
        const { restaurantId, adminPin, kitchenPin } = req.body;

        if (!restaurantId || !adminPin || !kitchenPin) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const hashedAdminPin = await bcrypt.hash(adminPin, 10);
        const hashedKitchenPin = await bcrypt.hash(kitchenPin, 10);

        await prisma.restaurant.update({
            where: { id: restaurantId },
            data: {
                adminPin: hashedAdminPin,
                kitchenPin: hashedKitchenPin
            }
        });

        res.json({ success: true, message: "PINs configured successfully" });
    } catch (error) {
        console.error("Setup PIN Error:", error);
        res.status(500).json({ error: "Failed to setup PINs" });
    }
};

exports.getDeviceStatus = async (req, res) => {
    try {
        const { restaurantId } = req.query;

        // 1. If no restaurantId is provided by the device, it's not activated
        // We force activation screen to ensure they go through the flow
        if (!restaurantId) {
            return res.json({
                isActivated: false,
                restaurantStatus: null,
                forceActivation: true
            });
        }

        // 2. Validate Restaurant Status
        const restaurant = await prisma.restaurant.findUnique({
            where: { id: restaurantId },
            select: { status: true, name: true }
        });

        // 3. If restaurant doesn't exist -> Force Activation (maybe deleted?)
        if (!restaurant) {
            return res.json({
                isActivated: false,
                restaurantStatus: null,
                forceActivation: true
            });
        }

        // 4. Check Status
        if (restaurant.status !== 'ACTIVE') {
            return res.json({
                isActivated: true, // It WAS activated, but...
                restaurantStatus: restaurant.status,
                forceActivation: true // Force them out because they are SUSPENDED or REVOKED
            });
        }

        // 5. All Good
        res.json({
            isActivated: true,
            restaurantStatus: 'ACTIVE',
            forceActivation: false,
            restaurantName: restaurant.name
        });

    } catch (error) {
        console.error("Device Status Check Error:", error);
        // On error, we don't necessarily want to kill the app, but maybe warn?
        // Safe fail: assume not forced, but report error
        res.status(500).json({ error: "Internal Server Error" });
    }
};
