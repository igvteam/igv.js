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

/**
 * Created by turner on 2/24/14.
 */
var igv = (function (igv) {


    // Used to generate color list
    // let hexs = [];
    // for (let rgbList of Object.values(igv.colorPalettes)) {
    //     for (let rgb of rgbList) {
    //         let obj = {};
    //         obj[ rgb ] = igv.Color.rgbToHex(rgb);
    //         hexs.push(obj);
    //     }
    // }

    igv.appleCrayonPalette =
        {
            licorice: "#000000",
            lead: "#1e1e1e",
            tungsten: "#3a3a3a",
            iron: "#545453",
            steel: "#6e6e6e",
            tin: "#878687",
            nickel: "#888787",
            aluminum: "#a09fa0",
            magnesium: "#b8b8b8",
            silver: "#d0d0d0",
            mercury: "#e8e8e8",
            snow: "white",
            //
            cayenne: "#891100",
            mocha: "#894800",
            aspargus: "#888501",
            fern: "#458401",
            clover: "#028401",
            moss: "#018448",
            teal: "#008688",
            ocean: "#004a88",
            midnight: "#001888",
            eggplant: "#491a88",
            plum: "#891e88",
            maroon: "#891648",
            //
            maraschino: "#ff2101",
            tangerine: "#ff8802",
            lemon: "#fffa03",
            lime: "#83f902",
            spring: "#05f802",
            seam_foam: "#03f987",
            turquoise: "#00fdff",
            aqua: "#008cff",
            blueberry: "#002eff",
            grape: "#8931ff",
            magenta: "#ff39ff",
            strawberry: "#ff2987",
            //
            salmon: "#ff726e",
            cantaloupe: "#ffce6e",
            banana: "#fffb6d",
            honeydew: "#cefa6e",
            flora: "#68f96e",
            spindrift: "#68fbd0",
            ice: "#68fdff",
            sky: "#6acfff",
            orchid: "#6e76ff",
            lavender: "#d278ff",
            bubblegum: "#ff7aff",
            carnation: "#ff7fd3"
    };

    igv.colorPickerPalette =
        [
            {
                "rgb(228,26,28)": "#e41a1c"
            },
            {
                "rgb(55,126,184)": "#377eb8"
            },
            {
                "rgb(77,175,74)": "#4daf4a"
            },
            {
                "rgb(166,86,40)": "#a65628"
            },
            {
                "rgb(152,78,163)": "#984ea3"
            },
            {
                "rgb(255,127,0)": "#ff7f00"
            },
            {
                "rgb(247,129,191)": "#f781bf"
            },
            {
                "rgb(153,153,153)": "#999999"
            },
            {
                "rgb(255,255,51)": "#ffff33"
            },
            {
                "rgb(27,158,119)": "#1b9e77"
            },
            {
                "rgb(217,95,2)": "#d95f02"
            },
            {
                "rgb(117,112,179)": "#7570b3"
            },
            {
                "rgb(231,41,138)": "#e7298a"
            },
            {
                "rgb(102,166,30)": "#66a61e"
            },
            {
                "rgb(230,171,2)": "#e6ab02"
            },
            {
                "rgb(166,118,29)": "#a6761d"
            },
            {
                "rgb(102,102,102)": "#666666"
            },
            {
                "rgb(102, 194,165)": "#66c2a5"
            },
            {
                "rgb(252,141,98)": "#fc8d62"
            },
            {
                "rgb(141,160,203)": "#8da0cb"
            },
            {
                "rgb(231,138,195)": "#e78ac3"
            },
            {
                "rgb(166,216,84)": "#a6d854"
            },
            {
                "rgb(255,217,47)": "#ffd92f"
            },
            {
                "rgb(229,196,148)": "#e5c494"
            },
            {
                "rgb(179,179,179)": "#b3b3b3"
            },
            {
                "rgb(141,211,199)": "#8dd3c7"
            },
            {
                "rgb(255,255,179)": "#ffffb3"
            },
            {
                "rgb(190,186,218)": "#bebada"
            },
            {
                "rgb(251,128,114)": "#fb8072"
            },
            {
                "rgb(128,177,211)": "#80b1d3"
            },
            {
                "rgb(253,180,98)": "#fdb462"
            },
            {
                "rgb(179,222,105)": "#b3de69"
            },
            {
                "rgb(252,205,229)": "#fccde5"
            },
            {
                "rgb(217,217,217)": "#d9d9d9"
            },
            {
                "rgb(188,128,189)": "#bc80bd"
            },
            {
                "rgb(204,235,197)": "#ccebc5"
            },
            {
                "rgb(255,237,111)": "#ffed6f"
            },
            {
                "rgb(251,180,174)": "#fbb4ae"
            },
            {
                "rgb(179,205,227)": "#b3cde3"
            },
            {
                "rgb(204,235,197)": "#ccebc5"
            },
            {
                "rgb(222,203,228)": "#decbe4"
            },
            {
                "rgb(254,217,166)": "#fed9a6"
            },
            {
                "rgb(255,255,204)": "#ffffcc"
            },
            {
                "rgb(229,216,189)": "#e5d8bd"
            },
            {
                "rgb(253,218,236)": "#fddaec"
            },
            {
                "rgb(173,226,207)": "#ade2cf"
            },
            {
                "rgb(253,205,172)": "#fdcdac"
            },
            {
                "rgb(203,213,232)": "#cbd5e8"
            },
            {
                "rgb(244,202,228)": "#f4cae4"
            },
            {
                "rgb(230,245,201)": "#e6f5c9"
            },
            {
                "rgb(255,242,174)": "#fff2ae"
            },
            {
                "rgb(243,225,206)": "#f3e1ce"
            },
            {
                "rgb(127,201,127)": "#7fc97f"
            },
            {
                "rgb(190,174,212)": "#beaed4"
            },
            {
                "rgb(253,192,134)": "#fdc086"
            },
            {
                "rgb(255,255,153)": "#ffff99"
            },
            {
                "rgb(56,108,176)": "#386cb0"
            },
            {
                "rgb(240,2,127)": "#f0027f"
            },
            {
                "rgb(191,91,23)": "#bf5b17"
            }
        ];


    let bootstrap_colors =
        [
            '#007bff',
            '#17a2b8',
            '#20c997',
            '#28a745',
            '#404EB0',
            '#6610f2',
            '#e83e8c',
            '#dc3545',
            '#fd7e14',
            '#ffc107',
            'white',
            '#343a40',
            '#6c757d'
        ];

    igv.Color = {

        rgbListFromHSV: () => {

            let s = 1;
            let accumulation = [];
            for (let v = 1; v >= 0.5; v -= .1) {
                for (let h = 0; h < 1; h += 1 / 28) {
                    const r = "rgb(" + igv.Color.hsvToRgb(h, s, v).join(",") + ")";
                    accumulation.push(r);
                }
            }

            // add black
            accumulation.pop();
            accumulation.push(igv.Color.rgbColor(16, 16, 16));

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

                r = igv.Color.hue2rgb(p, q, h + 1 / 3);
                g = igv.Color.hue2rgb(p, q, h);
                b = igv.Color.hue2rgb(p, q, h - 1 / 3);
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

            r = igv.Math.clamp(r, 0, 255);
            g = igv.Math.clamp(g, 0, 255);
            b = igv.Math.clamp(b, 0, 255);
            a = igv.Math.clamp(a, 0.0, 1.0);

            return "rgba(" + r + "," + g + "," + b + "," + a + ")";
        },

        rgbColor: function (r, g, b) {

            r = igv.Math.clamp(r, 0, 255);
            g = igv.Math.clamp(g, 0, 255);
            b = igv.Math.clamp(b, 0, 255);

            return "rgb(" + r + "," + g + "," + b + ")";
        },

        greyScale: function (value) {

            var grey = igv.Math.clamp(value, 0, 255);

            return "rgb(" + grey + "," + grey + "," + grey + ")";
        },

        randomGrey: function (min, max) {

            min = igv.Math.clamp(min, 0, 255);
            max = igv.Math.clamp(max, 0, 255);

            var g = Math.round(igv.random(min, max)).toString(10);

            return "rgb(" + g + "," + g + "," + g + ")";
        },

        randomRGB: function (min, max) {

            min = igv.Math.clamp(min, 0, 255);
            max = igv.Math.clamp(max, 0, 255);

            var r = Math.round(igv.random(min, max)).toString(10);
            var g = Math.round(igv.random(min, max)).toString(10);
            var b = Math.round(igv.random(min, max)).toString(10);

            return "rgb(" + r + "," + g + "," + b + ")";
        },

        randomRGBConstantAlpha: function (min, max, alpha) {

            min = igv.Math.clamp(min, 0, 255);
            max = igv.Math.clamp(max, 0, 255);

            var r = Math.round(igv.random(min, max)).toString(10);
            var g = Math.round(igv.random(min, max)).toString(10);
            var b = Math.round(igv.random(min, max)).toString(10);

            return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
        },

        addAlpha: function (color, alpha) {

            var isHex = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(color);

            if (color.startsWith("rgba")) {
                return color;   // TODO -- should replace current alpha with new one
            }

            if (isHex) {
                color = igv.Color.hexToRgb(color);
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

            if (!color.startsWith("rgb(")) {
                return color;
            }
            else {
                const components = color.replace(")", "").substring(4).split(",")
                const r = Math.max(0, Math.min(255, Number.parseInt(components[0].trim()) + amt));
                const g = Math.max(0, Math.min(255, Number.parseInt(components[1].trim()) + amt));
                const b = Math.max(0, Math.min(255, Number.parseInt(components[2].trim()) + amt));
                return "rgb(" + r.toString() + "," + g.toString() + "," + b.toString();
            }
        }
    };

    igv.nucleotideColorComponents = {
        "A": [0, 200, 0],
        "C": [0, 0, 200],
        "T": [255, 0, 0],
        "G": [209, 113, 5],
        "a": [0, 200, 0],
        "c": [0, 0, 200],
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

    igv.colorPalettes = {

        Set1:
            [
                "rgb(228,26,28)",
                "rgb(55,126,184)",
                "rgb(77,175,74)",
                "rgb(166,86,40)",
                "rgb(152,78,163)",
                "rgb(255,127,0)",
                "rgb(247,129,191)",
                "rgb(153,153,153)",
                "rgb(255,255,51)"
            ],

        Dark2:
            [
                "rgb(27,158,119)",
                "rgb(217,95,2)",
                "rgb(117,112,179)",
                "rgb(231,41,138)",
                "rgb(102,166,30)",
                "rgb(230,171,2)",
                "rgb(166,118,29)",
                "rgb(102,102,102)"
            ],

        Set2:
            [
                "rgb(102, 194,165)",
                "rgb(252,141,98)",
                "rgb(141,160,203)",
                "rgb(231,138,195)",
                "rgb(166,216,84)",
                "rgb(255,217,47)",
                "rgb(229,196,148)",
                "rgb(179,179,179)"
            ],

        Set3:
            [
                "rgb(141,211,199)",
                "rgb(255,255,179)",
                "rgb(190,186,218)",
                "rgb(251,128,114)",
                "rgb(128,177,211)",
                "rgb(253,180,98)",
                "rgb(179,222,105)",
                "rgb(252,205,229)",
                "rgb(217,217,217)",
                "rgb(188,128,189)",
                "rgb(204,235,197)",
                "rgb(255,237,111)"
            ],

        Pastel1:
            [
                "rgb(251,180,174)",
                "rgb(179,205,227)",
                "rgb(204,235,197)",
                "rgb(222,203,228)",
                "rgb(254,217,166)",
                "rgb(255,255,204)",
                "rgb(229,216,189)",
                "rgb(253,218,236)"
            ],

        Pastel2:
            [
                "rgb(173,226,207)",
                "rgb(253,205,172)",
                "rgb(203,213,232)",
                "rgb(244,202,228)",
                "rgb(230,245,201)",
                "rgb(255,242,174)",
                "rgb(243,225,206)"
            ],

        Accent:
            [
                "rgb(127,201,127)",
                "rgb(190,174,212)",
                "rgb(253,192,134)",
                "rgb(255,255,153)",
                "rgb(56,108,176)",
                "rgb(240,2,127)",
                "rgb(191,91,23)"
            ]
    };

    igv.PaletteColorTable = function (palette) {

        this.colors = igv.colorPalettes[palette];

        if (!Array.isArray(this.colors)) this.colors = [];
        this.colorTable = {};
        this.nextIdx = 0;
        this.colorGenerator = new RandomColorGenerator();

    };

    igv.PaletteColorTable.prototype.getColor = function (key) {

        if (!this.colorTable.hasOwnProperty(key)) {
            if (this.nextIdx < this.colors.length) {
                this.colorTable[key] = this.colors[this.nextIdx];
            } else {
                this.colorTable[key] = this.colorGenerator.get();
            }
            this.nextIdx++;
        }
        return this.colorTable[key];
    };

    // Random color generator from https://github.com/sterlingwes/RandomColor/blob/master/rcolor.js
    // Free to use & distribute under the MIT license
    // Wes Johnson (@SterlingWes)
    //
    // inspired by http://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/
    var RandomColorGenerator = function () {
        this.hue = Math.random();
        this.goldenRatio = 0.618033988749895;
        this.hexwidth = 2;
    };

    RandomColorGenerator.prototype.hsvToRgb = function (h, s, v) {
        var h_i = Math.floor(h * 6),
            f = h * 6 - h_i,
            p = v * (1 - s),
            q = v * (1 - f * s),
            t = v * (1 - (1 - f) * s),
            r = 255,
            g = 255,
            b = 255;
        switch (h_i) {
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
        return [Math.floor(r * 256), Math.floor(g * 256), Math.floor(b * 256)];
    };

    RandomColorGenerator.prototype.padHex = function (str) {
        if (str.length > this.hexwidth) return str;
        return new Array(this.hexwidth - str.length + 1).join('0') + str;
    };

    RandomColorGenerator.prototype.get = function (saturation, value) {
        this.hue += this.goldenRatio;
        this.hue %= 1;
        if (typeof saturation !== "number") saturation = 0.5;
        if (typeof value !== "number") value = 0.95;
        var rgb = this.hsvToRgb(this.hue, saturation, value);

        return "#" + this.padHex(rgb[0].toString(16))
            + this.padHex(rgb[1].toString(16))
            + this.padHex(rgb[2].toString(16));

    };


    /**
     *
     * @param cs - object containing
     * 1) array of threshold values defining bin boundaries in ascending order
     * 2) array of colors for bins  (length == thresholds.length + 1)
     * @constructor
     */
    igv.BinnedColorScale = function (cs) {
        this.thresholds = cs.thresholds;
        this.colors = cs.colors;
    };

    igv.BinnedColorScale.prototype.getColor = function (value) {

        for (let threshold of this.thresholds) {
            if (value < threshold) {
                return this.colors[ this.thresholds.indexOf(threshold) ];
            }
        }

        return this.colors[this.colors.length - 1];

    };

    /**
     *
     * @param scale - object with the following properties
     *           low
     *           lowR
     *           lowG
     *           lowB
     *           high
     *           highR
     *           highG
     *           highB
     *
     * @constructor
     */
    igv.GradientColorScale = function (scale) {

        this.scale = scale;
        this.lowColor = "rgb(" + scale.lowR + "," + scale.lowG + "," + scale.lowB + ")";
        this.highColor = "rgb(" + scale.highR + "," + scale.highG + "," + scale.highB + ")";
        this.diff = scale.high - scale.low;

    }

    igv.GradientColorScale.prototype.getColor = function (value) {

        var scale = this.scale, r, g, b, frac;

        if (value <= scale.low) return this.lowColor;
        else if (value >= scale.high) return this.highColor;

        frac = (value - scale.low) / this.diff;
        r = Math.floor(scale.lowR + frac * (scale.highR - scale.lowR));
        g = Math.floor(scale.lowG + frac * (scale.highG - scale.lowG));
        b = Math.floor(scale.lowB + frac * (scale.highB - scale.lowB));

        return "rgb(" + r + "," + g + "," + b + ")";
    }

    return igv;

})(igv || {});
