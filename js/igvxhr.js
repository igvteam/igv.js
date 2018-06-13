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

        options = options || {};

        if (url instanceof File) {
            return loadFileSlice(url, options);
        } else {
            return load.call(this, url, options);
        }

    };


    function load(url, options) {

        url = mapUrl(url);

        options = options || {};

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
                    isChrome = navigator.userAgent.indexOf('Chrome') > -1,
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

                if (range && isChrome && !isAmazonV4Signed(url)) {
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
                    } else if ((typeof gapi !== "undefined") && (xhr.status === 404 || xhr.status == 403 && isGoogleURL(url)) && !options.retries) {

                        options.retries = 1;

                        return getAccessToken()
                            .then(function (accessToken) {
                                options.oauthToken = accessToken;
                                igv.xhr.load(url, options)
                                    .then(function (response) {
                                        fullfill(response);
                                    })
                                    .catch(function (error) {
                                        reject(error);
                                    })
                            })

                    } else {

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

                        load.call(this, igv.browser.crossDomainProxy, options)
                            .then(fullfill);
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
        options.responseType = "arraybuffer";

        if (url instanceof File) {
            return loadFileSlice(url, options);
        } else {

            return load.call(this, url, options);
        }

    };

    igv.xhr.loadJson = function (url, options) {

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
            compression = NONE;
        }

        if (compression === NONE) {
            options.mimeType = 'text/plain; charset=x-user-defined';
            return load.call(this, url, options);
        } else {
            options.responseType = "arraybuffer";
            return load.call(this, url, options)
                .then(function (data) {
                    return arrayBufferToString(data, compression);
                })
        }


        function getFilename(url, options) {
            
            if(options.filename) {
                return Promise.resolve(options.filename);
            }
        }
        
    }

    function isCrossDomain(url) {

        var origin = window.location.origin;

        return !url.startsWith(origin);

    }


    function isAmazonV4Signed(url) {
        return url.indexOf("X-Amz-Signature") > -1;
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
        else if (url.includes("//www.broadinstitute.org/igvdata")) {
            return url.replace("//www.broadinstitute.org/igvdata", "//data.broadinstitute.org/igvdata");
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

        return new TextDecoder().decode(plain);

    };

    /**
     * Crude test for google urls.
     */
    function isGoogleURL(url) {
        return url.includes("googleapis") && !url.includes("urlshortener");
    }

// Increments an anonymous usage count.  Count is anonymous, needed for our continued funding.  Please don't delete
    const href = window.document.location.href;
    if (!(href.includes("localhost") || href.includes("127.0.0.1"))) {
        var url = "https://data.broadinstitute.org/igv/projects/current/counter_igvjs.php?version=" + "0";
        load.call(this, url).then(function (ignore) {
            console.log(ignore);
        }).catch(function (error) {
            console.log(error);
        });
    }

    function getAccessToken() {

        if (igv.oauth.google.access_token) {
            return Promise.resolve(igv.oauth.google.access_token);
        } else {
            var scope, options;

            scope = "https://www.googleapis.com/auth/devstorage.read_only https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.readonly";

            options = new gapi.auth2.SigninOptionsBuilder();
            //options.setAppPackageName('com.example.app');
            //options.setFetchBasicProfile(true);
            options.setPrompt('select_account');
            options.setScope(scope);

            return gapi.auth2.getAuthInstance().signIn(options)

                .then(function (user) {

                    var authResponse = user.getAuthResponse();

                    igv.setGoogleOauthToken(authResponse["access_token"]);

                    return authResponse["access_token"];
                })
        }

    }


    return igv;
})
(igv || {});
