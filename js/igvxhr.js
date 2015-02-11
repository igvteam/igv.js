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

var igvxhr = (function (igvxhr) {

    // Compression types
    const NONE = 0;
    const GZIP = 1;
    const BGZF = 2;


    igvxhr.loadArrayBuffer = function (url, options) {
        options.responseType = "arraybuffer";
        igvxhr.load(url, options);
    }

    igvxhr.loadJson = function (url, options) {

        var success = options.success;

        options.contentType = "application/json";
        options.success = function (result) {
            if (result) {
                success(JSON.parse(result));
            }
            else {
                success(null);
            }
        };

        igvxhr.load(url, options);

    }

    /**
     * Load a "raw" string.
     */
    igvxhr.loadString = function (url, options) {

        var success = options.success,
            compression, result;

        if (options.bgz) {
            compression = BGZF;
        }
        else if (url.endsWith(".gz")) {

            compression = GZIP;
        }
        else {
            compression = NONE;
        }

        if (compression === NONE) {

            options.mimeType = 'text/plain; charset=x-user-defined';
            igvxhr.load(url, options);
        }
        else {
            options.responseType = "arraybuffer";
            options.success = function (data) {
                var result = igv.arrayBufferToString(data, compression);
                success(result);
            };
            igvxhr.load(url, options);

        }


    }

    igvxhr.load = function (url, options) {

        var xhr = new XMLHttpRequest(),
            sendData = options.sendData,
            method = options.method || (sendData ? "POST" : "GET"),
            success = options.success,
            error = options.error || success,
            abort = options.abort || error,
            timeout = options.timeout || error,
            task = options.task,
            range = options.range,
            responseType = options.responseType,
            contentType = options.contentType,
            mimeType = options.mimeType,
            headers = options.headers,
            header_keys, key, value, i;

        if (task) task.xhrRequest = xhr;

        xhr.open(method, url);

        if (range) {
            var rangeEnd = range.start + range.size - 1;
            xhr.setRequestHeader("Range", "bytes=" + range.start + "-" + rangeEnd);
            xhr.setRequestHeader("Cache-control", "no-cache");
            xhr.setRequestHeader("If-None-Match", Math.random().toString(36));  // For nasty safari bug https://bugs.webkit.org/show_bug.cgi?id=82672
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
                console.log("Adding to header: " + key + "=" + value);
                xhr.setRequestHeader(key, value);
            }
        }

        xhr.onload = function (event) {
            // when the url points to a local file, the status is 0 but that is no error
            if (xhr.status == 0 || (xhr.status >= 200 && xhr.status <= 300)) {
                success(xhr.response, xhr);
            }
            else {
                error(null, xhr);
            }

        }

        xhr.onerror = function (event) {

            if (isCrossDomain(url) && url) {
                // Try the proxy, if it exists.  Presumably this is a php file
                if (igv.browser.crossDomainProxy && url != igv.browser.crossDomainProxy) {

                    options.sendData = "url=" + url;

                    igvxhr.load(igv.browser.crossDomainProxy, options);
                    return;
                }
            }
            error(null, xhr);
        }

        xhr.ontimeout = function (event) {
            timeout(null, xhr);
        }

        xhr.onabort = function (event) {
            console.log("Aborted");
            abort(null, xhr);
        }

        xhr.send(sendData);

    }

    igvxhr.loadHeader = function (url, options) {

        var xhr = new XMLHttpRequest(),
            method = "HEAD",
            success = options.success,
            error = options.error || success,
            timeout = options.timeout || error,
            headers = options.headers,
            header_keys, key, value, i;

        xhr.open(method, url);

        if (headers) {
            header_keys = Object.keys(headers);
            for (i = 0; i < header_keys.length; i++) {
                key = header_keys[i];
                value = headers[key];
                if (console && console.log) console.log("Adding to header: " + key + "=" + value);
                xhr.setRequestHeader(key, value);
            }
        }

        xhr.onload = function (event) {

            var headerStr = xhr.getAllResponseHeaders();
            var headerDictionary = parseResponseHeaders(headerStr);
            success(headerDictionary);
        }

        xhr.onerror = function (event) {

            console.log("XMLHttpRequest - Error loading" + url);
            error(event);
        }


        xhr.ontimeout = function (event) {
            timeout(event);
        }


        xhr.send();

        /**
         * XmlHttpRequest's getAllResponseHeaders() method returns a string of response
         * headers according to the format described here:
         * http://www.w3.org/TR/XMLHttpRequest/#the-getallresponseheaders-method
         * This method parses that string into a user-friendly key/value pair object.
         */
        function parseResponseHeaders(headerStr) {
            var headers = {};
            if (!headerStr) {
                return headers;
            }
            var headerPairs = headerStr.split('\u000d\u000a');
            for (var i = 0, len = headerPairs.length; i < len; i++) {
                var headerPair = headerPairs[i];
                var index = headerPair.indexOf('\u003a\u0020');
                if (index > 0) {
                    var key = headerPair.substring(0, index);
                    var val = headerPair.substring(index + 2);
                    headers[key] = val;
                }
            }
            return headers;
        }

    }


    igvxhr.getContentLength = function (url, options) {

        var continuation = options.success;

        if (!options.error) {
            options.error = function () {
                continuation(-1);
            }
        }

        options.success = function (header) {
            var contentLengthString = header ? header["Content-Length"] : null;
            if (contentLengthString) {
                continuation(parseInt(contentLengthString));
            }
            else {
                continuation(-1);
            }

        }

        igvxhr.loadHeader(url, options);
    }

    igvxhr.loadStringFromFile = function (localfile, options) {

        var fileReader = new FileReader(),
            success = options.success,
            error = options.error || options.success,
            abort = options.abort || options.error,
            timeout = options.timeout || options.error,
            range = options.range;


        fileReader.onload = function (e) {

            var compression, result;

            if (options.bgz) {
                compression = BGZF;
            }
            else if (localfile.name.endsWith(".gz")) {

                compression = GZIP;
            }
            else {
                compression = NONE;
            }

            result = igv.arrayBufferToString(fileReader.result, compression);

            success(result, localfile);

        };

        fileReader.onerror = function (e) {
            console.log("error uploading local file " + localfile.name);
            error(null, fileReader);
        };

        fileReader.readAsArrayBuffer(localfile);

    }


    function isCrossDomain(url) {

        var origin = window.location.origin;

        return !url.startsWith(origin);

    }


    igv.arrayBufferToString = function (arraybuffer, compression) {

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
    }

    return igvxhr;

})(igvxhr || {});

