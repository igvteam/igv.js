/**
 * Created by turner on 2/24/14.
 */
var igv = (function (igv) {

    igv.rgbaColor = function (r, g, b, a) {

        r = clamp(r, 0, 255);
        g = clamp(g, 0, 255);
        b = clamp(b, 0, 255);
        a = clamp(a, 0.0, 1.0);

        return "rgba(" + r + "," + g + "," + b + "," + a + ")";
    };

    igv.rgbColor = function (r, g, b) {

        r = clamp(r, 0, 255);
        g = clamp(g, 0, 255);
        b = clamp(b, 0, 255);

        return "rgb(" + r + "," + g + "," + b + ")";
    };

    igv.greyScale = function (value) {

        var grey = clamp(value, 0, 255);

        return "rgb(" + grey + "," + grey + "," + grey + ")";
    };

    igv.randomGrey = function (min, max) {

        min = clamp(min, 0, 255);
        max = clamp(max, 0, 255);

        var g = Math.round(igv.random(min, max)).toString(10);

        return "rgb(" + g + "," + g + "," + g + ")";
    };

    igv.randomRGB = function (min, max) {

        min = clamp(min, 0, 255);
        max = clamp(max, 0, 255);

        var r = Math.round(igv.random(min, max)).toString(10);
        var g = Math.round(igv.random(min, max)).toString(10);
        var b = Math.round(igv.random(min, max)).toString(10);

        return "rgb(" + r + "," + g + "," + b + ")";
    };

    igv.nucleotideColorComponents = {
        "A": [0, 200, 0],
        "C": [  0, 0, 200],
        "T": [255, 0, 0],
        "G": [209, 113, 5],
        "a": [  0, 200, 0],
        "c": [  0, 0, 200],
        "t": [255, 0, 0],
        "g": [209, 113, 5]
    }

    igv.nucleotideColors = {
        "A": "rgb(  0, 200,   0)",
        "C": "rgb(  0,   0, 200)",
        "T": "rgb(255,   0,   0)",
        "G": "rgb(209, 113,   5)",
        "a": "rgb(  0, 200,   0)",
        "c": "rgb(  0,   0, 200)",
        "t": "rgb(255,   0,   0)",
        "g": "rgb(209, 113,   5)"
    };

    /**
     *
     * @param source  RGB components as an array
     * @param alpha   alpha transparancy in the range 0-1
     * @returns {}
     */
    igv.getCompositeColor = function (dest, source, alpha) {

        var r = Math.floor(alpha * source[0] + (1 - alpha) * dest[0]),
            g = Math.floor(alpha * source[1] + (1 - alpha) * dest[1]),
            b = Math.floor(alpha * source[2] + (1 - alpha) * dest[1]);

        return "rgb(" + r + "," + g + "," + b + ")";

    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    };

    return igv;

})(igv || {});
