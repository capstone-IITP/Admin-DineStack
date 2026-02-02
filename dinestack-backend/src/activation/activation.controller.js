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
            include: { activationCode: true }
        });

        if (!restaurant) {
            return res.status(404).json({ message: "Restaurant entity not found" });
        }

        if (restaurant.activationCode && restaurant.activationCode.status === 'ACTIVE' && !restaurant.activationCode.isUsed) {
            return res.status(409).json({
                message: "Restaurant already has an active, unused activation code",
                code: restaurant.activationCode.code
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
            include: { restaurant: true } // Include linked restaurant details
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

        // 3. Strict 1-to-1 Activation Check
        // If restaurant is ALREADY active via another code (shouldn't happen with unique check, but safe double-check)
        // OR deeply check if restaurant has ANY used code? 
        // Logic: One Restaurant = One Active License.
        if (!codeRecord.restaurant) {
            // This hits if created via obsolete method or data corruption
            return res.status(500).json({ error: "Activation code is not linked to a valid restaurant entity" });
        }

        // 4. Perform Activation (Transaction)
        const result = await prisma.$transaction(async (tx) => {

            // Double-check if restaurant is somehow already activated?
            // (Optional strict check if we want to prevent re-activation of the same restaurant ID with a different code
            //  if that was ever possible. But since codes are 1:1, this is implicitly handled).

            // Mark code as used
            await tx.activationCode.update({
                where: { id: codeRecord.id },
                data: { isUsed: true, usedAt: new Date() }
            });

            // Update Restaurant status if needed
            // Ensure strictly 1:1 relation setup if not already enforced by schema
            const restaurant = codeRecord.restaurant;

            // Note: We don't need to 'link' here anymore, because it was linked at creation!
            // We just return the restaurant.

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
