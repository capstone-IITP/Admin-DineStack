const rateLimit = require("express-rate-limit");
const isProd = process.env.NODE_ENV === "production";

let redisClient;

if (process.env.REDIS_URL) {
    try {
        const Redis = require("ioredis");
        redisClient = new Redis(process.env.REDIS_URL);
        console.log("✅ Redis rate-limit client initialized successfully.");
    } catch (err) {
        console.error("❌ Failed to initialize Redis rate-limit client, falling back to memory:", err.message);
    }
} else {
    console.log("⚠️ REDIS_URL not configured. Using in-memory store for rate limiting.");
}

const createLimiter = (prefix, options) => {
    let limiterStore;
    if (redisClient) {
        try {
            const RedisStore = require("rate-limit-redis").default;
            limiterStore = new RedisStore({
                sendCommand: (...args) => redisClient.call(...args),
                prefix: `rl:${prefix}:`,
            });
        } catch (err) {
            console.error(`❌ Failed to create RedisStore for ${prefix}, falling back to memory:`, err.message);
        }
    }
    return rateLimit({
        ...options,
        store: limiterStore || undefined,
        standardHeaders: true,
        legacyHeaders: false,
    });
};

// 5 attempts per 15 minutes for public activation
exports.activationLimiter = createLimiter("activation", {
    windowMs: 15 * 60 * 1000,
    max: isProd ? 5 : 100,
    message: { error: "Too many activation attempts from this IP, please try again after 15 minutes" }
});

// 5 attempts per 15 minutes for auth (login/2FA OTP)
exports.authLimiter = createLimiter("auth", {
    windowMs: 15 * 60 * 1000,
    max: isProd ? 5 : 100,
    message: { error: "Too many login/verification attempts, please try again after 15 minutes" }
});

// 10 attempts per 15 minutes for refunds
exports.refundLimiter = createLimiter("refund", {
    windowMs: 15 * 60 * 1000,
    max: isProd ? 10 : 100,
    message: { error: "Too many refund requests, please try again after 15 minutes" }
});

// 10 attempts per 15 minutes for device setup PIN
exports.pinSetupLimiter = createLimiter("pinSetup", {
    windowMs: 15 * 60 * 1000,
    max: isProd ? 10 : 100,
    message: { error: "Too many PIN configuration attempts, please try again after 15 minutes" }
});

// 60 requests per minute for device status checks
exports.deviceStatusLimiter = createLimiter("deviceStatus", {
    windowMs: 60 * 1000,
    max: isProd ? 60 : 200,
    message: { error: "Rate limit exceeded for status check" }
});

// 15 attempts per 15 minutes for coupon operations
exports.couponLimiter = createLimiter("coupon", {
    windowMs: 15 * 60 * 1000,
    max: isProd ? 15 : 100,
    message: { error: "Too many coupon requests, please try again after 15 minutes" }
});
