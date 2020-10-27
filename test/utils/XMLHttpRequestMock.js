// Emulate the browser XMLHttpRequest object for remote files
// url will be a relative file path
// supports 'GET' only
// support range header, responseType

import {XMLHttpRequestLocal} from './XMLHttpRequestLocal.js';
import {XMLHttpRequest} from 'w3c-xmlhttprequest'

/**
 * Emulation of w3c XMLHttpRequest for local file paths -- useful for unit tests with no server.
 */

class XMLHttpRequestMock {

    constructor() {
        this.local = new XMLHttpRequestLocal();
        this.remote = new XMLHttpRequest();
        this.status = undefined;
        this.onload = undefined;
        this.onerror = undefined;
        this.ontimeout = undefined;
        this.onabort = undefined;
        this.response = undefined;
        this.headers = new Map();
    }

    open(method, url) {
        if (url.startsWith("http://") || url.startsWith("https://")) {
            this.impl = new XMLHttpRequest();
        } else {
            this.impl = new XMLHttpRequestLocal();
        }
        this.impl.open(method, url);
    }

    setRequestHeader(key, value) {
        this.impl.setRequestHeader(key, value);
    }

    send() {
        const self = this;
        this.impl.responseType = this.responseType;
        this.impl.onerror = this.onerror;
        this.impl.ontimeout = this.ontimeout;
        this.impl.onabort = this.onabort;
        if (typeof this.onload === 'function') {
            this.impl.onload = function () {
                self.status = self.impl.status;
                self.response = self.impl.response;
                self.onload();
            }
        }
        this.impl.send();
    }

    abort() {
        this.impl.abort();
    }
}

export {XMLHttpRequestMock}

