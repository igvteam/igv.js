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


    createColorString: function (token) {
        if (token.includes(",")) {
            return token.startsWith("rgb") ? token : "rgb(" + token + ")";
        } else {
            return token;
        }
    },

    darkenLighten: function (color, amt) {

        const src = color.startsWith('rgb(') ? color : IGVColor.hexToRgb(color);

        const components = src.replace(")", "").substring(4).split(",");

        const r = Math.max(0, Math.min(255, Number.parseInt(components[0].trim()) + amt));
        const g = Math.max(0, Math.min(255, Number.parseInt(components[1].trim()) + amt));
        const b = Math.max(0, Math.min(255, Number.parseInt(components[2].trim()) + amt));

        return 'rgb(' + r.toString() + ',' + g.toString() + ',' + b.toString() + ')';

    }
};


export default IGVColor;
