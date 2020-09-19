/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import oauth from "./oauth.js";
import {unbgzf} from './bam/bgzf.js';
import PromiseThrottle from "./util/promiseThrottle.js"
import {FileUtils, GoogleAuth, GoogleUtils, URIUtils, Zlib} from "../node_modules/igv-utils/src/index.js"

var NONE = 0;
var GZIP = 1;
var BGZF = 2;
var UNKNOWN = 3;
let RANGE_WARNING_GIVEN = false;

const promiseThrottle = new PromiseThrottle({
    requestsPerSecond: 10,
    promiseImplementation: Promise
})

const igvxhr = {

    apiKey: undefined,

    setApiKey: function (key) {
        this.apiKey = key;
    },

    load: load,

    loadArrayBuffer: async function (url, options) {
        options = options || {};
        if (!options.responseType) {
            options.responseType = "arraybuffer";
        }
        if (url instanceof File) {
            return loadFileSlice(url, options);
        } else {
            return load(url, options);
        }
    },

    loadJson: async function (url, options) {
        options = options || {};
        const method = options.method || (options.sendData ? "POST" : "GET");
        if (method === "POST") {
            options.contentType = "application/json";
        }
        const result = await load(url, options)
        if (result) {
            return JSON.parse(result);
        } else {
            return result;
        }
    },

    loadString: async function (path, options) {
        options = options || {};
        if (path instanceof File) {
            return loadStringFromFile(path, options);
        } else {
            return loadStringFromUrl(path, options);
        }
    }
}

async function load(url, options) {

    options = options || {};
    const urlType = typeof url;

    // Resolve functions, promises, and functions that return promises
    url = await (typeof url === 'function' ? url() : url);

    if (url instanceof File) {
        return loadFileSlice(url, options);
    } else if (typeof url.startsWith === 'function') {   // Test for string
        if (url.startsWith("data:")) {
            return URIUtils.decodeDataURI(url)
        } else {
            if (url.startsWith("https://drive.google.com")) {
                url = GoogleUtils.driveDownloadURL(url);
            }
            if (GoogleUtils.isGoogleDriveURL(url)) {
                return promiseThrottle.add(function () {
                    return loadURL(url, options)
                })
            } else {
                return loadURL(url, options);
            }
        }
    } else {
        throw Error(`url must be either a 'File', 'string', 'function', or 'Promise'.  Actual type: ${urlType}`);
    }
}

