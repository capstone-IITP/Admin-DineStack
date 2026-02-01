require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function fixPassword() {
    try {
        const email = process.env.SUPER_ADMIN_EMAIL;
        const password = process.env.SUPER_ADMIN_PASSWORD;

        if (!email || !password) {
            console.error("Missing SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD in environment variables");
            return;
        }

        // Generate a valid bcrypt hash
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log("Generated hash:", hashedPassword);

        // Upsert the user: Create if not exists, Update if exists
        const admin = await prisma.superAdmin.upsert({
            where: { email: email },
            update: {
                password: hashedPassword
            },
            create: {
                email: email,
                password: hashedPassword
            }
        });

        console.log("Successfully updated admin password for:", admin.email);
        console.log("New stored hash:", admin.password);

    } catch (e) {
        console.error("Error updating password:", e);
    } finally {
        await prisma.$disconnect();
    }
}

fixPassword();
