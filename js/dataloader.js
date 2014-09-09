var igv = (function (igv) {

    igv.DataLoader = function (url) {
        this.url = url;
    }

    igv.DataLoader.prototype.loadBinaryString = function (continuation, task) {

        if (this.url.endsWith(".gz")) {
            this.loadArrayBuffer(function (data) {
                    var inflate = new Zlib.Gunzip(new Uint8Array(data));
                    var plain = inflate.decompress();
                    var result = "";
                    for (var i = 0, len = plain.length; i < len; i++) {
                        result = result + String.fromCharCode(plain[i]);
                    }
                    continuation(result);
                },
                task);
        }
        else {

            var loader = this;

            var oReq = new XMLHttpRequest();   // Note: $.ajax was unreliable with range headers

            if (task) task.xhrRequest = oReq;

            oReq.open("GET", this.url);

            if (this.range) {
                var rangeEnd = this.range.start + this.range.size - 1;
                oReq.setRequestHeader("Range", "bytes=" + this.range.start + "-" + rangeEnd);
                oReq.setRequestHeader("Cache-control", "no-cache");
                oReq.setRequestHeader("If-None-Match", Math.random().toString(36));  // For nasty safari bug https://bugs.webkit.org/show_bug.cgi?id=82672
            }

            // retrieve data unprocessed as a binary string
            oReq.overrideMimeType('text/plain; charset=x-user-defined');

            oReq.onload = function (event) {

                loader.status = oReq.status;
                var data = oReq.responseText;
                //   console.log("Data received for: " + loader.url + "  size: " + data.length + "  Status = " + status);
                continuation(data);
            }

            oReq.onerror = function (event) {
                console.log("Error: " + event);
                continuation(null);
            }

            oReq.ontimeout = function (event) {
                // TODO -- handle this
            }

            oReq.send();
        }
    }


    igv.DataLoader.prototype.loadArrayBuffer = function (continuation, task) {


        var oReq = new XMLHttpRequest();

        if (task) task.xhrRequest = oReq;

        oReq.open("GET", this.url);

        if (this.range) {
            var rangeEnd = this.range.start + this.range.size - 1;
            oReq.setRequestHeader("Range", "bytes=" + this.range.start + "-" + rangeEnd);
            oReq.setRequestHeader("Cache-control", "no-cache");
            oReq.setRequestHeader("If-None-Match", Math.random().toString(36));  // For nasty safari bug https://bugs.webkit.org/show_bug.cgi?id=82672
        }

        // retrieve data as an array buffer
        oReq.responseType = "arraybuffer";

        var loader = this;
        oReq.onload = function (event) {

            loader.status = oReq.status;
            var arrayBuffer = oReq.response;
            continuation(arrayBuffer);

        }

        oReq.onerror = function (event) {
            //    console.log("Error: " + oReq.responseText);

            if (loader.onerror) {
                loader.onerror(event);
            }
            else {
                continuation(null);
            }
        }

        oReq.ontimeout = function (event) {
            // TODO -- handle this
        }

        oReq.onabort = function (event) {
            console.log("Aborted");
            continuation(null);
        }

        oReq.send();

    }


    igv.DataLoader.prototype.postJson = function (data, continuation, task) {

        var loader = this,
            oReq = new XMLHttpRequest();

        if(task) task.xhrRequest = oReq;

        oReq.open("POST", this.url);

        oReq.setRequestHeader("Content-Type", "application/json");

        oReq.onload = function (event) {

            loader.status = oReq.status;
            var resp = oReq.responseText;
            continuation(resp);

        }

        oReq.onerror = function (event) {
            //    console.log("Error: " + oReq.responseText);

            if (loader.onerror) {
                loader.onerror(event);
            }
            else {
                continuation(null);
            }
        }

        oReq.ontimeout = function (event) {
            // TODO -- handle this
        }

        oReq.onabort = function (event) {
            console.log("Aborted");
            continuation(null);
        }

        oReq.send(JSON.stringify(data));

    }

    igv.DataLoader.prototype.loadHeader = function (continuation) {


        // Define lexically so "this" is available in callbacks
        var loader = this;

        var oReq = new XMLHttpRequest();

        oReq.open("HEAD", this.url);

        oReq.onload = function (event) {

            loader.status = oReq.status;
            var headerStr = oReq.getAllResponseHeaders();
            var headerDictionary = parseResponseHeaders(headerStr);
            continuation(headerDictionary);
        }

        oReq.onerror = function (event) {

            console.log("XMLHttpRequest - Error loading" + loader.url);

            if (loader.onerror) {
                loader.onerror(event);
            }
            else {
                continuation(null);
            }
        }


        oReq.ontimeout = function (event) {
            // TODO -- handle this
        }


        oReq.send();

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

    igv.DataLoader.prototype.getContentLength = function (continuation) {

        var loader = this;
        loader.onerror = function () {
            continuation(-1);
        }
        loader.loadHeader(function (header) {
            var contentLengthString = header ? header["Content-Length"] : null;
            if (contentLengthString) {
                continuation(parseInt(contentLengthString));
            }
            else {
                continuation(-1);
            }

        });
    }


    /**
     *   @deprecated -- THIS FUNCTION IS DEPRECATED.  USE AN igv.DataLoader object.
     * @param url
     * @param callback - function to execute upon successful data load.  Function should take the data as a string.
     * @param range - optional object defining byte range.   {start end}
     */
    igv.loadData = function (url, callback, range) {

        var loader = new igv.DataLoader(url);
        if (range)  loader.range = range;
        loader.loadBinaryString(callback);

    }


    // Note: adapted from http://www.html5rocks.com/en/tutorials/cors/
    createCORSRequest = function (url) {

        var xhr = new XMLHttpRequest();
        if ("withCredentials" in xhr) {
            // XHR for Chrome/Firefox/Opera/Safari.
            xhr.open("GET", url, true);
        } else if (typeof XDomainRequest != "undefined") {
            // XDomainRequest for IE.
            xhr = new XDomainRequest();
            xhr.open(method, url);
        } else {
            // CORS not supported.
            xhr = null;
        }
        return xhr;
    }


    // Some convenience methods


    return igv;

})(igv || {});

