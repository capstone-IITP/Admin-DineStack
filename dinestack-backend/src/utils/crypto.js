/**
 * AES-256-CBC Encryption Utility
 * 
 * Used to encrypt/decrypt TOTP secrets at rest.
 * Requires CRYPTO_KEY (32 bytes / 64 hex chars) and
 * CRYPTO_IV (16 bytes / 32 hex chars) in environment.
 */

const crypto = require("crypto");

const ALGORITHM = "aes-256-cbc";

function getKeyAndIv() {
    const key = process.env.CRYPTO_KEY;
    const iv = process.env.CRYPTO_IV;

    if (!key || key.length !== 64) {
        throw new Error("CRYPTO_KEY must be a 64-character hex string (32 bytes)");
    }
    if (!iv || iv.length !== 32) {
        throw new Error("CRYPTO_IV must be a 32-character hex string (16 bytes)");
    }

    return {
        key: Buffer.from(key, "hex"),
        iv: Buffer.from(iv, "hex")
    };
}

/**
 * Encrypt plaintext string to hex.
 * @param {string} text - Plaintext to encrypt
 * @returns {string} Hex-encoded ciphertext
 */
function encrypt(text) {
    const { key, iv } = getKeyAndIv();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
}

/**
 * Decrypt hex ciphertext to plaintext string.
 * @param {string} encryptedHex - Hex-encoded ciphertext
 * @returns {string} Decrypted plaintext
 */
function decrypt(encryptedHex) {
    const { key, iv } = getKeyAndIv();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}

module.exports = { encrypt, decrypt };
