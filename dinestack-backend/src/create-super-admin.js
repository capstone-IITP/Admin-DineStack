const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const { validatePassword, BCRYPT_SALT_ROUNDS } = require("./utils/passwordPolicy");

const prisma = new PrismaClient();

require("dotenv").config();

async function main() {
    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;

    if (!email || !password) {
        console.error("Error: SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD not set in .env");
        return;
    }

    // Validate password policy
    const { valid, errors } = validatePassword(password);
    if (!valid) {
        console.error("Password does not meet security policy:");
        errors.forEach(e => console.error(`  ✗ ${e}`));
        console.error("\nRequirements: min 12 chars, 1 upper, 1 lower, 1 digit, 1 special char");
        return;
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Check if admin already exists
    const existingAdmin = await prisma.superAdmin.findUnique({
        where: { email },
    });

    if (existingAdmin) {
        console.log("SuperAdmin already exists, updating password...");
        await prisma.superAdmin.update({
            where: { email },
            data: { passwordHash: hashedPassword },
        });
        console.log("SuperAdmin password updated (bcrypt, 12 rounds).");
        return;
    }

    const admin = await prisma.superAdmin.create({
        data: {
            email,
            passwordHash: hashedPassword,
        },
    });

    console.log("SuperAdmin created:", admin.email);
    console.log("Password hashed with bcrypt (12 salt rounds).");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
