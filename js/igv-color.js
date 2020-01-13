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

import IGVMath from "./igv-math.js";
import {stripQuotes} from "./util/stringUtils.js";

const IGVColor = {

    rgbListFromHSV: () => {

        let s = 1;
        let accumulation = [];
        for (let v = 1; v >= 0.5; v -= .1) {
            for (let h = 0; h < 1; h += 1 / 28) {
                const r = "rgb(" + IGVColor.hsvToRgb(h, s, v).join(",") + ")";
                accumulation.push(r);
            }
        }

        // add black
        accumulation.pop();
        accumulation.push(IGVColor.rgbColor(16, 16, 16));

        return accumulation;
    },

    rgbToHex: function (rgb) {
        rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
        return (rgb && rgb.length === 4) ? "#" +
            ("0" + parseInt(rgb[1], 10).toString(16)).slice(-2) +
            ("0" + parseInt(rgb[2], 10).toString(16)).slice(-2) +
            ("0" + parseInt(rgb[3], 10).toString(16)).slice(-2) : '';
    },

    hexToRgb: function (hex) {

        var cooked = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

        if (null === cooked) {
            return undefined;
        }

        return "rgb(" + parseInt(cooked[1], 16) + "," + parseInt(cooked[2], 16) + "," + parseInt(cooked[3], 16) + ")";
    },

    /**
     * Converts an HSV color value to RGB. Conversion formula
     * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
     * Assumes h, s, and v are contained in the set [0, 1] and
     * returns r, g, and b in the set [0, 255].
     *
     * Credit: https://gist.githubusercontent.com/mjackson/5311256
     *
     * @param   h       The hue
     * @param   s       The saturation
     * @param   v       The value
     * @return  Array   The RGB representation
     */
    hsvToRgb: function (h, s, v) {
        var r, g, b;

        var i = Math.floor(h * 6);
        var f = h * 6 - i;
        var p = v * (1 - s);
        var q = v * (1 - f * s);
        var t = v * (1 - (1 - f) * s);

        switch (i % 6) {
            case 0:
                r = v, g = t, b = p;
                break;
            case 1:
                r = q, g = v, b = p;
                break;
            case 2:
                r = p, g = v, b = t;
                break;
            case 3:
                r = p, g = q, b = v;
                break;
            case 4:
                r = t, g = p, b = v;
                break;
            case 5:
                r = v, g = p, b = q;
                break;
        }

        return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)];
    },

    /**
     * Converts an HSL color value to RGB. Conversion formula
     * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
     * Assumes h, s, and l are contained in the set [0, 1] and
     * returns r, g, and b in the set [0, 255].
     *
     * Credit: https://gist.githubusercontent.com/mjackson/5311256
     *
     * @param   h       The hue
     * @param   s       The saturation
     * @param   l       The lightness
     * @return  Array   The RGB representation
     */
    hslToRgb: function (h, s, l) {
        var r, g, b;

        if (s === 0) {
            r = g = b = l; // achromatic
        } else {


            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;

            r = IGVColor.hue2rgb(p, q, h + 1 / 3);
            g = IGVColor.hue2rgb(p, q, h);
            b = IGVColor.hue2rgb(p, q, h - 1 / 3);
        }

        return [r * 255, g * 255, b * 255];
    },

    hue2rgb: (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    },

    rgbaColor: function (r, g, b, a) {

        r = IGVMath.clamp(r, 0, 255);
        g = IGVMath.clamp(g, 0, 255);
        b = IGVMath.clamp(b, 0, 255);
        a = IGVMath.clamp(a, 0.0, 1.0);

        return "rgba(" + r + "," + g + "," + b + "," + a + ")";
    },

    rgbColor: function (r, g, b) {

        r = IGVMath.clamp(r, 0, 255);
        g = IGVMath.clamp(g, 0, 255);
        b = IGVMath.clamp(b, 0, 255);

        return "rgb(" + r + "," + g + "," + b + ")";
    },

    greyScale: function (value) {

        var grey = IGVMath.clamp(value, 0, 255);

        return "rgb(" + grey + "," + grey + "," + grey + ")";
    },

    randomGrey: function (min, max) {

        min = IGVMath.clamp(min, 0, 255);
        max = IGVMath.clamp(max, 0, 255);

        var g = Math.round(Math.random(min, max)).toString(10);

        return "rgb(" + g + "," + g + "," + g + ")";
    },

    randomRGB: function (min, max) {

        min = IGVMath.clamp(min, 0, 255);
        max = IGVMath.clamp(max, 0, 255);

        var r = Math.round(Math.random(min, max)).toString(10);
        var g = Math.round(Math.random(min, max)).toString(10);
        var b = Math.round(Math.random(min, max)).toString(10);

        return "rgb(" + r + "," + g + "," + b + ")";
    },

    randomRGBConstantAlpha: function (min, max, alpha) {

        min = IGVMath.clamp(min, 0, 255);
        max = IGVMath.clamp(max, 0, 255);

        var r = Math.round(Math.random(min, max)).toString(10);
        var g = Math.round(Math.random(min, max)).toString(10);
        var b = Math.round(Math.random(min, max)).toString(10);

        return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
    },

    addAlpha: function (color, alpha) {

        const c = this.colorNameToHex(color);
        if(c) {
            color = c;
        }

        var isHex = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(color);

        if (color.startsWith("rgba")) {
            return color;   // TODO -- should replace current alpha with new one
        }

        if (isHex) {
            color = IGVColor.hexToRgb(color);
        }

        if (color.startsWith("rgb")) {
            return color.replace("rgb", "rgba").replace(")", ", " + alpha + ")");
        } else {
            console.log(color + " is not an rgb style string");
            return color;
        }
    },


    /**
     *
     * @param dest  RGB components as an array
     * @param src  RGB components as an array
     * @param alpha   alpha transparancy in the range 0-1
     * @returns {}
     */
    getCompositeColor: function (dest, src, alpha) {

        var r = Math.floor(alpha * src[0] + (1 - alpha) * dest[0]),
            g = Math.floor(alpha * src[1] + (1 - alpha) * dest[1]),
            b = Math.floor(alpha * src[2] + (1 - alpha) * dest[2]);

        return "rgb(" + r + "," + g + "," + b + ")";

    },


    createColorString: function (str) {
        // Excel will quote color strings, strip all quotes
        str = stripQuotes(str);

        if (str.includes(",")) {
            return str.startsWith("rgb") ? str : "rgb(" + str + ")";
        } else {
            return str;
        }
    },

    darkenLighten: function (color, amt) {

        let src;
        let hexColor = this.colorNameToHex(color);
        if(hexColor) {
            src  = IGVColor.hexToRgb(hexColor);
        } else {
            src = color.startsWith('rgb(') ? color : IGVColor.hexToRgb(color);
        }

        const components = src.replace(")", "").substring(4).split(",");

        const r = Math.max(0, Math.min(255, Number.parseInt(components[0].trim()) + amt));
        const g = Math.max(0, Math.min(255, Number.parseInt(components[1].trim()) + amt));
        const b = Math.max(0, Math.min(255, Number.parseInt(components[2].trim()) + amt));

        return 'rgb(' + r.toString() + ',' + g.toString() + ',' + b.toString() + ')';

    },

    /**
     * Convert html/css color name to hex value.  Adapted from https://gist.github.com/mxfh/4719348
     * @param colorName
     * @returns {*}
     */
    colorNameToHex: function (colorName) { // color list from http://stackoverflow.com/q/1573053/731179  with added gray/gray
        const definedColorNames = {
            "aliceblue": "#f0f8ff",
            "antiquewhite": "#faebd7",
            "aqua": "#00ffff",
            "aquamarine": "#7fffd4",
            "azure": "#f0ffff",
            "beige": "#f5f5dc",
            "bisque": "#ffe4c4",
            "black": "#000000",
            "blanchedalmond": "#ffebcd",
            "blue": "#0000ff",
            "blueviolet": "#8a2be2",
            "brown": "#a52a2a",
            "burlywood": "#deb887",
            "cadetblue": "#5f9ea0",
            "chartreuse": "#7fff00",
            "chocolate": "#d2691e",
            "coral": "#ff7f50",
            "cornflowerblue": "#6495ed",
            "cornsilk": "#fff8dc",
            "crimson": "#dc143c",
            "cyan": "#00ffff",
            "darkblue": "#00008b",
            "darkcyan": "#008b8b",
            "darkgoldenrod": "#b8860b",
            "darkgray": "#a9a9a9",
            "darkgreen": "#006400",
            "darkkhaki": "#bdb76b",
            "darkmagenta": "#8b008b",
            "darkolivegreen": "#556b2f",
            "darkorange": "#ff8c00",
            "darkorchid": "#9932cc",
            "darkred": "#8b0000",
            "darksalmon": "#e9967a",
            "darkseagreen": "#8fbc8f",
            "darkslateblue": "#483d8b",
            "darkslategray": "#2f4f4f",
            "darkturquoise": "#00ced1",
            "darkviolet": "#9400d3",
            "deeppink": "#ff1493",
            "deepskyblue": "#00bfff",
            "dimgray": "#696969",
            "dodgerblue": "#1e90ff",
            "firebrick": "#b22222",
            "floralwhite": "#fffaf0",
            "forestgreen": "#228b22",
            "fuchsia": "#ff00ff",
            "gainsboro": "#dcdcdc",
            "ghostwhite": "#f8f8ff",
            "gold": "#ffd700",
            "goldenrod": "#daa520",
            "gray": "#808080",
            "green": "#008000",
            "greenyellow": "#adff2f",
            "honeydew": "#f0fff0",
            "hotpink": "#ff69b4",
            "indianred ": "#cd5c5c",
            "indigo ": "#4b0082",
            "ivory": "#fffff0",
            "khaki": "#f0e68c",
            "lavender": "#e6e6fa",
            "lavenderblush": "#fff0f5",
            "lawngreen": "#7cfc00",
            "lemonchiffon": "#fffacd",
            "lightblue": "#add8e6",
            "lightcoral": "#f08080",
            "lightcyan": "#e0ffff",
            "lightgoldenrodyellow": "#fafad2",
            "lightgrey": "#d3d3d3",
            "lightgreen": "#90ee90",
            "lightpink": "#ffb6c1",
            "lightsalmon": "#ffa07a",
            "lightseagreen": "#20b2aa",
            "lightskyblue": "#87cefa",
            "lightslategray": "#778899",
            "lightsteelblue": "#b0c4de",
            "lightyellow": "#ffffe0",
            "lime": "#00ff00",
            "limegreen": "#32cd32",
            "linen": "#faf0e6",
            "magenta": "#ff00ff",
            "maroon": "#800000",
            "mediumaquamarine": "#66cdaa",
            "mediumblue": "#0000cd",
            "mediumorchid": "#ba55d3",
            "mediumpurple": "#9370d8",
            "mediumseagreen": "#3cb371",
            "mediumslateblue": "#7b68ee",
            "mediumspringgreen": "#00fa9a",
            "mediumturquoise": "#48d1cc",
            "mediumvioletred": "#c71585",
            "midnightblue": "#191970",
            "mintcream": "#f5fffa",
            "mistyrose": "#ffe4e1",
            "moccasin": "#ffe4b5",
            "navajowhite": "#ffdead",
            "navy": "#000080",
            "oldlace": "#fdf5e6",
            "olive": "#808000",
            "olivedrab": "#6b8e23",
            "orange": "#ffa500",
            "orangered": "#ff4500",
            "orchid": "#da70d6",
            "palegoldenrod": "#eee8aa",
            "palegreen": "#98fb98",
            "paleturquoise": "#afeeee",
            "palevioletred": "#d87093",
            "papayawhip": "#ffefd5",
            "peachpuff": "#ffdab9",
            "peru": "#cd853f",
            "pink": "#ffc0cb",
            "plum": "#dda0dd",
            "powderblue": "#b0e0e6",
            "purple": "#800080",
            "red": "#ff0000",
            "rosybrown": "#bc8f8f",
            "royalblue": "#4169e1",
            "saddlebrown": "#8b4513",
            "salmon": "#fa8072",
            "sandybrown": "#f4a460",
            "seagreen": "#2e8b57",
            "seashell": "#fff5ee",
            "sienna": "#a0522d",
            "silver": "#c0c0c0",
            "skyblue": "#87ceeb",
            "slateblue": "#6a5acd",
            "slategray": "#708090",
            "snow": "#fffafa",
            "springgreen": "#00ff7f",
            "steelblue": "#4682b4",
            "tan": "#d2b48c",
            "teal": "#008080",
            "thistle": "#d8bfd8",
            "tomato": "#ff6347",
            "turquoise": "#40e0d0",
            "violet": "#ee82ee",
            "wheat": "#f5deb3",
            "white": "#ffffff",
            "whitesmoke": "#f5f5f5",
            "yellow": "#ffff00",
            "yellowgreen": "#9acd32",
            "darkgrey": "#a9a9a9",
            "darkslategrey": "#2f4f4f",
            "dimgrey": "#696969",
            "grey": "#808080",
            "lightgray": "#d3d3d3",
            "lightslategrey": "#778899",
            "slategrey": "#708090"
        };
        return definedColorNames[colorName];
    }
}


export default IGVColor;
