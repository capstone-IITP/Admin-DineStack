const prisma = require("../prisma");
const generateCode = require("./code.util");
const bcrypt = require("bcrypt");

exports.createActivationCode = async (req, res) => {
    try {
        const { entityName, plan, durationDays, maxTables } = req.body;

        if (!plan || !durationDays || !maxTables) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const code = generateCode();

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);

        const activationCode = await prisma.activationCode.create({
            data: {
                code,
                entityName,
                plan,
                durationDays,
                maxTables,
                expiresAt,
            },
        });

        res.status(201).json(activationCode);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to create activation code" });
    }
};

exports.getAllActivationCodes = async (req, res) => {
    try {
        const codes = await prisma.activationCode.findMany({
            orderBy: { createdAt: "desc" },
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
        await prisma.activationCode.delete({ where: { id } });
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

        // 1. Find the code
        const codeRecord = await prisma.activationCode.findUnique({
            where: { code: activationCode },
        });

        if (!codeRecord) {
            return res.status(401).json({ error: "Invalid activation code" });
        }

        // 2. Check if already used
        if (codeRecord.isUsed) {
            return res.status(409).json({ error: "Activation code already used" });
        }

        // 3. Check expiry
        if (new Date() > new Date(codeRecord.expiresAt)) {
            return res.status(401).json({ error: "Activation code expired" });
        }

        // 4. Check status
        if (codeRecord.status === 'INVALIDATED') {
            return res.status(401).json({ error: "Activation code has been invalidated" });
        }

        // 5. Perform Activation (Transaction)
        const result = await prisma.$transaction(async (tx) => {
            // Mark code as used
            await tx.activationCode.update({
                where: { id: codeRecord.id },
                data: { isUsed: true, usedAt: new Date() }
            });

            // Calculate subscription end
            const subscriptionEndsAt = new Date();
            subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + codeRecord.durationDays);

            let restaurant;

            // Check if restaurant with this name already exists
            if (codeRecord.entityName) {
                restaurant = await tx.restaurant.findFirst({
                    where: { name: codeRecord.entityName }
                });
            }

            if (!restaurant) {
                throw new Error("Target restaurant entity not found. Please initialize the entity in the admin panel first.");
            }

            // If exists, return it (device will be linked to this restaurant)
            return restaurant;
        });

        // 5. Success
        return res.json({
            success: true,
            restaurant: result,
            message: "Device activated successfully"
        });

    } catch (error) {
        console.error("Activation Error:", error);
        // Handle unique constraint violation (though isUsed check should catch it)
        if (error.code === 'P2002') {
            return res.status(409).json({ error: "Activation code already linked to a restaurant" });
        }
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
