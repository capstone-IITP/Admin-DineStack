const app = require('./app');
const http = require('http');

const PORT = 5555;

const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);

    const testPath = '/api/super-admin/login';
    const options = {
        hostname: 'localhost',
        port: PORT,
        path: testPath,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            console.log(`Response status: ${res.statusCode}`);
            // 404 means the route is missing (FAIL)
            // 400 means Bad Request (missing body, etc), implying route exists (PASS)
            // 401 means Unauthorized (invalid creds), implying route exists (PASS)
            if (res.statusCode === 404) {
                console.error('FAIL: Route not found');
                process.exit(1);
            } else {
                console.log('PASS: Route exists and is handled');
                process.exit(0);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
        process.exit(1);
    });

    req.write(JSON.stringify({ email: 'test', password: 'test' }));
    req.end();
});
