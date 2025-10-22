import fs from 'fs';

export default class LocalFile {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(source, opts = {}) {
        this.filename = source;
    }
    getFd() {
        if (!this.fd) {
            this.fd = fs.openSync(this.filename, 'r');
        }
        return this.fd;
    }
    async read(buffer, offset = 0, length, position = 0) {
        const fetchLength = Math.min(buffer.length - offset, length);
        const ret = await fs.readSync(await this.getFd(), buffer, offset, fetchLength, position);
        return { bytesRead: ret, buffer };
    }
    async readFile(options) {
        return fs.readFileSync(this.filename, options);
    }
    // todo memoize
    async stat() {
        return fs.statSync(this.filename);
    }
    async close() {
        return fs.closeSync(this.filename);
    }
}
