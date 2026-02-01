const fetch = require('node-fetch');

async function testLogin() {
    try {
        const response = await fetch('http://localhost:5000/super-admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'navdeepak@dinestack.in',
                password: 'dinestack123'
            })
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', data);
    } catch (error) {
        console.error('Error:', error);
    }
}

testLogin();
