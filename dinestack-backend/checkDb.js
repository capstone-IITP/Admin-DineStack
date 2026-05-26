require("dotenv").config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require("crypto");

const ALGORITHM = "aes-256-cbc";
function getKeyAndIv() {
    const key = process.env.CRYPTO_KEY;
    const iv = process.env.CRYPTO_IV;
    return {
        key: Buffer.from(key, "hex"),
        iv: Buffer.from(iv, "hex")
    };
}
function decrypt(encryptedHex) {
    const { key, iv } = getKeyAndIv();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}

async function main() {
    const admin = await prisma.superAdmin.findFirst();
    if (!admin) {
        console.log("No super admin found.");
        return;
    }
    console.log("Admin email:", admin.email);
    console.log("2FA Enabled:", admin.twoFactorEnabled);
    console.log("Encrypted Secret length:", admin.twoFactorSecret?.length);
    console.log("Encrypted Secret:", admin.twoFactorSecret);
    
    try {
        if (admin.twoFactorSecret) {
            const decrypted = decrypt(admin.twoFactorSecret);
            console.log("Decrypted Secret:", decrypted);
        } else {
            console.log("No secret to decrypt.");
        }
    } catch (err) {
        console.error("Decryption Failed:", err.message);
    }
    
    // Optionally turn it off temporarily so we can login and setup again?
    // await prisma.superAdmin.update({ where: { id: admin.id }, data: { twoFactorEnabled: false } });
}
main().finally(() => prisma.$disconnect());
