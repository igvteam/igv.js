var igvxhr = (function (igvxhr) {

    igvxhr.loadArrayBuffer = function (url, options) {
        options.responseType = "arraybuffer";
        igvxhr.load(url, options);
    }

    igvxhr.load = function (url, options) {

        var xhr = new XMLHttpRequest(),
            method = options.method || "GET",
            success = options.success,
            error = options.error || options.success,
            abort = options.abort || options.error,
            timeout = options.timeout || options.error,
            task = options.task,
            range = options.range,
            responseType = options.responseType;

        if (task) task.xhrRequest = xhr;

        xhr.open(method, url);

        if (range) {
            var rangeEnd = range.start + range.size - 1;
            xhr.setRequestHeader("Range", "bytes=" + range.start + "-" + rangeEnd);
            xhr.setRequestHeader("Cache-control", "no-cache");
            xhr.setRequestHeader("If-None-Match", Math.random().toString(36));  // For nasty safari bug https://bugs.webkit.org/show_bug.cgi?id=82672
        }

        // retrieve data as an array buffer
        if (responseType) {
            xhr.responseType = responseType;
        }

        xhr.onload = function (event) {

            success(xhr.response, xhr);

        }

        xhr.onerror = function (event) {
            error(null, xhr);
        }

        xhr.ontimeout = function (event) {
            timeout(null, xhr);
        }

        xhr.onabort = function (event) {
            console.log("Aborted");
            abort(null, xhr);
        }

        xhr.send();

    }

    /**
     * Load a "raw" string.  This method could have been written on top of loading an array buffer, but less
     * effeciently.
     *
     * @param continuation
     * @param task
     */
    igvxhr.loadString = function (url, options) {

        var xhr,
            success = options.success,
            error = options.error || options.success,
            abort = options.abort || options.error,
            timeout = options.timeout || options.error,
            range = options.range,
            task = options.task;

        if (task) task.xhrRequest = xhr;

        if (url.endsWith(".gz")) {
            igvxhr.load(url,
                {
                    range: range,
                    success: function (data) {
                        var inflate = new Zlib.Gunzip(new Uint8Array(data));
                        var plain = inflate.decompress();
                        var result = "";
                        for (var i = 0, len = plain.length; i < len; i++) {
                            result = result + String.fromCharCode(plain[i]);
                        }
                        success(result);
                    },
                    error: error,
                    abort: abort,
                    timeout: timeout,
                    task: task,
                    responseType: "arraybuffer"
                });

        }
        else {

            xhr = new XMLHttpRequest();   // Note: $.ajax was unreliable with range headers

            if (task) task.xhrRequest = xhr;

            xhr.open("GET", url);

            if (range) {
                var rangeEnd = range.start + range.size - 1;
                xhr.setRequestHeader("Range", "bytes=" + range.start + "-" + rangeEnd);
                xhr.setRequestHeader("Cache-control", "no-cache");
                xhr.setRequestHeader("If-None-Match", Math.random().toString(36));  // For nasty safari bug https://bugs.webkit.org/show_bug.cgi?id=82672
            }

            // retrieve data unprocessed as a binary string
            xhr.overrideMimeType('text/plain; charset=x-user-defined');

            xhr.onload = function (event) {

                var data = xhr.responseText;
                //   console.log("Data received for: " + loader.url + "  size: " + data.length + "  Status = " + status);
                success(data, xhr);
            }

            xhr.onerror = function (event) {
                console.log("Error: " + event);
                error(null, xhr);
            }

            xhr.ontimeout = function (event) {
                timeout(null, xhr);
            }

            xhr.onabort = function (event) {
                console.log("Aborted");
                abort(null, xhr);
            }

            xhr.send();
        }
    }


    return igvxhr;

})(igvxhr || {});