async function loadURL(url, options) {

    //console.log(`${Date.now()}   ${url}`)
    url = mapUrl(url);

    options = options || {};

    let oauthToken = options.oauthToken || getOauthToken(url);
    if (oauthToken) {
        oauthToken = await (typeof oauthToken === 'function' ? oauthToken() : oauthToken);
    }

    return new Promise(function (resolve, reject) {

        // Various Google tansformations
        if (GoogleUtils.isGoogleURL(url)) {
            if (url.startsWith("gs://")) {
                url = GoogleUtils.translateGoogleCloudURL(url);
            } else if (GoogleUtils.isGoogleStorageURL(url)) {
                if (!url.includes("altMedia=")) {
                    url += (url.includes("?") ? "&altMedia=true" : "?altMedia=true");
                }
            }
            addApiKey(url);
        }

        const headers = options.headers || {};
        if (oauthToken) {
            addOauthHeaders(headers, oauthToken);
        }
        const range = options.range;
        const isChrome = navigator.userAgent.indexOf('Chrome') > -1;
        const isSafari = navigator.vendor.indexOf("Apple") === 0 && /\sSafari\//.test(navigator.userAgent);

        if (range && isChrome && !isAmazonV4Signed(url)) {
            // Hack to prevent caching for byte-ranges. Attempt to fix net:err-cache errors in Chrome
            url += url.includes("?") ? "&" : "?";
            url += "someRandomSeed=" + Math.random().toString(36);
        }

        const xhr = new XMLHttpRequest();
        const sendData = options.sendData || options.body;
        const method = options.method || (sendData ? "POST" : "GET");
        const responseType = options.responseType;
        const contentType = options.contentType;
        const mimeType = options.mimeType;

        xhr.open(method, url);

        if (range) {
            var rangeEnd = range.size ? range.start + range.size - 1 : "";
            xhr.setRequestHeader("Range", "bytes=" + range.start + "-" + rangeEnd);
            //      xhr.setRequestHeader("Cache-Control", "no-cache");    <= This can cause CORS issues, disabled for now
        }
        if (contentType) {
            xhr.setRequestHeader("Content-Type", contentType);
        }
        if (mimeType) {
            xhr.overrideMimeType(mimeType);
        }
        if (responseType) {
            xhr.responseType = responseType;
        }
        if (headers) {
            for (let key of Object.keys(headers)) {
                const value = headers[key];
                xhr.setRequestHeader(key, value);
            }
        }

        // NOTE: using withCredentials with servers that return "*" for access-allowed-origin will fail
        if (options.withCredentials === true) {
            xhr.withCredentials = true;
        }

        xhr.onload = async function (event) {
            // when the url points to a local file, the status is 0 but that is not an error
            if (xhr.status === 0 || (xhr.status >= 200 && xhr.status <= 300)) {
                if (range && xhr.status !== 206 && range.start !== 0) {
                    // For small files a range starting at 0 can return the whole file => 200
                    // Provide just the slice we asked for, throw out the rest quietly
                    // If file is large warn user
                    if (xhr.response.length > 100000 && !RANGE_WARNING_GIVEN) {
                        alert(`Warning: Range header ignored for URL: ${url}.  This can have performance impacts.`);
                    }
                    resolve(xhr.response.slice(range.start, range.start + range.size));

                } else {
                    resolve(xhr.response);
                }
            } else if ((typeof gapi !== "undefined") &&
                ((xhr.status === 404 || xhr.status === 401 || xhr.status === 403) &&
                    GoogleUtils.isGoogleURL(url)) &&
                !options.retries) {

                try {
                    const accessToken = await fetchGoogleAccessToken(url);
                    options.retries = 1;
                    options.oauthToken = accessToken;
                    const response = await load(url, options);
                    resolve(response);
                } catch (e) {
                    handleError(e);
                }
            } else {
                if (xhr.status === 403) {
                    handleError("Access forbidden: " + url)
                } else if (xhr.status === 416) {
                    //  Tried to read off the end of the file.   This shouldn't happen, but if it does return an
                    handleError("Unsatisfiable range");
                } else {
                    handleError(xhr.status);
                }
            }
        };

        xhr.onerror = function (event) {
            handleError("Error accessing resource: " + url + " Status: " + xhr.status);
        }

        xhr.ontimeout = function (event) {
            handleError("Timed out");
        };

        xhr.onabort = function (event) {
            console.log("Aborted");
            reject(event);
        };

        try {
            xhr.send(sendData);
        } catch (e) {
            reject(e);
        }


        function handleError(message) {
            if (reject) {
                reject(new Error(message));
            } else {
                throw new Error(message);
            }
        }
    })

}

async function loadFileSlice(localfile, options) {

    let blob = (options && options.range) ?
        localfile.slice(options.range.start, options.range.start + options.range.size) :
        localfile;
    if ("arraybuffer" === options.responseType) {
        return blob.arrayBuffer();
    } else {
        throw Error("binary string not implemented")
    }
}

async function loadStringFromFile(localfile, options) {

    const blob = options.range ? localfile.slice(options.range.start, options.range.start + options.range.size) : localfile;
    let compression = NONE;
    if (options && options.bgz || localfile.name.endsWith(".bgz")) {
        compression = BGZF;
    } else if (localfile.name.endsWith(".gz")) {
        compression = GZIP;
    }

    if (compression === NONE) {
        return blob.text();
    } else {
        return arrayBufferToString(blob.arrayBuffer(), compression);
    }
}

async function loadStringFromUrl(url, options) {

    options = options || {};

    const fn = options.filename || FileUtils.getFilename(url);
    let compression = UNKNOWN;
    if (options.bgz) {
        compression = BGZF;
    } else if (fn.endsWith(".gz")) {
        compression = GZIP;
    }

    options.responseType = "arraybuffer";
    const data = await igvxhr.load(url, options);
    return arrayBufferToString(data, compression);
}


function isAmazonV4Signed(url) {
    return url.indexOf("X-Amz-Signature") > -1;
}

function getOauthToken(url) {

    // Google is the default provider, don't try to parse host for google URLs
    const host = GoogleUtils.isGoogleURL(url) ?
        undefined :
        URIUtils.parseUri(url).host;
    let token = oauth.getToken(host);
    if (token) {
        return token;
    } else if (host === undefined) {
        if (googleToken && googleToken.expires_at > Date.now()) {
            return googleToken.access_token;
        }
    }
}

/**
 * Cached token from user signin -- not to be confused with explicitly set token from application (oauth.google.access_token)
 */
let googleToken;

/**
 * Return a Google oAuth token, triggering a sign in if required.   This method should not be called until we know
 * a token is required, that is until we've tried the url and received a 401, 403, or 404.
 *
 * @param url
 * @returns the oauth token
 */
