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

import {isFilePath} from './fileUtils.js'
import FileFormats from "../feature/fileFormats.js";

const knownFileExtensions = new Set([

    "narrowpeak",
    "broadpeak",
    "peaks",
    "bedgraph",
    "wig",
    "gff3",
    "gff",
    "gtf",
    "fusionjuncspan",
    "refflat",
    "seg",
    "aed",
    "bed",
    "vcf",
    "bb",
    "bigbed",
    "bw",
    "bigwig",
    "bam",
    "tdf",
    "refgene",
    "genepred",
    "genepredext",
    "bedpe",
    "bp",
    "snp",
    "rmsk",
    "cram"
]);

/**
 * Return a custom format object with the given name.
 * @param name
 * @returns {*}
 */
function getFormat(name) {

    // if (igv.browser && igv.browser.formats && igv.browser.format[name]) {
    //     return expandFormat(igv.browser.formats[name]);
    // } else
    if (FileFormats && FileFormats[name]) {
        return expandFormat(FileFormats[name]);
    } else {
        return undefined;
    }

    function expandFormat(format) {

        const fields = format.fields;
        const keys = ['chr', 'start', 'end'];

        for (let i = 0; i < fields.length; i++) {
            for (let key of keys) {
                if (key === fields[i]) {
                    format[key] = i;
                }
            }
        }

        return format;
    }
}

function inferTrackTypes(config) {

    // function inferFileFormat(config) {
    //
    //     var path;
    //
    //     if (config.format) {
    //         config.format = config.format.toLowerCase();
    //         return;
    //     }
    //
    //     path = isFilePath(config.url) ? config.url.name : config.url;
    //
    //     config.format = inferFileFormat(path);
    // }


    translateDeprecatedTypes(config);

    if (undefined === config.sourceType && config.url) {
        config.sourceType = "file";
    }

    if ("file" === config.sourceType) {
        if (undefined === config.format) {
            const path = isFilePath(config.url) ? config.url.name : config.url;
            config.format = inferFileFormat(path);
        } else {
            config.format = config.format.toLowerCase();
        }
    }

    if (undefined === config.type) {
        if (config.type) return;

        if (config.format) {

            switch (config.format.toLowerCase()) {
                case "bw":
                case "bigwig":
                case "wig":
                case "bedgraph":
                case "tdf":
                    config.type = "wig";
                    break;
                case "vcf":
                    config.type = "variant";
                    break;
                case "seg":
                    config.type = "seg";
                    break;
                case "bam":
                case "cram":
                    config.type = "alignment";
                    break;
                case "bedpe":
                case "bedpe-loop":
                    config.type = "interaction";
                    break;
                case "bp":
                    config.type = "arc"
                    break;
                default:
                    config.type = "annotation";

            }
        }

    }
}

function inferFileFormat(fn) {

    var idx, ext;

    fn = fn.toLowerCase();

    // Special case -- UCSC refgene files
    if (fn.endsWith("refgene.txt.gz") ||
        fn.endsWith("refgene.txt.bgz") ||
        fn.endsWith("refgene.txt") ||
        fn.endsWith("refgene.sorted.txt.gz") ||
        fn.endsWith("refgene.sorted.txt.bgz")) {
        return "refgene";
    }


    //Strip parameters -- handle local files later
    idx = fn.indexOf("?");
    if (idx > 0) {
        fn = fn.substr(0, idx);
    }

    //Strip aux extensions .gz, .tab, and .txt
    if (fn.endsWith(".gz")) {
        fn = fn.substr(0, fn.length - 3);
    }

    if (fn.endsWith(".txt") || fn.endsWith(".tab") || fn.endsWith(".bgz")) {
        fn = fn.substr(0, fn.length - 4);
    }


    idx = fn.lastIndexOf(".");
    ext = idx < 0 ? fn : fn.substr(idx + 1);

    switch (ext) {
        case "bw":
            return "bigwig";
        case "bb":
            return "bigbed";

        default:
            if (knownFileExtensions.has(ext)) {
                return ext;
            } else {
                return undefined;
            }
    }

}

function inferIndexPath(url, extension) {

    var path, idx;

    if (url instanceof File) {
        throw new Error("Cannot infer an index path for a local File.  Please select explicitly")
    }

    if (url.includes("?")) {
        idx = url.indexOf("?");
        return url.substring(0, idx) + "." + extension + url.substring(idx);
    } else {
        return url + "." + extension;
    }
}

function translateDeprecatedTypes(config) {

    if (config.featureType) {  // Translate deprecated "feature" type
        config.type = config.type || config.featureType;
        config.featureType = undefined;
    }
    if ("bed" === config.type) {
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

/**
 * Parse a locus string and return a range object.  Locus string is of the form chr:start-end.  End is optional
 *
 */
function parseLocusString(string) {

    const t1 = string.split(":");
    const t2 = t1[1].split("-");

    const range = {
        chr: t1[0],
        start: Number.parseInt(t2[0].replace(/,/g, '')) - 1
    };

    if (t2.length > 1) {
        range.end = Number.parseInt(t2[1].replace(/,/g, ''));
    } else {
        range.end = range.start + 1;
    }

    return range;
}


export {knownFileExtensions, getFormat, inferTrackTypes, inferFileFormat, inferIndexPath, parseLocusString};
