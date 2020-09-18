// Emulate the browser XMLHttpRequest object for local files using the Node file system
// url will be a relative file path
// supports 'GET' only
// support range header, responseType
import fs from 'fs';

/**
 * Emulation of w3c XMLHttpRequest for local file paths -- useful for unit tests with no server.
 */
class XMLHttpRequestLocal {

    constructor() {
        this.status = undefined;
        this.onload = undefined;
        this.onerror = undefined;
        this.ontimeout = undefined;
        this.onabort = undefined;
        this.response = undefined;
        this.headers = new Map();
    }

    open(method, url) {

        if ('GET' !== method) {
            throw Error(method + " not supported");
        }
        this.path = url;
    }

    setRequestHeader(key, value) {
        this.headers.set(key.toLowerCase(), value);
    }

    send() {
        let b;
        const rangeString = this.headers.get('range');
        if (rangeString && rangeString.startsWith('bytes=')) {
            const fd = fs.openSync(this.path, 'r');
            const tokens = rangeString.substring(6).split('-');
            const start = parseInt(tokens[0]);
            const length = parseInt(tokens[1]) - start + 1;
            b = Buffer.alloc(length);
            fs.readSync(fd, b, 0, length, start);
            fs.closeSync(fd);
            this.status = 206;
        } else {
            b = fs.readFileSync(this.path);
            this.status = 200;
        }
        // Small node buffers can use shared backing buffers, thus the slice is neccessary.   See https://nodejs.org/dist/latest-v12.x/docs/api/buffer.html#buffer_buf_byteoffset
        const arrayBuffer = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
        this.response = arrayBuffer;
        if (typeof this.onload === 'function') {
            this.onload();
        }
    }

    abort() {
        // Ignore
    }
}

export {XMLHttpRequestLocal}


/*
// Example
const xhr = new XMLHttpRequestLocal();
xhr.open('GET', '../data/bed/4_columns.bed');
xhr.onload = function(buffer) {
    console.log(buffer);
}
xhr.send();
*/

