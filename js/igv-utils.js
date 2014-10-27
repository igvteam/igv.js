var igv = (function (igv) {

    igv.spinnerStartWithParent = function (parentElement) {

        var thang = $(parentElement).find("i.fa-spinner");

        thang.removeClass("igv-spinner-fontawesome-stop");
        thang.addClass("igv-spinner-fontawesome-start");

    };

    igv.spinnerStopWithParent = function (parentElement) {

        var thang = $(parentElement).find("i.fa-spinner");

        thang.removeClass("igv-spinner-fontawesome-start");
        thang.addClass("igv-spinner-fontawesome-stop");

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

        var markup = "<table>";
        nameValueArray.forEach(function (nameValue) {

            if (nameValue.name) {
//                markup += "<tr><td>" + nameValue.name+ ":&nbsp; " + nameValue.value + "</td></tr>";
                markup += "<tr><td>" + "<span class=\"igv-popoverNameSpan\">" + nameValue.name + "</span>" + "&nbsp; " + "<span class=\"igv-popoverValueSpan\">" + nameValue.value + "</span>" + "</td></tr>";
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
    }


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
                send: function(_, callback){
                    // setup all variables
                    var xhr = new XMLHttpRequest(),
                        url = options.url,
                        type = options.type,
                        responseType = "arraybuffer",
                        data = options.data || null;

                    xhr.addEventListener('load', function(){
                        var data = {};
                        data[options.dataType] = xhr.response;
                        // make callback and send data
                        callback(xhr.status, xhr.statusText, data, xhr.getAllResponseHeaders());
                    });

                    xhr.open(type, url);
                    xhr.responseType = responseType;

                    if(options.headers) {
                        for (var prop in options.headers) {
                            if( options.headers.hasOwnProperty( prop ) ) {
                                xhr.setRequestHeader(prop, options.headers[prop]);
                            }
                        }
                    }

                    // TODO -- set any other options values
                },
                abort: function(){
                    jqXHR.abort();
                }
            };

        });
    }


    return igv;

})(igv || {});


