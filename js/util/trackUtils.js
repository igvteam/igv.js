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

import {igvxhr, StringUtils} from "../../node_modules/igv-utils/src/index.js"
import FileFormats from "./fileFormats.js"
import {isHiccups} from "../feature/decode/bedpe.js"
import {buildOptions} from "./igvUtils.js"

const knownFileExtensions = new Set([

    "narrowpeak",
    "broadpeak",
    "regionpeak",
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
    "biginteract",
    "biggenepred",
    "bignarrowpeak",
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
    "cram",
    "gwas",
    "maf",
    "mut",
    "tsv",
    "hiccups",
    "fasta",
    "fa",
    "fna"
])

/**
 * Return a custom format object with the given name.
 * @param name
 * @returns {*}
 */
function getFormat(name) {

    if (FileFormats && FileFormats[name]) {
        return expandFormat(FileFormats[name])
    } else {
        return undefined
    }

    function expandFormat(format) {

        const fields = format.fields
        const keys = ['chr', 'start', 'end']

        for (let i = 0; i < fields.length; i++) {
            for (let key of keys) {
                if (key === fields[i]) {
                    format[key] = i
                }
            }
        }

        return format
    }
}

function inferFileFormat(fn) {

    var idx, ext

    fn = fn.toLowerCase()

    // Special case -- UCSC refgene files
    if (fn.endsWith("refgene.txt.gz") ||
        fn.endsWith("refgene.txt.bgz") ||
        fn.endsWith("refgene.txt") ||
        fn.endsWith("refgene.sorted.txt.gz") ||
        fn.endsWith("refgene.sorted.txt.bgz")) {
        return "refgene"
    }


    //Strip parameters -- handle local files later
    idx = fn.indexOf("?")
    if (idx > 0) {
        fn = fn.substr(0, idx)
    }

    //Strip aux extensions .gz, .tab, and .txt
    if (fn.endsWith(".gz")) {
        fn = fn.substr(0, fn.length - 3)
    }

    if (fn.endsWith(".txt") || fn.endsWith(".tab") || fn.endsWith(".bgz")) {
        fn = fn.substr(0, fn.length - 4)
    }


    idx = fn.lastIndexOf(".")
    ext = idx < 0 ? fn : fn.substr(idx + 1)

    switch (ext) {
        case "bw":
            return "bigwig"
        case "bb":
            return "bigbed"
        case "fasta":
        case "fa":
        case "fna":
            return "fasta"
        default:
            if (knownFileExtensions.has(ext)) {
                return ext
            } else {
                return undefined
            }

    }

}

function inferIndexPath(url, extension) {

    if (StringUtils.isString(url)) {
        if (url.includes("?")) {
            const idx = url.indexOf("?")
            return url.substring(0, idx) + "." + extension + url.substring(idx)
        } else {
            return url + "." + extension
        }
    } else {
        return undefined
    }
}


function inferTrackType(config) {

    translateDeprecatedTypes(config)

    if (config.type) {
        return config.type
    }

    if (config.format) {
        const format = config.format.toLowerCase()
        switch (format) {
            case "bw":
            case "bigwig":
            case "wig":
            case "bedgraph":
            case "tdf":
                return "wig"
            case "vcf":
                return "variant"
            case "seg":
                return "seg"
            case "mut":
            case "maf":
                return "mut"
            case "bam":
            case "cram":
                return "alignment"
            case "hiccups":
            case "bedpe":
            case "bedpe-loop":
            case "biginteract":
                return "interact"
            case "bp":
                return "arc"
            case "gwas":
                return "gwas"
            case "bed":
            case "bigbed":
            case "bb":
            case "biggenepred":
            case "bignarrowpeak":
                return "bedtype"
            case "fasta":
                return "sequence"
            default:
                return "annotation"
        }
    }
}

function translateDeprecatedTypes(config) {

    if (config.featureType) {  // Translate deprecated "feature" type
        config.type = config.type || config.featureType
        config.featureType = undefined
    }
    if ("junctions" === config.type) {
        config.type = "junction"
    } else if ("bed" === config.type) {
        config.type = "annotation"
        config.format = config.format || "bed"
    } else if ("annotations" === config.type) {
        config.type = "annotation"
    } else if ("alignments" === config.type) {
        config.type = "alignment"
    } else if ("bam" === config.type) {
        config.type = "alignment"
        config.format = "bam"
    } else if ("vcf" === config.type) {
        config.type = "variant"
        config.format = "vcf"
    } else if ("t2d" === config.type) {
        config.type = "gwas"
    } else if ("FusionJuncSpan" === config.type && !config.format) {
        config.format = "fusionjuncspan"
    } else if ("aed" === config.type) {
        config.type = "annotation"
        config.format = config.format || "aed"
    }
}

/**
 * Attempt to infer the file format by reading a few lines from the header.  Currently this only supports "tsv" extensions,
 * it was added specifically for "hiccups" type tsv files in ENCODE.  Might be expanded in the future.
 *
 * @param url
 * @returns {Promise<void>}
 */
async function inferFileFormatFromHeader(config) {

    if (config.url) {
        const firstBytes = await igvxhr.loadString(config.url, buildOptions(config, {range: {start: 0, size: 1000}}))
        if(firstBytes) {
            const columnNames = firstBytes.split('\n')[0].split('\t')
            if(isHiccups(columnNames)) {
                return "hiccups"
            }
        }
    }

    return undefined

}


export {knownFileExtensions, getFormat, inferFileFormat, inferFileFormatFromHeader, inferTrackType, inferIndexPath}
