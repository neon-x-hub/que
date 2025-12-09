const fs = require("fs");
const path = require("path");

class IO {
    /**
     * @param {Object} options
     *  - file: path to .que file
     *  - totalBytes: total file size in bytes
     */
    constructor({ file, totalBytes }) {
        this.file = file;
        this.totalBytes = Math.ceil(totalBytes);
        this.fd = null;
    }

    /** Open the file (create if not exists) */
    async open() {
        const exists = fs.existsSync(this.file);
        if (!exists) {
            const dir = path.dirname(this.file);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            this.fd = fs.openSync(this.file, "w+");
            fs.writeSync(this.fd, Buffer.alloc(this.totalBytes), 0, this.totalBytes, 0);
        } else {
            this.fd = fs.openSync(this.file, "r+");
        }
    }

    /** Close file */
    async close() {
        if (this.fd !== null) {
            fs.closeSync(this.fd);
            this.fd = null;
        }
    }

    /** Read a chunk from disk */
    async readChunk(offset, length) {
        const buffer = Buffer.alloc(length);
        fs.readSync(this.fd, buffer, 0, length, offset);
        return buffer;
    }

    /** Write a chunk to disk */
    async writeChunk(offset, buffer) {
        fs.writeSync(this.fd, buffer, 0, buffer.length, offset);
    }
}

module.exports = IO;
