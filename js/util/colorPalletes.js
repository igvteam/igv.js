import {IGVMath} from "../../node_modules/igv-utils/src/index.js";

const appleCrayonPalette =
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
        sea_foam: "#03f987",
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
    }

const appleCrayonRGBPalette =
    {
        cantaloupe: { r:255, g:206, b:110 },
        honeydew:   { r:206, g:250, b:110 },
        spindrift:  { r:104, g:251, b:208 },
        sky:        { r:106, g:207, b:255 },
        lavender:   { r:210, g:120, b:255 },
        carnation:  { r:255, g:127, b:211 },
        licorice:   { r:0, g:0, b:0 },
        snow:       { r:255, g:255, b:255 },
        salmon:     { r:255, g:114, b:110 },
        banana:     { r:255, g:251, b:109 },
        flora:      { r:104, g:249, b:110 },
        ice:        { r:104, g:253, b:255 },
        orchid:     { r:110, g:118, b:255 },
        bubblegum:  { r:255, g:122, b:255 },
        lead:       { r:30, g:30, b:30 },
        mercury:    { r:232, g:232, b:232 },
        tangerine:  { r:255, g:136, b:2 },
        lime:       { r:131, g:249, b:2 },
        sea_foam:  { r:3, g:249, b:135 },
        aqua:       { r:0, g:140, b:255 },
        grape:      { r:137, g:49, b:255 },
        strawberry: { r:255, g:41, b:135 },
        tungsten:   { r:58, g:58, b:58 },
        silver:     { r:208, g:208, b:208 },
        maraschino: { r:255, g:33, b:1 },
        lemon:      { r:255, g:250, b:3 },
        spring:     { r:5, g:248, b:2 },
        turquoise:  { r:0, g:253, b:255 },
        blueberry:  { r:0, g:46, b:255 },
        magenta:    { r:255, g:57, b:255 },
        iron:       { r:84, g:84, b:83 },
        magnesium:  { r:184, g:184, b:184 },
        mocha:      { r:137, g:72, b:0 },
        fern:       { r:69, g:132, b:1 },
        moss:       { r:1, g:132, b:72 },
        ocean:      { r:0, g:74, b:136 },
        eggplant:   { r:73, g:26, b:136 },
        maroon:     { r:137, g:22, b:72 },
        steel:      { r:110, g:110, b:110 },
        aluminum:   { r:160, g:159, b:160 },
        cayenne:    { r:137, g:17, b:0 },
        aspargus:   { r:136, g:133, b:1 },
        clover:     { r:2, g:132, b:1 },
        teal:       { r:0, g:134, b:136 },
        midnight:   { r:0, g:24, b:136 },
        plum:       { r:137, g:30, b:136 },
        tin:        { r:135, g:134, b:135 },
        nickel:     { r:136, g:135, b:135 }
    }

function appleCrayonRGB(name) {
    const { r, g, b } = appleCrayonRGBPalette[ name ]
    return `rgb(${ r },${ g },${ b })`
}

function appleCrayonRGBAlpha(name, alpha) {
    const { r, g, b } = appleCrayonRGBPalette[ name ]
    return `rgba(${ r },${ g },${ b },${ alpha })`
}

const colorPalettes = {

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

function PaletteColorTable  (palette) {

    this.colors = colorPalettes[palette];

    if (!Array.isArray(this.colors)) this.colors = [];
    this.colorTable = {};
    this.nextIdx = 0;
    this.colorGenerator = new RandomColorGenerator();

}

PaletteColorTable.prototype.getColor = function (key) {

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
function RandomColorGenerator() {
    this.hue = Math.random();
    this.goldenRatio = 0.618033988749895;
    this.hexwidth = 2;
}

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

const randomColorGenerator = new RandomColorGenerator();
function randomColor() {
    return randomColorGenerator.get();
}

// Returns a random number between min (inclusive) and max (exclusive)
function random(min, max) {
    return Math.random() * (max - min) + min;
}
// Used to generate color list
// let hexs = [];
// for (let rgbList of Object.values(colorPalettes)) {
//     for (let rgb of rgbList) {
//         let obj = {};
//         obj[ rgb ] = IGVColor.rgbToHex(rgb);
//         hexs.push(obj);
//     }
// }

function randomRGBConstantAlpha(min, max, alpha) {

    min = IGVMath.clamp(min, 0, 255)
    max = IGVMath.clamp(max, 0, 255)

    const r = Math.round(Math.random() * (max - min) + min).toString(10)
    const g = Math.round(Math.random() * (max - min) + min).toString(10)
    const b = Math.round(Math.random() * (max - min) + min).toString(10)
    return `rgba(${ r },${ g },${ b }, ${ alpha })`

}

function rgbaColor(r, g, b, a) {
    r = IGVMath.clamp(r, 0, 255)
    g = IGVMath.clamp(g, 0, 255)
    b = IGVMath.clamp(b, 0, 255)
    a = IGVMath.clamp(a, 0.0, 1.0)
    return `rgba(${r}, ${g}, ${b}, ${a})`
}

function rgbColor(r, g, b) {
    r = IGVMath.clamp(r, 0, 255);
    g = IGVMath.clamp(g, 0, 255);
    b = IGVMath.clamp(b, 0, 255);
    return `rgb(${r}, ${g}, ${b})`
}

function greyScale(value) {
    value = IGVMath.clamp(value, 0, 255);
    return `rgb(${value}, ${value}, ${value})`
}

function randomRGB(min, max) {

    min = IGVMath.clamp(min, 0, 255)
    max = IGVMath.clamp(max, 0, 255)

    const r = Math.round(Math.random() * (max - min) + min).toString(10)
    const g = Math.round(Math.random() * (max - min) + min).toString(10)
    const b = Math.round(Math.random() * (max - min) + min).toString(10)
    return `rgb(${ r },${ g },${ b })`

}

function randomGrey(min, max) {

    min = IGVMath.clamp(min, 0, 255)
    max = IGVMath.clamp(max, 0, 255)

    const value = Math.round(Math.random() * (max - min) + min).toString(10)
    return `rgb(${ value },${ value },${ value })`

}

export {appleCrayonRGB, appleCrayonRGBAlpha, appleCrayonPalette, PaletteColorTable, randomColor, rgbaColor, rgbColor, greyScale, randomGrey, randomRGB, randomRGBConstantAlpha };
