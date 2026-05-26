const { z } = require("zod");

/**
 * Express middleware to validate incoming request parts using Zod schemas.
 * Rejects requests with non-JSON Content-Type for POST/PUT/PATCH write operations.
 */
exports.validate = (schemas) => {
    return async (req, res, next) => {
        try {
            // 1. Content-Type check for write operations
            if (schemas.body && ["POST", "PUT", "PATCH"].includes(req.method)) {
                const contentType = req.headers["content-type"];
                if (!contentType || !contentType.includes("application/json")) {
                    return res.status(400).json({
                        error: "Content-Type must be application/json"
                    });
                }
            }

            // 2. Validate route params
            if (schemas.params) {
                req.params = await schemas.params.parseAsync(req.params);
            }

            // 3. Validate query string
            if (schemas.query) {
                req.query = await schemas.query.parseAsync(req.query);
            }

            // 4. Validate request body
            if (schemas.body) {
                req.body = await schemas.body.parseAsync(req.body);
            }

            // 5. Validate headers
            if (schemas.headers) {
                req.headers = await schemas.headers.parseAsync(req.headers);
            }

            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    error: "Validation failed",
                    details: error.errors.map(e => ({
                        path: e.path.join("."),
                        message: e.message
                    }))
                });
            }
            next(error);
        }
    };
};
