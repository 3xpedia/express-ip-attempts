module.exports = {
    encode: m =>  Buffer.from(m).toString('base64'),
    decode: m =>  Buffer.from(m).toString('ascii')
};
