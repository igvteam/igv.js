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

    var self = this;

    igv.genericContainer = function ($parent, config, closeHandler) {

        var $generic_container,
            $header,
            $fa;

        $generic_container = $('<div>', { class:'igv-generic-container' });
        $parent.append($generic_container);

        // width
        if (config && config.width) {
            $generic_container.width(config.width);
        }

        // height
        if (config && config.height) {
            $generic_container.height(config.height);
        }

        // height
        if (config && config.classes) {
            $generic_container.addClass( config.classes.join(' ') );
        }

        // header
        $header = $('<div>');
        $generic_container.append($header);

        // close button
        $fa = igv.createIcon("times");
        $header.append($fa);

        $fa.on('click', function (e) {
            closeHandler();
        });

        $generic_container.draggable({ handle: $header.get(0) });

        return $generic_container;
    };

    igv.makeDraggable = function ($target, $handle) {
        $handle.on('mousedown', function (event) {

            event.preventDefault();
            event.stopPropagation();

            self.initX = $target.position().left;
            self.initY = $target.position().top;

            self.mousePressX = event.clientX;
            self.mousePressY = event.clientY;

            $handle.on('mousemove', move);

            window.addEventListener('mouseup', function() {
                $handle.off('mousemove');
            }, false);

            function move(e) {

                e.preventDefault();
                e.stopPropagation();

                $target.css({ left:(self.initX + e.clientX - self.mousePressX), top:(self.initY + e.clientY - self.mousePressY) });
            }
        });
    };

    igv.getExtension = function (config) {
        var path,
            filename,
            index;

        if (undefined === config.url) {
            return undefined;
        }

        path = igv.isFilePath(config.url) ? config.url.name : config.url;
        filename = path.toLowerCase();

        //Strip parameters -- handle local files later
        index = filename.indexOf("?");
        if (index > 0) {
            filename = filename.substr(0, index);
        }

        //Strip aux extensions .gz, .tab, and .txt
        if (filename.endsWith(".gz")) {
            filename = filename.substr(0, filename.length - 3);
        } else if (filename.endsWith(".txt") || filename.endsWith(".tab")) {
            filename = filename.substr(0, filename.length - 4);
        }

        index = filename.lastIndexOf(".");

        return index < 0 ? filename : filename.substr(1 + index);
    };

    /**
     * Return the filename from the path.   Example
     *   https://foo.com/bar.bed?param=2   => bar.bed
     * @param path
     */
    igv.getFilename = function (path) {

        var index, filename;

        index = path.lastIndexOf("/");
        filename = index < 0 ? path : path.substr(index+1);

        //Strip parameters -- handle local files later
        index = filename.indexOf("?");
        if (index > 0) {
            filename = filename.substr(0, index);
        }

        return filename;
    }

    igv.filenameOrURLHasSuffix = function  (fileOrURL, suffix) {
        var str = (fileOrURL instanceof File) ? fileOrURL.name : igv.getFilename(fileOrURL);
        return str.toLowerCase().endsWith( suffix )
    };

    igv.isFilePath = function (path) {
        return (path instanceof File);
    };

    igv.makeToggleButton = function (label, configurationKey, get$Target, continuation) {

        var $button;

        $button = $('<div class="igv-nav-bar-button">');
        $button.text(label);

        $button.click(function () {

            var $target = get$Target();

            $target.toggle();

            if (continuation) {
                continuation();
            }
        });


        return $button;
    };

    igv.presentAlert = function (alert, $parent) {

        var string;

        string = alert.message || alert;

        if(httpMessages.hasOwnProperty(string)) {
            string = httpMessages[string];
        }

        igv.alertDialog.configure({ label: string });
        igv.alertDialog.present($parent);
    };

    var httpMessages = {
        "401": "Access unauthorized",
        "403": "Access forbidden",
        "404": "Not found"
    };


    igv.attachDialogCloseHandlerWithParent = function ($parent, closeHandler) {

        var $container,
            $fa;

        $container = $('<div>');
        $parent.append($container);

        $fa = igv.createIcon("times");
        $container.append($fa);

        $fa.click(closeHandler);

    };

    /**
     * Find spinner
     */
    igv.getSpinnerObjectWithParentElement = function (parentElement) {
        return $(parentElement).find("div.igv-spinner-container");
    };

    /**
     * Start the spinner for the parent element, if it has one
     */
    igv.startSpinnerAtParentElement = function (parentElement) {

        var spinnerObject = igv.getSpinnerObjectWithParentElement(parentElement);

        if (spinnerObject) {
            spinnerObject.show();
        }

    };

    /**
     * Stop the spinner for the parent element, if it has one
     * @param parentElement
     */
    igv.stopSpinnerAtParentElement = function (parentElement) {

        var spinnerObject = igv.getSpinnerObjectWithParentElement(parentElement);

        if (spinnerObject) {
            spinnerObject.hide();
        }

    };

    igv.parseUri = function (str) {

        var o = igv.parseUri.options,
            m = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
            uri = {},
            i = 14;

        while (i--) uri[o.key[i]] = m[i] || "";

        uri[o.q.name] = {};
        uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
            if ($1) uri[o.q.name][$1] = $2;
        });

        return uri;
    };

    igv.parseUri.options = {
        strictMode: false,
        key: ["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"],
        q: {
            name: "queryKey",
            parser: /(?:^|&)([^&=]*)=?([^&]*)/g
        },
        parser: {
            strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
            loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
        }
    };

    igv.splitLines  = function (string) {

        var result = string.split(/\n|\r\n|\r/g);
        return result;
    }


    igv.domElementRectAsString = function (element) {
        return " x " + element.clientLeft + " y " + element.clientTop + " w " + element.clientWidth + " h " + element.clientHeight;
    };

    igv.isNumber = function (n) {

        if ("" === n) {

            return false
        } else if (undefined === n) {

            return false;
        } else {

            return !isNaN(parseFloat(n)) && isFinite(n);
        }

    };

    igv.guid = function () {
        return ("0000" + (Math.random() * Math.pow(36, 4) << 0).toString(36)).slice(-4);
    };

    // Returns a random number between min (inclusive) and max (exclusive)
    igv.random = function (min, max) {
        return Math.random() * (max - min) + min;
    };

    igv.prettyBasePairNumber = function (raw) {

        var denom,
            units,
            value,
            floored;

        if (raw > 1e7) {
            denom = 1e6;
            units = " mb";
        } else if (raw > 1e4) {

            denom = 1e3;
            units = " kb";

            value = raw/denom;
            floored = Math.floor(value);
            return igv.numberFormatter(floored) + units;
        } else {
            return igv.numberFormatter(raw) + " bp";
        }

        value = raw/denom;
        floored = Math.floor(value);

        return floored.toString() + units;
    };

    // StackOverflow: http://stackoverflow.com/a/10810674/116169
    igv.numberFormatter = function (rawNumber) {

        var dec = String(rawNumber).split(/[.,]/),
            sep = ',',
            decsep = '.';

        return dec[0].split('').reverse().reduce(function (prev, now, i) {
                return i % 3 === 0 ? prev + sep + now : prev + now;
            }).split('').reverse().join('') + (dec[1] ? decsep + dec[1] : '');
    };

    igv.numberUnFormatter = function (formatedNumber) {

        return formatedNumber.split(",").join().replace(",", "", "g");
    };

    /**
     * Translate the mouse coordinates for the event to the coordinates for the given target element
     * @param e
     * @param target
     * @returns {{x: number, y: number}}
     */
    igv.translateMouseCoordinates = function (e, target) {

        var $target = $(target),
            eFixed,
            posx,
            posy;

        // Sets pageX and pageY for browsers that don't support them
        eFixed = $.event.fix(e);

        if (undefined === $target.offset()) {
            console.log('igv.translateMouseCoordinates - $target.offset() is undefined.');
        }
        posx = eFixed.pageX - $target.offset().left;
        posy = eFixed.pageY - $target.offset().top;

        return {x: posx, y: posy}
    };

    igv.pageCoordinates = function(e) {
        var eFixed;
        // Sets pageX and pageY for browsers that don't support them
        eFixed = $.event.fix(e);
        return {x:  eFixed.pageX, y: eFixed.pageY}
    }



    igv.throttle = function (fn, threshhold, scope) {
        threshhold || (threshhold = 200);
        var last, deferTimer;

        return function () {
            var context = scope || this;

            var now = +new Date,
                args = arguments;
            if (last && now < last + threshhold) {
                // hold on to it
                clearTimeout(deferTimer);
                deferTimer = setTimeout(function () {
                    last = now;
                    fn.apply(context, args);
                }, threshhold);
            } else {
                last = now;
                fn.apply(context, args);
            }
        }
    };

    var foo = typeof igv.throttle;

    igv.splitStringRespectingQuotes = function (string, delim) {

        var tokens = [],
            len = string.length,
            i,
            n = 0,
            quote = false,
            c;

        if (len > 0) {

            tokens[n] = string.charAt(0);
            for (i = 1; i < len; i++) {
                c = string.charAt(i);
                if (c === '"') {
                    quote = !quote;
                }
                else if (!quote && c === delim) {
                    n++;
                    tokens[n] = "";
                }
                else {
                    tokens[n] += c;
                }
            }
        }
        return tokens;
    };

    /**
     * Extend jQuery's ajax function to handle binary requests.   Credit to Henry Algus:
     *
     * http://www.henryalgus.com/reading-binary-files-using-jquery-ajax/
     */
    igv.addAjaxExtensions = function () {

        // use this transport for "binary" data type
        $.ajaxTransport("+binary", function (options, originalOptions, jqXHR) {

            return {
                // create new XMLHttpRequest
                send: function (_, callback) {
                    // setup all variables
                    var xhr = new XMLHttpRequest(),
                        url = options.url,
                        type = options.type,
                        responseType = "arraybuffer",
                        data = options.data || null;

                    xhr.addEventListener('load', function () {
                        var data = {};
                        data[options.dataType] = xhr.response;
                        // make callback and send data
                        callback(xhr.status, xhr.statusText, data, xhr.getAllResponseHeaders());
                    });

                    xhr.open(type, url);
                    xhr.responseType = responseType;

                    if (options.headers) {
                        for (var prop in options.headers) {
                            if (options.headers.hasOwnProperty(prop)) {
                                xhr.setRequestHeader(prop, options.headers[prop]);
                            }
                        }
                    }

                    // TODO -- set any other options values
                },
                abort: function () {
                    jqXHR.abort();
                }
            };

        });
    };

    /**
     * Test if the given value is a string or number.  Not using typeof as it fails on boxed primitives.
     *
     * @param value
     * @returns boolean
     */
    igv.isStringOrNumber = function (value) {
        return (value.substring || value.toFixed) ? true : false
    };

    igv.constrainBBox = function ($child, $parent) {

        var delta,
            topLeft,
            bboxChild = {},
            bboxParent = {};

        bboxParent.left = bboxParent.top = 0;
        bboxParent.right = $parent.outerWidth();
        bboxParent.bottom = $parent.outerHeight();

        topLeft = $child.offset();

        bboxChild.left = topLeft.left - $parent.offset().left;
        bboxChild.top = topLeft.top - $parent.offset().top;
        bboxChild.right = bboxChild.left + $child.outerWidth();
        bboxChild.bottom = bboxChild.top + $child.outerHeight();

        delta = bboxChild.bottom - bboxParent.bottom;
        if (delta > 0) {

            // clamp to trackContainer bottom
            topLeft.top -= delta;

            bboxChild.top -= delta;
            bboxChild.bottom -= delta;

            delta = bboxChild.top - bboxParent.top;
            if (delta < 0) {
                topLeft.top -= delta;
            }

        }

        return topLeft;

    };

    igv.log = function (message) {
        if (igv.enableLogging && console && console.log) {
            console.log(message);
        }
    };

    igv.buildOptions = function(config, options) {

        var defaultOptions = {
            oauthToken: config.oauthToken,
            headers: config.headers,
            withCredentials: config.withCredentials
        };

        return Object.assign(defaultOptions, options);
    };

    return igv;

})(igv || {});


