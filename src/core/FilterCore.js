const crypto = require("crypto");

class FilterCore {
    /**
     * Generate k bit indices for the filter of size m
     * using double hashing from a single SHA-256 hash
     * @param {Buffer|string} data - input data (string or buffer)
     * @param {number} m - total number of bits in the filter
     * @param {number} k - number of hash functions
     * @returns {number[]} array of bit indices
     */
    static getIndices(data, m, k) {
        const hash = crypto.createHash("sha256").update(data).digest();

        // combine hash bytes to create two 32-bit numbers
        const h1 = hash.readUInt32BE(0) ^ hash.readUInt32BE(4) ^ hash.readUInt32BE(8) ^ hash.readUInt32BE(12);
        const h2 = hash.readUInt32BE(16) ^ hash.readUInt32BE(20) ^ hash.readUInt32BE(24) ^ hash.readUInt32BE(28);

        const indices = [];
        for (let i = 0; i < k; i++) {
            let index = (h1 + i * h2) % m;
            if (index < 0) index += m; // ensure positive
            indices.push(index);
        }
        return indices.sort((a, b) => a - b);
    }

    /**
     * Combine multiple attributes into a single string
     * @param {object} payload - object with keys defined in attributes
     * @param {string[]} attributes - list of attributes to include
     * @returns {string} concatenated string
     */
    static serializePayload(payload, attributes) {
        //return attributes.map(attr => String(payload[attr] ?? "")).join("|");
        // use JSON.stringify for more robust serialization
        const obj = {};
        for (const attr of attributes) {
            obj[attr] = payload[attr] ?? null;
        }
        return JSON.stringify(obj);
    }
}

module.exports = FilterCore;
