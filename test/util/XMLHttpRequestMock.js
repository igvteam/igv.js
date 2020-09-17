// Emulate the browser XMLHttpRequest object for local files using the Node file system
// url will be a relative file path
// supports 'GET' only
// support range header, responseType
import fs  from 'fs';
import { XMLHttpRequest } from 'w3c-xmlhttprequest';

class XMLHttpRequestMock {

    constructor () {
    }

    open(method, url) {
        if(url.startsWith("http://") || url.startsWith("https://")) {
            this.impl = new XMLHttpRequest();
        } else {
            this.impl = new XMLHttpRequestLocal();
        }
        this.impl.open(method, url);
    }

    setRequestHeader(key, value) {
        return this.impl.setRequestHeader(key, value);
    }

    send() {
        return this.impl.send();
    }

    abort() {
        return this.impl.abort();
    }


}


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
        let nodeBuffer;
        const rangeString = this.headers.get('range');
        if (rangeString && rangeString.startsWith('bytes=')) {
            const fd = fs.openSync(this.path, 'r');
            const tokens = rangeString.substring(6).split('-');
            const start = parseInt(tokens[0]);
            const length = parseInt(tokens[1]) - start + 1;
            nodeBuffer = Buffer.alloc(length);
            nodeBuffer = new Buffer(length);
            fs.feadSync(fd, nodeBuffer, 0, length, start);
            this.status = 206;
            fs.closeSync(fd);
        } else {
            nodeBuffer = fs.readFileSync(this.path);
            this.status = 200;
        }

        this.response = nodeBuffer.buffer;
        if(typeof this.onload === 'function') {
            this.onload();
        }
    }

    abort() {
        // Ignore
    }
}

export  {XMLHttpRequestMock, XMLHttpRequestLocal}



/*
// Example
const xhr = new XMLHttpRequestLocal();
xhr.open('GET', '../data/bed/4_columns.bed');
xhr.onload = function(buffer) {
    console.log(buffer);
}
xhr.send();
*/

