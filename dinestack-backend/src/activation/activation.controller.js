const prisma = require("../prisma");
const generateCode = require("./code.util");
const bcrypt = require("bcrypt");

exports.createActivationCode = async (req, res) => {
    try {
        const { restaurantName, notes } = req.body;

        if (!restaurantName) {
            return res.status(400).json({ message: "Restaurant name is required" });
        }

        const existingRestaurant = await prisma.restaurant.findFirst({
            where: { name: restaurantName }
        });

        const code = generateCode();

        const activationCode = await prisma.activationCode.create({
            data: {
                code,
                restaurantName,
                entityName: restaurantName,
                restaurantId: existingRestaurant ? existingRestaurant.id : null,
                notes,
                generatedBy: req.user.email,
                status: 'ACTIVE',
                plan: 'TRIAL',
                durationDays: 7,
                maxTables: 10,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            },
        });

        await prisma.auditLog.create({
            data: {
                action: 'KEY_GENERATE',
                actor: req.user.email,
                target: `ActivationCode:${code}`,
                details: `Generated activation code ${code} for ${restaurantName}`,
                severity: 'INFO'
            }
        });

        res.status(201).json(activationCode);
    } catch (error) {
        console.error(error);
        if (error.code === 'P2002') {
            return res.status(409).json({ message: "A conflict occurred" });
        }
        res.status(500).json({ message: "Failed to create activation code" });
    }
};

exports.getAllActivationCodes = async (req, res) => {
    try {
        const codes = await prisma.activationCode.findMany({
            orderBy: { generatedAt: "desc" },
            include: { Restaurant: true }
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
            where: { code: activationCode }
        });

        if (!codeRecord) {
            return res.status(401).json({ error: "Invalid activation code" });
        }

        // 2. Security Checks
        if (codeRecord.status === 'USED' || codeRecord.isUsed) {
            return res.status(409).json({ error: "Activation code already used" });
        }

        if (codeRecord.status === 'REVOKED' || codeRecord.status === 'INVALIDATED') {
            return res.status(401).json({ error: "Activation code has been revoked" });
        }

        // 3. Perform Activation (Transaction) — Create Entity and Link
        const result = await prisma.$transaction(async (tx) => {
            const activationDate = new Date();
            const trialEndDate = new Date();
            // Use durationDays from the activation code, default to 7 if missing
            const duration = codeRecord.durationDays || 7;
            trialEndDate.setDate(trialEndDate.getDate() + duration);

            // Determine statuses based on plan
            const planStatus = codeRecord.plan || 'TRIAL';
            const subscriptionStatus = planStatus === 'TRIAL' ? 'PENDING' : 'ACTIVE';

            let restaurant;
            if (codeRecord.restaurantId) {
                // Update existing restaurant
                restaurant = await tx.restaurant.update({
                    where: { id: codeRecord.restaurantId },
                    data: {
                        status: 'ACTIVE',
                        isActive: true,
                        activationDate,
                        trialEndDate,
                        planStatus,
                        subscriptionStatus
                    }
                });
            } else {
                // Create new restaurant if it wasn't pre-linked
                restaurant = await tx.restaurant.create({
                    data: {
                        name: codeRecord.restaurantName || codeRecord.entityName || "Unknown Restaurant",
                        status: 'ACTIVE',
                        isActive: true,
                        activationDate,
                        trialEndDate,
                        planStatus,
                        subscriptionStatus
                    }
                });
            }

            // Auto-register the primary device
            await tx.device.create({
                data: {
                    restaurantId: restaurant.id,
                    deviceName: "Primary Node",
                    deviceId: "sys-" + restaurant.id.substring(0, 8),
                    status: "Online",
                    lastSeen: new Date()
                }
            });

            // Mark code as used
            await tx.activationCode.update({
                where: { id: codeRecord.id },
                data: {
                    status: 'USED',
                    isUsed: true,
                    activatedAt: new Date(),
                    usedAt: new Date(),
                    restaurantId: restaurant.id
                }
            });

            // Update circular reference if needed
            await tx.restaurant.update({
                where: { id: restaurant.id },
                data: { activationCodeId: codeRecord.id }
            });

            // Audit log
            await tx.auditLog.create({
                data: {
                    action: 'DEVICE_ACTIVATED',
                    actor: 'DEVICE',
                    target: `Restaurant:${restaurant.id}`,
                    details: `Device activated successfully, ${duration}-day ${planStatus} plan started`,
                    metadata: {
                        activationCode: codeRecord.code,
                        trialEndDate: trialEndDate.toISOString(),
                        plan: planStatus
                    }
                }
            });

            return restaurant;
        });

        // 4. Success
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

        const hashedAdminPin = await bcrypt.hash(adminPin, 12);
        const hashedKitchenPin = await bcrypt.hash(kitchenPin, 12);

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
