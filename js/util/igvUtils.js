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

import {FileUtils, TrackUtils} from "../../node_modules/igv-utils/src/index.js";

const extend = function (parent, child) {

    child.prototype = Object.create(parent.prototype);
    child.prototype.constructor = child;
    child.prototype._super = Object.getPrototypeOf(child.prototype);
    return child;
}

/**
 * Test if the given value is a string or number.  Not using typeof as it fails on boxed primitives.
 *
 * @param value
 * @returns boolean
 */

function isSimpleType(value) {
    const simpleTypes = new Set(["boolean", "number", "string", "symbol"]);
    const valueType = typeof value;
    return (value !== undefined && (simpleTypes.has(valueType) || value.substring || value.toFixed))
}

function buildOptions(config, options) {

    var defaultOptions = {
        oauthToken: config.oauthToken,
        headers: config.headers,
        withCredentials: config.withCredentials,
        filename: config.filename
    };

    return Object.assign(defaultOptions, options);
}

/**
 * isMobile test from http://detectmobilebrowsers.com
 * TODO -- improve UI design so this isn't neccessary
 * @returns {boolean}
 */

// igv.isMobile = function () {
//
//     const a = (navigator.userAgent || navigator.vendor || window.opera);
//     return (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) ||
//         /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4)))
//
// }

const doAutoscale = function (features) {
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
    } else {
        // No features -- default
        min = 0;
        max = 100;
    }

    return {min: min, max: max};
}


const validateLocusExtent = function (chromosomeLengthBP, extent, minimumBP) {

    let ss = extent.start;
    let ee = extent.end;

    if (undefined === ee) {

        ss -= minimumBP / 2;
        ee = ss + minimumBP;

        if (ee > chromosomeLengthBP) {
            ee = chromosomeLengthBP;
            ss = ee - minimumBP;
        } else if (ss < 0) {
            ss = 0;
            ee = minimumBP;
        }

    } else if (ee - ss < minimumBP) {

        const center = (ee + ss) / 2;

        if (center - minimumBP / 2 < 0) {
            ss = 0;
            ee = ss + minimumBP;
        } else if (center + minimumBP / 2 > chromosomeLengthBP) {
            ee = chromosomeLengthBP;
            ss = ee - minimumBP;
        } else {
            ss = center - minimumBP / 2;
            ee = ss + minimumBP;
        }
    }

    extent.start = Math.ceil(ss);
    extent.end = Math.floor(ee);
};


/*!
 * is-number <https://github.com/jonschlinkert/is-number>
 *
 * Copyright (c) 2014-present, Jon Schlinkert.
 * Released under the MIT License.
 */

const isNumber = function (num) {
    if (typeof num === 'number') {
        return num - num === 0;
    }
    if (typeof num === 'string' && num.trim() !== '') {
        return Number.isFinite ? Number.isFinite(+num) : isFinite(+num);
    }
    return false;
};


function inferTrackType(config) {

    translateDeprecatedTypes(config);

    if (config.type) {
        return config.type;
    }

    let format;
    if ("file" === config.sourceType || (undefined === config.sourceType && config.url)) {
        if (undefined === config.format) {
            const path = FileUtils.isFilePath(config.url) ? config.url.name : config.url;
            format = TrackUtils.inferFileFormat(path);
        } else {
            format = config.format.toLowerCase();
        }
    }

    if (format) {
        switch (format) {
            case "bw":
            case "bigwig":
            case "wig":
            case "bedgraph":
            case "tdf":
               return "wig";
            case "vcf":
                return "variant";
            case "seg":
                return "seg";
            case "bam":
            case "cram":
                return "alignment";
            case "bedpe":
            case "bedpe-loop":
                return "interaction";
            case "bp":
                return "arc";
            case "gwas":
                return "gwas";
            case "bed":
            case "bigbed":
            case "bb":
                return "bedtype";
            default:
                return "annotation";
        }
    }
}


function translateDeprecatedTypes(config) {

    if (config.featureType) {  // Translate deprecated "feature" type
        config.type = config.type || config.featureType;
        config.featureType = undefined;
    }
    if ("junctions" === config.type) {
        config.type = "spliceJunctions"
    } else if ("bed" === config.type) {
        config.type = "annotation";
        config.format = config.format || "bed";
    } else if ("annotations" === config.type) {
        config.type = "annotation"
    } else if ("alignments" === config.type) {
        config.type = "alignment"
    } else if ("bam" === config.type) {
        config.type = "alignment";
        config.format = "bam"
    } else if ("vcf" === config.type) {
        config.type = "variant";
        config.format = "vcf"
    } else if ("t2d" === config.type) {
        config.type = "gwas";
    } else if ("FusionJuncSpan" === config.type && !config.format) {
        config.format = "fusionjuncspan";
    } else if ("aed" === config.type) {
        config.type = "annotation";
        config.format = config.format || "aed";
    }
}


export {extend, isSimpleType, buildOptions, validateLocusExtent, doAutoscale, isNumber, inferTrackType}

