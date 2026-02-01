function generateActivationCode() {
    const part1 = () => Math.random().toString(36).substring(2, 3).toUpperCase();
    const part4 = () => Math.random().toString(36).substring(2, 6).toUpperCase();

    return `TAP${part1()}-${part4()}-${part4()}-${part4()}`;
}

module.exports = generateActivationCode;
