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
 * Encrypt plaintext string to hex, using a unique random IV per payload.
 * Format returned: iv_hex:ciphertext_hex
 * @param {string} text - Plaintext to encrypt
 * @returns {string} Unique IV and hex-encoded ciphertext joined by colon
 */
function encrypt(text) {
    const { key } = getKeyAndIv();
    const ivBuffer = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, ivBuffer);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return `${ivBuffer.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt hex ciphertext to plaintext string.
 * Supports both new 'iv:ciphertext' format and legacy static-IV format.
 * @param {string} payload - Hex-encoded ciphertext or iv:ciphertext payload
 * @returns {string} Decrypted plaintext
 */
function decrypt(payload) {
    const { key, iv: defaultIv } = getKeyAndIv();
    let ivBuffer = defaultIv;
    let encryptedText = payload;

    if (payload.includes(":")) {
        const parts = payload.split(":");
        ivBuffer = Buffer.from(parts[0], "hex");
        encryptedText = parts[1];
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}

module.exports = { encrypt, decrypt };
