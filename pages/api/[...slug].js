// This application uses Next.js pages router for API routes
// to bridge requests to the Express backend.

const app = require('../../dinestack-backend/src/app');

export const config = {
    api: {
        bodyParser: false,
        externalResolver: true,
    },
};

export default (req, res) => {
    return new Promise((resolve, reject) => {
        // Pass the request to the Express app
        app(req, res, (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
};
