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

    igv.genericContainer = function ({ $parent, bbox, width, height, closeHandler }) {

        var self = this,
            $generic_container,
            $header,
            $fa;

        this.namespace = '.generic_container_' + igv.guid();

        $generic_container = $('<div>', {class: 'igv-generic-container'});
        $parent.append($generic_container);
        $generic_container.offset( { left:bbox.left, top:bbox.top } );

        // width
        if (width) {
            $generic_container.width(width);
        }

        // height
        if (height) {
            $generic_container.height(height);
        }

        // header
        $header = $('<div>');
        $generic_container.append($header);

        // close button
        $fa = igv.createIcon("times");
        $header.append($fa);

        $fa.on('mousedown' + self.namespace, function (e) {
            e.stopPropagation();
        });

        $fa.on('mouseup' + self.namespace, function (e) {
            e.stopPropagation();
        });

        $fa.on('click' + self.namespace, function (e) {

            e.preventDefault();
            e.stopPropagation();

            $generic_container.offset( { left:bbox.left, top:bbox.top } );

            closeHandler(e);
        });

        $fa.on('touchend' + self.namespace, function (e) {
            e.preventDefault();
            e.stopPropagation();

            $generic_container.offset( { left:bbox.left, top:bbox.top } );

            closeHandler(e);
        });

        igv.makeDraggable($generic_container.get(0), $header.get(0));

        return $generic_container;
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

        if (path instanceof File) {
            return path.name;
        }
        else {
            index = path.lastIndexOf("/");
            filename = index < 0 ? path : path.substr(index + 1);

            //Strip parameters -- handle local files later
            index = filename.indexOf("?");
            if (index > 0) {
                filename = filename.substr(0, index);
            }

            return filename;
        }
    }

    igv.filenameOrURLHasSuffix = function (fileOrURL, suffix) {
        var str = (fileOrURL instanceof File) ? fileOrURL.name : igv.getFilename(fileOrURL);
        return str.toLowerCase().endsWith(suffix)
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

    igv.attachDialogCloseHandlerWithParent = function ($parent, closeHandler) {

        var $container,
            $fa;

        $container = $('<div>');
        $parent.append($container);

        $fa = igv.createIcon("times");
        $container.append($fa);

        $fa.on('click', closeHandler);
        $fa.on('touchend', closeHandler);

        $fa.on('mousedown', function (e) {
            e.stopPropagation();
        })

        $fa.on('mouseup', function (e) {
            e.stopPropagation();
        })

        $fa.on('touchstart', function (e) {
            e.stopPropagation();
        })

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

    igv.splitLines = function (string) {
        return string.split(/\n|\r\n|\r/g);
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

            value = raw / denom;
            floored = Math.floor(value);
            return igv.numberFormatter(floored) + units;
        } else {
            return igv.numberFormatter(raw) + " bp";
        }

        value = raw / denom;
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
            posx,
            posy;

        if (undefined === $target.offset()) {
            console.log('igv.translateMouseCoordinates - $target.offset() is undefined.');
        }

        const pageCoordinates = igv.pageCoordinates(e);

        posx = pageCoordinates.x - $target.offset().left;
        posy = pageCoordinates.y - $target.offset().top;

        return {x: posx, y: posy}
    };

    igv.pageCoordinates = function (e) {

        if (e.type.startsWith("touch")) {
            const touch = e.touches[0];
            return {x: touch.pageX, y: touch.pageY};
        }
        else {
            return {x: e.pageX, y: e.pageY}
        }

    }

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
    const simpleTypes = new Set(["boolean", "number", "string", "symbol"]);
    igv.isSimpleType = function (value) {

        const valueType = typeof value;

        return (value != undefined && (simpleTypes.has(valueType) || value.substring || value.toFixed))
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

    igv.buildOptions = function (config, options) {

        var defaultOptions = {
            oauthToken: config.oauthToken,
            headers: config.headers,
            withCredentials: config.withCredentials,
            filename: config.filename
        };

        return Object.assign(defaultOptions, options);
    };

    /**
     * Parse a locus string and return a range object.  Locus string is of the form chr:start-end.  End is optional
     *
     */
    igv.parseLocusString = function (string) {

        const t1 = string.split(":");
        const t2 = t1[1].split("-");

        const range = {
            chr: t1[0],
            start: Number.parseInt(t2[0]) - 1
        };

        if (t2.length > 1) {
            range.end = Number.parseInt(t2[1]);
        }
        else {
            range.end = range.start + 1;
        }

        return range;

    }


    igv.download = function (filename, data) {

        const element = document.createElement('a');
        element.setAttribute('href', data);
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }


    /**
     * Covers string literals and String objects
     * @param x
     * @returns {boolean}
     */
    igv.isString = function (x) {
        return typeof x === "string" || x instanceof String
    }


    /**
     * isMobile test from http://detectmobilebrowsers.com
     * TODO -- improve UI design so this isn't neccessary
     * @returns {boolean}
     */

    igv.isMobile = function () {

        const a = (navigator.userAgent || navigator.vendor || window.opera);
        return (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) ||
            /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4)))

    }

    igv.doAutoscale = function (features) {
        var min, max;

        if (features.length > 0) {
            min = Number.MAX_VALUE;
            max = -Number.MAX_VALUE;

            features.forEach(function (f) {
                if (!Number.isNaN(f.value)) {
                    min = Math.min(min, f.value);
                    max = Math.max(max, f.value);
                }
            });

            // Insure we have a zero baseline
            if (max > 0) min = Math.min(0, min);
            if (max < 0) max = 0;
        }
        else {
            // No features -- default
            min = 0;
            max = 100;
        }

        return {min: min, max: max};
    }

    igv.getGlobalObject = function () {
        if (typeof self !== 'undefined') {
            return self;
        }
        if (typeof global !== 'undefined') {
            return global;
        }
        else {
            return window;
        }
    }

    return igv;

})(igv || {});


