const rateLimit = require("express-rate-limit");

const isProd = process.env.NODE_ENV === "production";

exports.activationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProd ? 5 : 100, // Limit each IP to 5 activation attempts in production
    message: {
        error: "Too many activation attempts from this IP, please try again after 15 minutes"
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

exports.authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProd ? 5 : 100, // Limit each IP to 5 auth attempts in production
    message: {
        error: "Too many login/2FA attempts from this IP, please try again after 15 minutes"
    },
    standardHeaders: true,
    legacyHeaders: false,
});

exports.refundLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProd ? 10 : 100, // Limit each IP to 10 refunds in production
    message: {
        error: "Too many refund attempts from this IP, please try again after 15 minutes"
    },
    standardHeaders: true,
    legacyHeaders: false,
});

