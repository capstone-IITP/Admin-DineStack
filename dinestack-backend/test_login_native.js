const http = require('http');

function postRequest() {
    const data = JSON.stringify({
        email: 'navdeepak@dinestack.in',
        password: 'dinestack123'
    });

    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/super-admin/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = http.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            console.log(`BODY: ${chunk}`);
        });
    });

    req.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });

    req.write(data);
    req.end();
}

function checkHealth() {
    http.get('http://localhost:5000/api/health', (res) => {
        console.log('Health check status:', res.statusCode);
        res.on('data', d => process.stdout.write(d));
    }).on('error', e => console.error(e));
}

console.log("Checking health...");
checkHealth();
setTimeout(() => {
    console.log("\nAttempting login...");
    postRequest();
}, 1000);
