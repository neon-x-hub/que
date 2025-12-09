class ChunkManager {
    /**
     * @param {Object} options
     *  - totalBits: total bits in the filter
     *  - chunkSize: size in bytes of one chunk (default 1MB)
     *  - io: instance of IO class
     */
    constructor({ totalBits, chunkSize = 1024 * 1024, io }) {
        this.totalBits = totalBits;
        this.totalBytes = Math.ceil(totalBits / 8);
        this.chunkSize = chunkSize;
        this.io = io;

        this.totalChunks = Math.ceil(this.totalBytes / this.chunkSize);

        this.currentChunkIndex = null;
        this.currentChunk = null;
        this.dirty = false;
    }

    /** Compute chunk index, local byte, bit offset for a global bit index */
    _getPosition(bitIndex) {
        if (bitIndex < 0 || bitIndex >= this.totalBits) {
            throw new Error("Bit index out of range");
        }
        const byteIndexGlobal = Math.floor(bitIndex / 8);
        const chunkIndex = Math.floor(byteIndexGlobal / this.chunkSize);
        const localByteIndex = byteIndexGlobal % this.chunkSize;
        const bitOffset = bitIndex % 8;
        return { chunkIndex, localByteIndex, bitOffset };
    }

    /** Load chunk into memory (lazy, from IO) */
    async _loadChunk(chunkIndex) {
        if (this.currentChunkIndex === chunkIndex) return;

        if (this.dirty && this.currentChunk) {
            await this._flushChunk(this.currentChunkIndex);
        }

        const offset = chunkIndex * this.chunkSize;
        const remainingBytes = this.totalBytes - offset;
        const length = Math.min(this.chunkSize, remainingBytes);

        this.currentChunk = await this.io.readChunk(offset, length);
        this.currentChunkIndex = chunkIndex;
        this.dirty = false;
    }

    /** Flush current chunk to disk */
    async _flushChunk(chunkIndex) {
        if (!this.dirty || !this.currentChunk) return;
        const offset = chunkIndex * this.chunkSize;
        await this.io.writeChunk(offset, this.currentChunk);
        this.dirty = false;
    }

    /** Flush current chunk (public) */
    async flush() {
        if (this.currentChunkIndex !== null) {
            await this._flushChunk(this.currentChunkIndex);
        }
    }

    /** Set a single bit */
    async setBit(bitIndex) {
        const { chunkIndex, localByteIndex, bitOffset } = this._getPosition(bitIndex);
        await this._loadChunk(chunkIndex);

        this.currentChunk[localByteIndex] |= 1 << bitOffset;
        this.dirty = true;
    }

    /** Test a single bit */
    async testBit(bitIndex) {
        const { chunkIndex, localByteIndex, bitOffset } = this._getPosition(bitIndex);
        await this._loadChunk(chunkIndex);

        return (this.currentChunk[localByteIndex] & (1 << bitOffset)) !== 0;
    }
}

module.exports = ChunkManager;
