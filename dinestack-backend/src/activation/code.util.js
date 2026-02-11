const crypto = require('crypto');

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateBlock(length = 4) {
    let block = '';
    for (let i = 0; i < length; i++) {
        block += CHARSET[crypto.randomInt(CHARSET.length)];
    }
    return block;
}

function generateActivationCode() {
    return `DINE-${generateBlock()}-${generateBlock()}-${generateBlock()}`;
}

module.exports = generateActivationCode;
