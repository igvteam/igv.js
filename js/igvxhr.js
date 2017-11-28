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
    igv.xhr = {};


    igv.xhr.load = function (url, options) {

        url = mapUrl(url);

        options = options ||  {};

        if (!options.oauthToken) {
            return getLoadPromise(url, options);
        } else {

            var token = _.isFunction(options.oauthToken) ? options.oauthToken() : options.oauthToken;

            if (token.then && _.isFunction(token.then)) {
                return token.then(applyOauthToken);
            }
            else {
                return applyOauthToken(token);
            }
        }

        ////////////

        function applyOauthToken(token) {
            if (token) {
                options.token = token;
            }

            return getLoadPromise(url, options);
        }

        function getLoadPromise(url, options) {

            return new Promise(function (fullfill, reject) {

                var xhr = new XMLHttpRequest(),
                    sendData = options.sendData || options.body,
                    method = options.method || (sendData ? "POST" : "GET"),
                    range = options.range,
                    responseType = options.responseType,
                    contentType = options.contentType,
                    mimeType = options.mimeType,
                    headers = options.headers || {},
                    isSafari = navigator.vendor.indexOf("Apple") == 0 && /\sSafari\//.test(navigator.userAgent),
                    withCredentials = options.withCredentials,
                    header_keys, key, value, i;

                // Support for GCS paths.
                url = url.startsWith("gs://") ? igv.Google.translateGoogleCloudURL(url) : url;

                if (options.token) {
                    headers["Authorization"] = 'Bearer ' + options.token;
                }

                if (isGoogleURL(url)) {

                    url = igv.Google.addApiKey(url);

                    // Add google headers (e.g. oAuth)
                    headers = headers || {};
                    igv.Google.addGoogleHeaders(headers);

                } else if (options.oauth) {
                    // "Legacy" option -- do not use (use options.token)
                    addOauthHeaders(headers)
                }

                if (range) {
                    // Hack to prevent caching for byte-ranges. Attempt to fix net:err-cache errors in Chrome
                    url += url.includes("?") ? "&" : "?";
                    url += "someRandomSeed=" + Math.random().toString(36);
                }

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
                if (withCredentials === true) {
                    xhr.withCredentials = true;
                }

                xhr.onload = function (event) {
                    // when the url points to a local file, the status is 0 but that is no error
                    if (xhr.status == 0 || (xhr.status >= 200 && xhr.status <= 300)) {

                        if (range && xhr.status != 206) {
                            handleError("ERROR: range-byte header was ignored for url: " + url);
                        }
                        else {
                            fullfill(xhr.response);
                        }
                    }
                    else {

                        //
                        if (xhr.status === 416) {
                            //  Tried to read off the end of the file.   This shouldn't happen, but if it does return an
                            handleError("Unsatisfiable range");
                        }
                        else {// TODO -- better error handling
                            handleError(xhr.status);
                        }

                    }

                };

                xhr.onerror = function (event) {

                    if (isCrossDomain(url) && !options.crossDomainRetried &&
                        igv.browser &&
                        igv.browser.crossDomainProxy &&
                        url != igv.browser.crossDomainProxy) {

                        options.sendData = "url=" + url;
                        options.crossDomainRetried = true;

                        igv.xhr.load(igv.browser.crossDomainProxy, options).then(fullfill);
                    }
                    else {
                        handleError("Error accessing resource: " + url + " Status: " + xhr.status);
                    }
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

    igv.xhr.loadArrayBuffer = function (url, options) {

        options = options || {};

        if (url instanceof File) {
            return loadFileSlice(url, options);
        } else {
            options.responseType = "arraybuffer";
            return igv.xhr.load(url, options);
        }

    };

    igv.xhr.loadJson = function (url, options) {

        options = options || {};
        
        var method = options.method || (options.sendData ? "POST" : "GET");

        if (method == "POST") options.contentType = "application/json";

        return new Promise(function (fullfill, reject) {

            igv.xhr
                .load(url, options)
                .then(function (result) {
                    if (result) {
                        fullfill(JSON.parse(result));
                    }
                    else {
                        fullfill(result);
                    }
                })
                .catch(reject);
        })
    };

    igv.xhr.loadString = function (path, options) {

        options = options || {};

        if (path instanceof File) {
            return loadStringFromFile(path, options);
        } else {
            return loadStringFromUrl(path, options);
        }
    };


    function loadFileSlice(localfile, options) {

        return new Promise(function (fullfill, reject) {

            var fileReader,
                blob,
                rangeEnd;

            fileReader = new FileReader();

            fileReader.onload = function (e) {

                var compression,
                    result;

                if (options.bgz) {
                    compression = BGZF;
                } else if (localfile.name.endsWith(".gz")) {
                    compression = GZIP;
                } else {
                    compression = NONE;
                }

                // result = igv.xhr.arrayBufferToString(fileReader.result, compression);
                // console.log('loadFileSlice byte length ' + fileReader.result.byteLength);

                fullfill(fileReader.result);

            };

            fileReader.onerror = function (e) {
                console.log("reject uploading local file " + localfile.name);
                reject(null, fileReader);
            };

            if (options.range) {
                rangeEnd = options.range.start + options.range.size - 1;
                blob = localfile.slice(options.range.start, rangeEnd + 1);
                fileReader.readAsArrayBuffer(blob);
            } else {
                fileReader.readAsArrayBuffer(localfile);
            }

        });

    }

    function loadStringFromFile(localfile, options) {

        return new Promise(function (fullfill, reject) {

            var fileReader = new FileReader();

            fileReader.onload = function (e) {

                var compression,
                    result;

                if (options.bgz) {
                    compression = BGZF;
                } else if (localfile.name.endsWith(".gz")) {
                    compression = GZIP;
                } else {
                    compression = NONE;
                }

                result = arrayBufferToString(fileReader.result, compression);

                fullfill(result);

            };

            fileReader.onerror = function (e) {
                console.log("reject uploading local file " + localfile.name);
                reject(null, fileReader);
            };

            fileReader.readAsArrayBuffer(localfile);

        });

    }

    function loadStringFromUrl(url, options) {

        var compression,
            fn,
            idx;

        if (options === undefined) options = {};

        // Strip parameters from path
        // TODO -- handle local files with ?
        idx = url.indexOf("?");
        fn = idx > 0 ? url.substring(0, idx) : url;

        if (options.bgz) {
            compression = BGZF;
        } else if (fn.endsWith(".gz")) {
            compression = GZIP;
        } else {
            compression = NONE;
        }

        if (compression === NONE) {
            options.mimeType = 'text/plain; charset=x-user-defined';
            return igv.xhr.load(url, options);
        } else {
            options.responseType = "arraybuffer";
            return igv.xhr.load(url, options)
                .then(function (data) {
                    return arrayBufferToString(data, compression);
                })
        }
    }

    function isCrossDomain(url) {

        var origin = window.location.origin;

        return !url.startsWith(origin);

    }

    /**
     * Legacy method to add oauth tokens.  Kept for backward compatibility.  Do not use -- use config.token setting instead.
     * @param headers
     * @returns {*}
     */
    function addOauthHeaders(headers) {
        {
            headers["Cache-Control"] = "no-cache";

            var acToken = igv.oauth.google.access_token;
            if (!acToken && typeof oauth !== "undefined") {
                // Check legacy variable
                acToken = oauth.google.access_token;
            }
            if (acToken && !headers.hasOwnProperty("Authorization")) {
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
        }
        else if (url.includes("//drive.google.com")) {
            return igv.Google.driveDownloadURL(url);
        }
        else {
            return url;
        }
    }


    function arrayBufferToString(arraybuffer, compression) {

        var plain, inflate;

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

        var result = "";
        for (var i = 0, len = plain.length; i < len; i++) {
            result = result + String.fromCharCode(plain[i]);
        }
        return result;
    };

    /**
     * Crude test for google urls.
     */
    function isGoogleURL(url) {
        return url.includes("googleapis")  && !url.includes("urlshortener");
    }

// Increments an anonymous usage count.  Count is anonymous, needed for our continued funding.  Please don't delete
    const href = window.document.location.href;
    if (!(href.includes("localhost") || href.includes("127.0.0.1"))) {
        var url = "https://data.broadinstitute.org/igv/projects/current/counter_igvjs.php?version=" + "0";
        igv.xhr.load(url).then(function (ignore) {
            console.log(ignore);
        }).catch(function (error) {
            console.log(error);
        });
    }


    return igv;
})
(igv || {});
