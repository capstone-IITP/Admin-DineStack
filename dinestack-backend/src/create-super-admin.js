const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

require("dotenv").config();

async function main() {
    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;

    if (!email || !password) {
        console.error("Error: SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD not set in .env");
        return;
    }

    // Check if admin already exists
    const existingAdmin = await prisma.superAdmin.findUnique({
        where: { email },
    });

    if (existingAdmin) {
        console.log("SuperAdmin already exists, updating password...");
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.superAdmin.update({
            where: { email },
            data: { password: hashedPassword },
        });
        console.log("SuperAdmin password updated.");
        return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await prisma.superAdmin.create({
        data: {
            email,
            password: hashedPassword,
        },
    });

    console.log("SuperAdmin created:", admin.email);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
