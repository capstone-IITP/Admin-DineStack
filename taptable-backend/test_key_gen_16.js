const generateActivationCode = require('./src/activation/code.util');

console.log('--- Testing 16-Char Key Generation ---');
for (let i = 0; i < 5; i++) {
    const code = generateActivationCode();
    const cleanCode = code.replace(/-/g, '');
    const alphanumericCount = cleanCode.length; // Should be 16 (TAP + 13)

    console.log(`Code: ${code}`);
    console.log(`Length (raw): ${code.length}`);
    console.log(`Alphanumeric Count (TAP + Random): ${alphanumericCount}`);

    if (alphanumericCount !== 16) {
        console.error('FAIL: Expected 16 alphanumeric characters.');
    } else {
        console.log('PASS');
    }
    console.log('---');
}
