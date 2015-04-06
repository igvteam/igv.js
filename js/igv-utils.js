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

    igv.parseUri = function(str) {

        var	o   = igv.parseUri.options,
            m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
            uri = {},
            i   = 14;

        while (i--) uri[o.key[i]] = m[i] || "";

        uri[o.q.name] = {};
        uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
            if ($1) uri[o.q.name][$1] = $2;
        });

        return uri;
    };

    igv.parseUri.options = {
        strictMode: false,
        key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
        q:   {
            name:   "queryKey",
            parser: /(?:^|&)([^&=]*)=?([^&]*)/g
        },
        parser: {
            strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
            loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
        }
    };

    igv.trackMenuItems = function (popover, trackView) {

        var trackMenuPopupDialog,
            trackHeight = trackView.trackDiv.clientHeight,
            trackItems,
            menuItems = [
                {
                    object: $('<div class="igv-track-menu-item">Set track name</div>'),
                    click: function () {

                        trackMenuPopupDialog = new igv.TrackMenuPopupDialog(popover, "Track name", trackView.track.label, function () {

                            if (!trackMenuPopupDialog.name.val()) {

                                trackMenuPopupDialog.name.addClass( "ui-state-error" );

                                trackMenuPopupDialog.updateTips( "may not be blank" );
                            }
                            else {

                                igv.setTrackLabel(trackView.track, trackMenuPopupDialog.name.val());
                                //trackView.update();
                                trackMenuPopupDialog.dialogForm.dialog("close");
                            }

                        });

                        trackMenuPopupDialog.dialogForm.dialog("open");
                    }
                },
                {
                    object: $('<div class="igv-track-menu-item">Set track height</div>'),
                    click: function () {

                        trackMenuPopupDialog = new igv.TrackMenuPopupDialog(popover, "Track height", trackHeight.toString(), function () {

                            var str,
                                numberString = trackMenuPopupDialog.name.val(),
                                number = parseFloat(numberString, 10),
                                minHeight = trackView.track.minHeight || 25,
                                maxHeight = trackView.track.maxHeight || 1000;

                            if (!$.isNumeric(numberString)) {

                                trackMenuPopupDialog.name.addClass( "ui-state-error" );

                                str = numberString + " is not a valid number";
                                trackMenuPopupDialog.updateTips( str );
                            }

                            // If track specifies a minimum height use it


                            else if (number < minHeight || number > maxHeight) {

                                trackMenuPopupDialog.name.addClass( "ui-state-error" );

                                str = "must be between " + minHeight + " and " + igv.numberFormatter(maxHeight);
                                trackMenuPopupDialog.updateTips( str );
                            }
                            else {

                                trackView.setTrackHeight( number );
                                trackMenuPopupDialog.dialogForm.dialog("close");
                            }

                        }, 320, 256);

                        trackMenuPopupDialog.dialogForm.dialog("open");
                    }
                }
            ];

        if (trackView.track.popupMenuItems) {

            trackItems = trackView.track.popupMenuItems(popover);

            if (trackItems && trackItems.length > 0) {

                trackItems.forEach(function (trackItem, i) {

                    var str;

                    if (trackItem.label) {

                        str = (0 === i) ? '<div class=\"igv-track-menu-item igv-track-menu-border-top\">' : '<div class=\"igv-track-menu-item\">';
                        str = str + trackItem.label + '</div>';

                        menuItems.push( { object: $(str), click: trackItem.click, init: trackItem.init } );
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

        menuItems.push(
            {
                object: $('<div class="igv-track-menu-item igv-track-menu-border-top">Remove track</div>'),
                click: function () {
                    popover.hide();
                    trackView.browser.removeTrack(trackView.track);
                }
            }
        );

        return menuItems;

    };

    igv.colorPickerMenuItem = function (popover, trackView, trackLabel, trackColor) {
        return {
            object: $('<div id="featureColorPicker" class="igv-track-menu-item">' + trackLabel + '</div>'),
            init: function () {

                $("#featureColorPicker").colorpicker(
                    {

                        title: "Feature Color Picker",

                        color: trackColor,

                        parts: [ 'header', 'map', 'bar', 'hsv', 'rgb', 'preview', 'swatches', 'footer' ],

                        okOnEnter: true,

                        inline: false,

                        ok: function (event, color) {

                            var r = Math.floor(255 * color.rgb.r),
                                g = Math.floor(255 * color.rgb.g),
                                b = Math.floor(255 * color.rgb.b);

                            igv.setTrackColor(trackView.track, igv.rgbColor(r, g, b));

                            trackView.update();
                            popover.hide();

                        }

                    }
                );
            }
        }
    };

    igv.spinner = function () {

        // spinner
        var spinnerContainer,
            spinner;

        spinnerContainer = document.createElement("div");
        spinnerContainer.className = "igv-spinner-container";

        spinner = document.createElement("i");
        spinner.className = "fa fa-spinner fa-spin fa-24px";

        spinnerContainer.appendChild(spinner);

        return spinnerContainer;
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

    return igv;

})(igv || {});


