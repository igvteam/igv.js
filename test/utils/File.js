/**
 * Mock object for browser 'File' class
 */

import fs from 'fs';

class File {

    //new File(bits, name[, options]);
    constructor(buffer, name) {
        this.buffer = buffer;
        this.name = name;
        this.size = buffer.byteLength;
    }

    //var newBlob = blob.slice(start, end, contentType);
    slice(start, end, contentType) {
        return this.buffer.slice(start, end);
    }

    async arrayBuffer() {
        const b = this.buffer;
        return Promise.resolve(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
    }

    text() {
        return Promise.resolve(this.buffer.toString());
    }

    stream() {
        throw Error("Not implemented")
    }
}

function createFile(path) {

    const b = fs.readFileSync(path);
    //const arrayBuffer = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
    return new File(b, path);
}

export {createFile, File};