const ChunkManager = require("../io/ChunkManager");
const IO = require("../io/IO");
const FilterCore = require("./FilterCore");

class Que {
    /**
     * @param {Object} options
     *   - file: path to .que file
     *   - expectedElements: number of elements expected
     *   - fpr: desired false positive rate
     *   - k: number of hash functions (optional, auto-calculated if omitted)
     *   - attributes: array of attribute names
     *   - chunkSize: optional chunk size in bytes
     */
    constructor({ file, expected, fpr, k, attributes, chunk }) {
        if (!expected || !fpr) {
            throw new Error("You must provide expected and fpr");
        }
        this.attributes = attributes;
        this.expectedElements = expected;
        this.totalBits = Math.ceil(-(expected * Math.log(fpr)) / (Math.log(2) ** 2));
        this.k = k || Math.round((this.totalBits / expected) * Math.log(2));

        this.chunkManager = new ChunkManager({
            io: new IO({ file, totalBytes: this.totalBits / 8 }),
            totalBits: this.totalBits,
            chunk
        });
    }

    async load() {
        await this.chunkManager.io.open();
    }

    async save() {
        await this.chunkManager.flush();
    }

    async add(payload) {
        const serialized = FilterCore.serializePayload(payload, this.attributes);
        const bitIndices = FilterCore.getIndices(serialized, this.totalBits, this.k);

        for (const idx of bitIndices) {
            await this.chunkManager.setBit(idx);
        }

        await this.chunkManager.flush();
    }

    async test(payload) {
        const serialized = FilterCore.serializePayload(payload, this.attributes);
        const bitIndices = FilterCore.getIndices(serialized, this.totalBits, this.k);

        for (const idx of bitIndices) {
            const bitSet = await this.chunkManager.testBit(idx);
            if (!bitSet) return false;
        }
        return true;
    }

    async est_ce(payload) {
        return this.test(payload);
    }

    async close() {
        await this.chunkManager.flush();
    }

    static calculate({ expected, fpr }) {
        const bits = Math.ceil(-(expected * Math.log(fpr)) / (Math.log(2) ** 2));
        const k = Math.round((bits / expected) * Math.log(2));
        return { bits, k };
    }
}

module.exports = Que;
