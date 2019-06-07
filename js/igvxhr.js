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

var igv = (function (igv) {

    var NONE = 0;
    var GZIP = 1;
    var BGZF = 2;
    var UNKNOWN = 3;
    var loginTried = false;

    class RateLimiter {

        constructor(wait) {
            this.wait = wait === undefined ? 100 : wait
            this.isCalled = false
            this.calls = [];
        }


        limiter(fn) {

            const self = this

            let caller = function () {
                if (self.calls.length && !self.isCalled) {
                    self.isCalled = true;
                    self.calls.shift().call();
                    setTimeout(function () {
                        self.isCalled = false;
                        caller();
                    }, self.wait);
                }
            };

            return function () {
                self.calls.push(fn.bind(this, ...arguments));
                caller();
            };
        }

    }

    const rateLimiter = new RateLimiter(100)


    igv.xhr = {


        load: function (url, options) {

            options = options || {};

            if (url instanceof File) {
                return loadFileSlice(url, options);
            } else {
                if (url.startsWith("data:")) {
                    return igv.decodeDataURI(url)
                } else {

                    if (isGoogleDrive(url)) {

                        return new Promise(function (fulfill, reject) {
                            rateLimiter.limiter(async function (url, options) {
                                try {
                                    const result = loadURL(url, options)
                                    fulfill(result)
                                } catch (e) {
                                    reject(e)
                                }
                            })(url, options)
                        })
                    }

                    else {
                        return loadURL(url, options);
                    }
                }
            }

            function loadURL(url, options) {

                url = mapUrl(url);

                options = options || {};

                let oauthToken = options.oauthToken;

                if (!oauthToken) {
                    oauthToken = getOauthToken(url);
                }

                if (!oauthToken) {

                    return getLoadPromise(url, options);

                } else {

                    let token = (typeof oauthToken === 'function') ? oauthToken() : oauthToken;

                    if (token.then && (typeof token.then === 'function')) {
                        return token.then(applyOauthToken);
                    }
                    else {
                        return applyOauthToken(token);
                    }
                }


                function applyOauthToken(token) {
                    if (token) {
                        options.token = token;
                    }

                    return getLoadPromise(url, options);
                }

                function getLoadPromise(url, options) {

                    return new Promise(function (fullfill, reject) {


                        var header_keys, key, value, i;

                        // Various Google tansformations
                        if (igv.google.isGoogleURL(url)) {
                            if(url.startsWith("gs://")){
                                url = igv.google.translateGoogleCloudURL(url)
                            } else if(igv.google.isGoogleStorageURL(url)) {
                                if(!url.includes("altMedia=")) {
                                    url += (url.includes("?") ? "&altMedia=true" : "?altMedia=true")
                                }
                            }
                            url = igv.google.addApiKey(url);
                        }


                        const headers = options.headers || {};
                        if (options.token) {
                            addOauthHeaders(headers, options.token);
                        }

                        const range = options.range;
                        const isChrome = navigator.userAgent.indexOf('Chrome') > -1;
                        const isSafari = navigator.vendor.indexOf("Apple") == 0 && /\sSafari\//.test(navigator.userAgent);

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
                            header_keys = Object.keys(headers);
                            for (i = 0; i < header_keys.length; i++) {
                                key = header_keys[i];
                                value = headers[key];
                                // console.log("Adding to header: " + key + "=" + value);
                                xhr.setRequestHeader(key, value);
                            }
                        }

                        // NOTE: using withCredentials with servers that return "*" for access-allowed-origin will fail
                        if (options.withCredentials === true) {
                            xhr.withCredentials = true;
                        }

                        xhr.onload = function (event) {
                            // when the url points to a local file, the status is 0 but that is no error
                            if (xhr.status == 0 || (xhr.status >= 200 && xhr.status <= 300)) {
                                if (range && xhr.status != 206 && range.start !== 0) {
                                    // For small files a range starting at 0 can return the whole file => 200
                                    handleError("ERROR: range-byte header was ignored for url: " + url);
                                }
                                else {
                                    fullfill(xhr.response);
                                }
                            } else if ((typeof gapi !== "undefined") &&
                                ((xhr.status === 404 || xhr.status === 401) && igv.google.isGoogleURL(url)) &&
                                !options.retries) {

                                options.retries = 1;

                                return getGoogleAccessToken()

                                    .then(function (accessToken) {

                                        options.oauthToken = accessToken;

                                        igv.xhr.load(url, options)
                                            .then(function (response) {
                                                fullfill(response);
                                            })
                                            .catch(function (error) {
                                                if (reject) {
                                                    reject(error);
                                                }
                                                else {
                                                    throw(error);
                                                }
                                            })
                                    })


                            } else {

                                //
                                if (xhr.status === 403) {
                                    handleError("Access forbidden")
                                } else if (xhr.status === 416) {
                                    //  Tried to read off the end of the file.   This shouldn't happen, but if it does return an
                                    handleError("Unsatisfiable range");
                                }
                                else {// TODO -- better error handling
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
                            }
                            else {
                                throw new Error(message);
                            }
                        }
                    });
                }
            };
        },

        loadArrayBuffer: function (url, options) {

            options = options || {};
            options.responseType = "arraybuffer";

            if (url instanceof File) {
                return loadFileSlice(url, options);
            } else {

                return igv.xhr.load(url, options);
            }

        },

        loadJson: function (url, options) {

            options = options || {};

            var method = options.method || (options.sendData ? "POST" : "GET");

            if (method == "POST") options.contentType = "application/json";

            return igv.xhr.load(url, options)

                .then(function (result) {

                    if (result) {
                        return JSON.parse(result);
                    }
                    else {
                        return result;
                    }
                })

        },

        loadString: function (path, options) {

            options = options || {};

            if (path instanceof File) {
                return loadStringFromFile(path, options);
            } else {
                return loadStringFromUrl(path, options);
            }
        },

        startup: startup
    }


    function loadFileSlice(localfile, options) {

        return new Promise(function (fullfill, reject) {

            var fileReader,
                blob,
                rangeEnd;

            fileReader = new FileReader();

            fileReader.onload = function (e) {

                fullfill(fileReader.result);

            };

            fileReader.onerror = function (e) {
                console.log("reject uploading local file " + localfile.name);
                reject(null, fileReader);
            };

            if (options.range) {
                rangeEnd = options.range.start + options.range.size - 1;
                blob = localfile.slice(options.range.start, rangeEnd + 1);
                if ("arraybuffer" === options.responseType) {
                    fileReader.readAsArrayBuffer(blob);
                } else {
                    fileReader.readAsBinaryString(blob);
                }
            } else {
                if ("arraybuffer" === options.responseType) {
                    fileReader.readAsArrayBuffer(localfile);
                }
                else {
                    fileReader.readAsBinaryString(localfile);
                }
            }

        });

    }

    function loadStringFromFile(localfile, options) {

        return new Promise(function (fullfill, reject) {

            var fileReader = new FileReader();
            var compression;

            if (options.bgz) {
                compression = BGZF;
            } else if (localfile.name.endsWith(".gz")) {
                compression = GZIP;
            } else {
                compression = NONE;
            }

            fileReader.onload = function (e) {

                if (compression === NONE) {
                    return fullfill(fileReader.result);
                }
                else {
                    return fullfill(arrayBufferToString(fileReader.result, compression));
                }
            };

            fileReader.onerror = function (e) {
                console.log("reject uploading local file " + localfile.name);
                reject(null, fileReader);
            };

            if (compression === NONE) {
                fileReader.readAsText(localfile);
            }
            else {
                fileReader.readAsArrayBuffer(localfile);
            }

        });

    }

    function loadStringFromUrl(url, options) {

        var compression,
            fn,
            idx;

        if (options === undefined) options = {};

        fn = options.filename || igv.getFilename(url);

        if (options.bgz) {
            compression = BGZF;
        } else if (fn.endsWith(".gz")) {
            compression = GZIP;
        } else {
            compression = UNKNOWN;
        }

        options.responseType = "arraybuffer";
        return igv.xhr.load(url, options)
            .then(function (data) {
                return arrayBufferToString(data, compression);
            })


        function getFilename(url, options) {

            if (options.filename) {
                return Promise.resolve(options.filename);
            }
        }

    }

    function isAmazonV4Signed(url) {
        return url.indexOf("X-Amz-Signature") > -1;
    }

    function getOauthToken(url) {

        if (igv) {
            const host = igv.parseUri(url).host;
            let token = igv.oauth.getToken(host);
            if (!token && igv.google.isGoogleURL(url)) {
                token = igv.oauth.google.access_token;
            }
            return token;
        }
        else {
            return undefined;
        }
    }

    function addOauthHeaders(headers, acToken) {
        {
            if (acToken) {
                headers["Cache-Control"] = "no-cache";
                headers["Authorization"] = "Bearer " + acToken;
            }
            return headers;
        }
    }

    /**
     * Perform some well-known url mappings.  For now just handles dropbox urls
     * @param url
     */
    function mapUrl(url) {

        if (url.includes("//www.dropbox.com")) {
            return url.replace("//www.dropbox.com", "//dl.dropboxusercontent.com");
        } else if (url.includes("//drive.google.com")) {
            return igv.google.driveDownloadURL(url);
        } else if (url.includes("//www.broadinstitute.org/igvdata")) {
            return url.replace("//www.broadinstitute.org/igvdata", "//data.broadinstitute.org/igvdata");
        } else if (url.includes("//igvdata.broadinstitute.org")) {
            return url.replace("//igvdata.broadinstitute.org", "https://dn7ywbm9isq8j.cloudfront.net")
        } else {
            return url;
        }
    }


    function arrayBufferToString(arraybuffer, compression) {

        var plain, inflate;

        if (compression === UNKNOWN && arraybuffer.byteLength > 2) {

            const m = new Uint8Array(arraybuffer, 0, 2)
            if (m[0] === 31 && m[1] === 139) {
                compression = GZIP
            }
        }

        if (compression === GZIP) {
            inflate = new Zlib.Gunzip(new Uint8Array(arraybuffer));
            plain = inflate.decompress();
        }
        else if (compression === BGZF) {
            plain = new Uint8Array(igv.unbgzf(arraybuffer));
        }
        else {
            plain = new Uint8Array(arraybuffer);
        }

        if ('TextDecoder' in igv.getGlobalObject()) {
            return new TextDecoder().decode(plain);
        }
        else {
            return decodeUTF8(plain);
        }

    };

    function isGoogleDrive(url) {
        return url.indexOf("drive.google.com") >= 0 || url.indexOf("www.googleapis.com/drive") > 0
    }


    function getGoogleAccessToken() {

        if (igv.oauth.google.access_token || loginTried) {

            return Promise.resolve(igv.oauth.google.access_token);

        } else {
            var scope, options, authInstance;

            authInstance = gapi.auth2.getAuthInstance();
            if (!authInstance) {
                igv.browser.presentAlert("Authorization is required, but Google oAuth has not been initalized.  Contact your site administrator for assistance.")
                return undefined;
            }
            else {
                scope = "https://www.googleapis.com/auth/devstorage.read_only https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.readonly";

                options = new gapi.auth2.SigninOptionsBuilder();
                options.setPrompt('select_account');
                options.setScope(scope);

                loginTried = true;

                return new Promise(function (resolve, reject) {

                    igv.browser.presentMessageWithCallback("Google Login required", function () {

                        gapi.auth2.getAuthInstance().signIn(options)

                            .then(function (user) {

                                var authResponse = user.getAuthResponse();

                                igv.setGoogleOauthToken(authResponse["access_token"]);

                                resolve(authResponse["access_token"]);
                            })
                            .catch(reject);
                    })
                })
            }
        }

    }


    //Increments an anonymous usage count.  Count is anonymous, needed for our continued funding.  Please don't delete

    let startupCalls = 0;

    function startup() {

        const href = window.document.location.href;
        const host = igv.parseUri(href).host;

        if (startupCalls === 0 && !href.includes("localhost") && !href.includes("127.0.0.1")) {
            startupCalls++;

            var url = "https://data.broadinstitute.org/igv/projects/current/counter_igvjs.php?version=" + "0";
            igv.xhr.load(url).then(function (ignore) {
                console.log(ignore);
            }).catch(function (error) {
                console.log(error);
            });

        }
    }

    function validateIP(address) {

        const regex = new RegExp(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
        return regex.test(address);
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

    return igv;
})
(igv || {});
