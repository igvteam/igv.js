var igv = (function (igv) {

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
        return ("0000" + (Math.random() * Math.pow(36,4) << 0).toString(36)).slice(-4);
    };

    // Returns a random number between min (inclusive) and max (exclusive)
    igv.random =  function (min, max) {
        return Math.random() * (max - min) + min;
    };

    // StackOverflow: http://stackoverflow.com/a/10810674/116169
    igv.numberFormatter = function (rawNumber){

        var dec = String(rawNumber).split(/[.,]/),
            sep    = ',',
            decsep = '.';

        return dec[0].split('').reverse().reduce(function(prev, now, i){
            return i % 3 === 0 ? prev + sep + now : prev + now;
        }).split('').reverse().join('') + (dec[1] ? decsep + dec[1] : '');
    };

    igv.numberUnFormatter = function (formatedNumber){

        return formatedNumber.split(",").join().replace(",", "", "g");
    };

    igv.getSpinner =  function (target) {

        var opts = {
            lines: 13, // The number of lines to draw
            length: 6, // The length of each line
            width: 2, // The line thickness
            radius: 8, // The radius of the inner circle
            corners: 1, // Corner roundness (0..1)
            rotate: 0, // The rotation offset
            direction: 1, // 1: clockwise, -1: counterclockwise
            color: '#000', // #rgb or #rrggbb or array of colors
            speed: 1, // Rounds per second
            trail: 60, // Afterglow percentage
            shadow: false, // Whether to render a shadow
            hwaccel: false, // Whether to use hardware acceleration
            className: 'spinner', // The CSS class to assign to the spinner
            zIndex: 2e9, // The z-index (defaults to 2000000000)
            top: 'auto',
            left: 'auto'
        };

        var spinner = new Spinner(opts).spin(target);


        return spinner;
    };

    return igv;

})(igv || {});


