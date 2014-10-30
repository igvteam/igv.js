var igvxhr = (function (igvxhr) {

    igvxhr.loadArrayBuffer = function (url, options) {
        options.responseType = "arraybuffer";
        igvxhr.load(url, options);
    }

    igvxhr.loadJson = function(url, options) {

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

        var success = options.success;

        if (url.endsWith(".gz")) {

            options.responseType = "arraybuffer";
            options.success = function (data) {
                var result = arrayBufferToString(data, true);
                success(result);
            };
            igvxhr.load(url, options);

        }
        else {

            options.mimeType = 'text/plain; charset=x-user-defined';
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
            mimeType = options.mimeType;

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

        xhr.onload = function (event) {

            if (xhr.status >= 200 && xhr.status <= 300) {
                success(xhr.response, xhr);
            }
            else {
                error(null, xhr);
            }

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

        xhr.send(sendData);

    }


    igvxhr.loadStringFromFile = function (localfile, options) {

        var fileReader = new FileReader(),
            success = options.success,
            error = options.error || options.success,
            abort = options.abort || options.error,
            timeout = options.timeout || options.error,
            range = options.range;


        fileReader.onload = function (e) {

            var gzipped = localfile.name.endsWith(".gz"),
                result = arrayBufferToString(fileReader.result, gzipped);

            success(result, localfile);

        };

        fileReader.onerror = function (e) {
            console.log("error uploading local file " + localfile.name);
            error(null, fileReader);
        };

        fileReader.readAsArrayBuffer(localfile);
    }


    function arrayBufferToString(arraybuffer, gzipped) {

        var plain, inflate;

        if (gzipped) {

            var inflate = new Zlib.Gunzip(new Uint8Array(arraybuffer));
            var plain = inflate.decompress();
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

