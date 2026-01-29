const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;

    if (!email || !password) {
        console.error("❌ Error: SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD not set in environment variables.");
        process.exit(1);
    }

    console.log(`🚀 Checking for Super Admin: ${email}...`);

    try {
        const existingAdmin = await prisma.superAdmin.findUnique({
            where: { email }
        });

        if (existingAdmin) {
            console.log("✅ Super Admin already exists.");
        } else {
            console.log("🔨 Creating Super Admin...");
            const hashedPassword = await bcrypt.hash(password, 10);
            await prisma.superAdmin.create({
                data: {
                    email,
                    password: hashedPassword
                }
            });
            console.log("✅ Super Admin created successfully.");
        }
    } catch (error) {
        console.error("❌ Error during initialization:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