async function fetchGoogleAccessToken(url) {
    if (gapi && gapi.auth2 && gapi.auth2.getAuthInstance()) {
        const scope = GoogleAuth.getScopeForURL(url);
        googleToken = await GoogleAuth.getAccessToken(scope);
        return googleToken.access_token;
    } else {
        throw Error(
            `Authorization is required, but Google oAuth has not been initalized. Contact your site administrator for assistance.`)
    }
}

function addOauthHeaders(headers, acToken) {
    if (acToken) {
        headers["Cache-Control"] = "no-cache";
        headers["Authorization"] = "Bearer " + acToken;
    }
    return headers;
}


function addApiKey(url) {
    let apiKey = igvxhr.apiKey;
    if (!apiKey && typeof gapi !== "undefined") {
        apiKey = gapi.apiKey;
    }
    if (apiKey !== undefined && !url.includes("key=")) {
        const paramSeparator = url.includes("?") ? "&" : "?"
        url = url + paramSeparator + "key=" + apiKey;
    }
    return url;
}

/**
 * Perform some well-known url mappings.
 * @param url
 */
function mapUrl(url) {

    if (url.includes("//www.dropbox.com")) {
        return url.replace("//www.dropbox.com", "//dl.dropboxusercontent.com");
    } else if (url.includes("//drive.google.com")) {
        return GoogleUtils.driveDownloadURL(url);
    } else if (url.includes("//www.broadinstitute.org/igvdata")) {
        return url.replace("//www.broadinstitute.org/igvdata", "//data.broadinstitute.org/igvdata");
    } else if (url.includes("//igvdata.broadinstitute.org")) {
        return url.replace("//igvdata.broadinstitute.org", "https://dn7ywbm9isq8j.cloudfront.net")
    } else if (url.startsWith("ftp://ftp.ncbi.nlm.nih.gov/geo")) {
        return url.replace("ftp://", "https://")
    } else {
        return url;
    }
}


function arrayBufferToString(arraybuffer, compression) {
    if (compression === UNKNOWN && arraybuffer.byteLength > 2) {
        const m = new Uint8Array(arraybuffer, 0, 2);
        if (m[0] === 31 && m[1] === 139) {
            compression = GZIP;
        }
    }

    var plain;
    if (compression === GZIP) {
        var inflate = new Zlib.Gunzip(new Uint8Array(arraybuffer));
        plain = inflate.decompress();
    } else if (compression === BGZF) {
        plain = unbgzf(arraybuffer);
    } else {
        plain = new Uint8Array(arraybuffer);
    }

    if ('TextDecoder' in getGlobalObject()) {
        return new TextDecoder().decode(plain);
    } else {
        return decodeUTF8(plain);
    }
}

/**
 * Use when TextDecoder is not available (primarily IE).
 *
 * From: https://gist.github.com/Yaffle/5458286
 *
 * @param octets
 * @returns {string}
 */
function decodeUTF8(octets) {
    var string = "";
    var i = 0;
    while (i < octets.length) {
        var octet = octets[i];
        var bytesNeeded = 0;
        var codePoint = 0;
        if (octet <= 0x7F) {
            bytesNeeded = 0;
            codePoint = octet & 0xFF;
        } else if (octet <= 0xDF) {
            bytesNeeded = 1;
            codePoint = octet & 0x1F;
        } else if (octet <= 0xEF) {
            bytesNeeded = 2;
            codePoint = octet & 0x0F;
        } else if (octet <= 0xF4) {
            bytesNeeded = 3;
            codePoint = octet & 0x07;
        }
        if (octets.length - i - bytesNeeded > 0) {
            var k = 0;
            while (k < bytesNeeded) {
                octet = octets[i + k + 1];
                codePoint = (codePoint << 6) | (octet & 0x3F);
                k += 1;
            }
        } else {
            codePoint = 0xFFFD;
            bytesNeeded = octets.length - i;
        }
        string += String.fromCodePoint(codePoint);
        i += bytesNeeded + 1;
    }
    return string
}


function getGlobalObject() {
    if (typeof self !== 'undefined') {
        return self;
    }
    if (typeof global !== 'undefined') {
        return global;
    } else {
        return window;
    }
}

//Increments an anonymous usage count.  Count is anonymous, needed for our continued funding.  Please don't delete
if (typeof window !== "undefined") {
    console.log("startup")
    const href = window.document.location.href;
    if (!href.includes("localhost") && !href.includes("127.0.0.1")) {
        const url = "https://data.broadinstitute.org/igv/projects/current/counter_igvjs.php?version=" + "0";
        igvxhr.load(url).then(function (ignore) {
        })
    }
}


export default igvxhr
