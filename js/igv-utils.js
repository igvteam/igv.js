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


    igv.makeToggleButton = function (buttonOnLabel, buttonOffLabel, configurationKey, get$Target) {

        var $button = $('<div class="igv-nav-bar-toggle-button">'),
            configurationValue = igv.browser[ configurationKey ];

        skin$ButtonWithTruthFunction($button, (true === configurationValue), buttonOnLabel, buttonOffLabel);

        $button.click(function () {

            var $target = get$Target();

            igv.browser[ configurationKey ] = !igv.browser[ configurationKey ];

            $target.toggle();

            skin$ButtonWithTruthFunction($(this), $target.is(":visible"), buttonOnLabel, buttonOffLabel);
        });

        function skin$ButtonWithTruthFunction($b, truth, onLabel, offLabel) {

            $b.removeClass('igv-nav-bar-toggle-button-on');
            $b.removeClass('igv-nav-bar-toggle-button-off');
            if (true === truth) {
                $b.addClass('igv-nav-bar-toggle-button-off');
                $b.text(offLabel);
            } else {
                $b.addClass('igv-nav-bar-toggle-button-on');
                $b.text(onLabel);
            }
        }

        return $button;
    };

    igv.presentAlert = function (string) {

        igv.alert.$dialogLabel.text(string);
        igv.alert.show(undefined);

        igv.popover.hide();

    };

    igv.trackMenuItems = function (popover, trackView) {

        var menuItems = [],
            trackItems;

        menuItems.push(igv.dialogMenuItem(
            popover,
            trackView,
            "Set track name",
            function () {
                return "Track Name"
            },
            trackView.track.name,
            function () {

                var alphanumeric = parseAlphanumeric(igv.dialog.$dialogInput.val());

                if (undefined !== alphanumeric) {
                    igv.setTrackLabel(trackView.track, alphanumeric);
                    trackView.update();
                }

                function parseAlphanumeric(value) {

                    var alphanumeric_re = /(?=.*[a-zA-Z].*)([a-zA-Z0-9 ]+)/,
                        alphanumeric = alphanumeric_re.exec(value);

                    return (null !== alphanumeric) ? alphanumeric[0] : "untitled";
                }

            }, undefined));

        menuItems.push(igv.dialogMenuItem(
            popover,
            trackView,
            "Set track height",
            function () {
                return "Track Height"
            },
            trackView.trackDiv.clientHeight,
            function () {

                var number = parseFloat(igv.dialog.$dialogInput.val(), 10);

                if (undefined !== number) {
                    // If explicitly setting the height adust min or max, if neccessary.
                    if (trackView.track.minHeight !== undefined && trackView.track.minHeight > number) {
                        trackView.track.minHeight = number;
                    }
                    if (trackView.track.maxHeight !== undefined && trackView.track.maxHeight < number) {
                        trackView.track.minHeight = number;
                    }
                    trackView.setTrackHeight(number);
                    trackView.track.autoHeight = false;   // Explicitly setting track height turns off autoHeight

                }

            }, undefined));

        if (trackView.track.popupMenuItems) {

            trackItems = trackView.track.popupMenuItems(popover);

            if (trackItems && trackItems.length > 0) {

                trackItems.forEach(function (trackItem, i) {

                    var str;

                    if (trackItem.name) {

                        str = (0 === i) ? '<div class=\"igv-track-menu-item igv-track-menu-border-top\">' : '<div class=\"igv-track-menu-item\">';
                        str = str + trackItem.name + '</div>';

                        menuItems.push({object: $(str), click: trackItem.click, init: trackItem.init});
                    } else {

                        if (0 === i) {
                            trackItem.object.addClass("igv-track-menu-border-top");
                            menuItems.push(trackItem);
                        }
                        else {
                            menuItems.push(trackItem);
                        }

                    }

                });
            }
        }

        if (trackView.track.removable !== false) {

            menuItems.push(
                igv.dialogMenuItem(
                    popover,
                    trackView,
                    "Remove track",
                    function () {
                        var label = "Remove " + trackView.track.name;
                        return '<div class="igv-dialog-label-centered">' + label + '</div>';
                    },
                    undefined,
                    function () {
                        popover.hide();
                        trackView.browser.removeTrack(trackView.track);
                    },
                    true)
            );

        }

        return menuItems;

    };

    igv.dialogMenuItem = function (popover, trackView, gearMenuLabel, labelHTMLFunction, inputValue, clickFunction, doDrawBorderOrUndefined) {

        var _div = (true === doDrawBorderOrUndefined) ? '<div class="igv-track-menu-item igv-track-menu-border-top">' : '<div class="igv-track-menu-item">';

        return {
            object: $(_div + gearMenuLabel + '</div>'),
            click: function () {

                igv.dialog.configure(labelHTMLFunction, inputValue, clickFunction);
                igv.dialog.show($(trackView.trackDiv));
                popover.hide();
            }
        }
    };

    igv.dataRangeMenuItem = function (popover, trackView) {

        return {
            object: $('<div class="igv-track-menu-item">' + "Set data range" + '</div>'),
            click: function () {
                igv.dataRangeDialog.configureWithTrackView(trackView);
                igv.dataRangeDialog.show();
                popover.hide();
            }
        }
    };

    igv.colorPickerMenuItem = function (popover, trackView) {

        return {
            object: $('<div class="igv-track-menu-item">' + "Set track color" + '</div>'),
            click: function () {
                igv.colorPicker.configure(trackView);
                igv.colorPicker.show();
                popover.hide();
            }
        }
    };

    igv.attachDialogCloseHandlerWithParent = function ($parent, closeHandler) {

        var $container = $('<div class="igv-dialog-close-container">'),
            $fa = $('<i class="fa fa-times igv-dialog-close-fa">');

        $container.append($fa[0]);
        $parent.append($container[0]);

        $fa.hover(
            function () {
                $fa.removeClass("fa-times");
                $fa.addClass("fa-times-circle");

                $fa.css({
                    "color": "#222"
                });
            },

            function () {
                $fa.removeClass("fa-times-circle");
                //$fa.removeClass("fa-times-circle fa-lg");
                $fa.addClass("fa-times");

                $fa.css({
                    "color": "#444"
                });

            }
        );

        $fa.click(closeHandler);

    };

    igv.spinner = function (size) {

        // spinner
        var $container,
            $spinner;

        $spinner = $('<i class="fa fa-spinner fa-spin">');
        if (size) {
            $spinner.css("font-size", size);
        }

        $container = $('<div class="igv-spinner-container">');
        $container.append($spinner[0]);

        return $container[0];
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

        var eFixed = $.event.fix(e),   // Sets pageX and pageY for browsers that don't support them
            posx = eFixed.pageX - $(target).offset().left,
            posy = eFixed.pageY - $(target).offset().top;

        return {x: posx, y: posy}
    };

    /**
     * Format markup for popover text from an array of name value pairs [{name, value}]
     */
    igv.formatPopoverText = function (nameValueArray) {

        var markup = "<table class=\"igv-popover-table\">";

        nameValueArray.forEach(function (nameValue) {

            if (nameValue.name) {
                //markup += "<tr><td class=\"igv-popover-td\">" + "<span class=\"igv-popoverName\">" + nameValue.name + "</span>" + "<span class=\"igv-popoverValue\">" + nameValue.value + "</span>" + "</td></tr>";
                markup += "<tr><td class=\"igv-popover-td\">" + "<div class=\"igv-popoverNameValue\">" + "<span class=\"igv-popoverName\">" + nameValue.name + "</span>" + "<span class=\"igv-popoverValue\">" + nameValue.value + "</span>" + "</div>" + "</td></tr>";
            }
            else {
                // not a name/value pair
                markup += "<tr><td>" + nameValue.toString() + "</td></tr>";
            }
        });

        markup += "</table>";
        return markup;


    };

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


    return igv;

})(igv || {});


