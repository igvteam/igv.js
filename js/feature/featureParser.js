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

import getDataWrapper from "./dataWrapper.js";
import {TrackUtils} from "../../node_modules/igv-utils/src/index.js";
import {decodeBedpe, decodeBedpeDomain, fixBedPE} from './decode/bedpe.js';
import {decodeInteract} from "./decode/interact.js";
import {
    decodeBed,
    decodeBedGraph,
    decodeGenePred,
    decodeGenePredExt,
    decodePeak,
    decodeReflat,
    decodeRepeatMasker,
    decodeSNP,
    decodeWig
} from "./decode/ucsc.js";
import {decodeGFF} from "./decode/gff.js";
import {decodeFusionJuncSpan} from "./decode/fusionJuncSpan.js";
import {decodeGtexGWAS} from "./decode/gtexGWAS.js";
import {decodeCustom} from "./decode/custom.js";
import {decodeGcnv} from "../gcnv/gcnvDecoder.js";

/**
 *  Parser for column style (tab delimited, etc) text file formats (bed, gff, vcf, etc).
 *
 *
 */


/**
 * Return a parser for the given file format.
 */
class FeatureParser {

    constructor(config) {

        const format = config.format;
        const decode = config.decode

        this.header = {};
        this.decode = decode;
        this.config = config;

        if (format !== undefined) {
            // See if this is a custom format
            const customFormat = TrackUtils.getFormat(format);
            if (customFormat !== undefined) {
                this.decode = decodeCustom;
                this.header.format = customFormat;
                this.delimiter = customFormat.delimiter || "\t";
            }
            this.header.format = format.toLowerCase();
            if(!this.decode) {
                this.decode = this.getDecoder(this.header.format);
            }
            this.delimiter = this.config.delimiter || getDelimiter(this.header.format);
        }

        //if(this.decode = decodeGtexGWAS) this.skipRows = 1;

        this.header.nameField = config ? config.nameField : undefined;
        this.skipRows = 0;   // The number of fixed header rows to skip.  Override for specific types as needed

    }

    /**
     * Parse metadata from the file.   A variety of conventions are in use to supply metadata about file contents
     * through header lines (e.g. 'track') and # directives. This method unifies metadata as properties of a
     * 'header' object.
     *
     * @param data
     * @returns {{}}
     */
    parseHeader(data) {

        const dataWrapper = getDataWrapper(data);
        let header = this.header;
        let columnNames;
        let line;
        let skipRows = 0;
        while ((line = dataWrapper.nextLine()) !== undefined) {
            if (line.startsWith("track") || line.startsWith("#track")) {
                let h = parseTrackLine(line);
                Object.assign(header, h);
            } else if (line.startsWith("browser")) {
                // UCSC line, currently ignored
            } else if (line.startsWith("#columns")) {
                let h = parseColumnsDirective(line);
                Object.assign(header, h);
            } else if (line.startsWith("##gff-version 3")) {
                header.format = "gff3";
                header["format"] = "gff3";
            } else if (line.startsWith("#gffTags")) {
                header["gffTags"] = true;
            } else if (line.startsWith("fixedStep") || line.startsWith("variableStep")) {
                // Wig directives -- we are in the data section
                break;
            } else {
                // If the line can be parsed as a feature assume we are beyond the header, if any
                const tokens = line.split(this.delimiter || "\t");
                try {
                    // All directives that could change the format, and thus decoder, should have been read by now.
                    const decoder = this.getDecoder();
                    if (!line.startsWith("#") && decoder(tokens, header)) {
                        if (columnNames && columnNames.length === tokens.length) {
                            header.columnNames = columnNames;
                            for (let n = 0; n < columnNames.length; n++) {
                                if (columnNames[n] === "color" || columnNames[n] === "colour") {
                                    header.colorColumn = n;
                                } else if (columnNames[n] === "thickness") {
                                    header.thicknessColumn = n;
                                }
                            }
                        }
                        break;
                    } else {
                        if (tokens.length > 1) {
                            header.columnNames = tokens;  // Possible column names
                        }
                    }
                } catch (e) {
                    if (tokens.length > 1) {
                        header.columnNames = tokens;  // Possible column names
                    }
                }
            }
            skipRows++;
        }

        this.skipRows = skipRows;
        this.header = header;    // Directives might be needed for parsing lines
        return header;
    }

    parseFeatures(data) {

        if (!data) return null;

        const dataWrapper = getDataWrapper(data);
        const nextLine = dataWrapper.nextLine.bind(dataWrapper);
        const allFeatures = [];
        const decode = this.getDecoder();
        const format = this.header.format;
        const delimiter = this.delimiter || "\t";
        let i = 0;
        let line;
        while ((line = nextLine()) !== undefined) {
            i++;
            if (i <= this.skipRows) continue;

            if (!line || line.startsWith("track") || line.startsWith("#") || line.startsWith("browser")) {
                continue;
            } else if (format === "wig" && line.startsWith("fixedStep")) {
                this.header.wig = parseFixedStep(line);
                continue;
            } else if (format === "wig" && line.startsWith("variableStep")) {
                this.header.wig = parseVariableStep(line);
                continue;
            }

            const tokens = line.split(delimiter);
            if (tokens.length < 1) {
                continue;
            }

            const feature = decode(tokens, this.header);
            if (feature) {
                allFeatures.push(feature);
            }
        }

        // Special hack for bedPE
        if (decode === decodeBedpe) {
            fixBedPE(allFeatures);
        }

        return allFeatures;

    }

    getDecoder(header) {

        if (!this.decode) {
            switch (this.header.format) {
                case "narrowpeak":
                case "broadpeak":
                case "regionpeak":
                case "peaks":
                    this.decode = decodePeak;
                    this.delimiter = this.config.delimiter || /\s+/;
                    break;
                case "bedgraph":
                    this.decode = decodeBedGraph;
                    this.delimiter = /\s+/;
                    break;
                case "wig":
                    this.decode = decodeWig;
                    this.delimiter = this.config.delimiter || /\s+/;
                    break;
                case "gff3" :
                case "gff" :
                case "gtf" :
                    this.decode = decodeGFF;
                    this.delimiter = "\t";
                    break;
                case "fusionjuncspan":
                    // bhaas, needed for FusionInspector view
                    this.decode = decodeFusionJuncSpan;
                    this.delimiter = this.config.delimiter || /\s+/;
                    break;
                case "gtexgwas":
                    this.skipRows = 1;
                    this.decode = decodeGtexGWAS;
                    this.delimiter = "\t";
                    break;
                case "refflat":
                    this.decode = decodeReflat;
                    this.delimiter = this.config.delimiter || /\s+/;
                    break;
                case "genepred":
                    this.decode = decodeGenePred;
                    this.delimiter = this.config.delimiter || /\s+/;
                    break;
                case "genepredext":
                    this.decode = decodeGenePredExt;
                    this.delimiter = this.config.delimiter || /\s+/;
                    break;
                case "ensgene":
                    this.decode = decodeGenePred
                    this.header.shift = 1;
                    this.delimiter = this.config.delimiter || /\s+/;
                    break;
                case "refgene":
                    this.decode = decodeGenePredExt;
                    this.delimiter = this.config.delimiter || /\s+/;
                    this.header.shift = 1;
                    break;
                case "bed":
                    this.decode = decodeBed;
                    this.delimiter = this.config.delimiter || /\s+/;
                    break;
                case "bedpe":
                    this.decode = decodeBedpe;
                    this.delimiter = this.config.delimiter || "/t";
                    break;
                case "bedpe-domain":
                    this.decode = decodeBedpeDomain;
                    this.headerLine = true;
                    this.delimiter = this.config.delimiter || "/t";
                    break;
                case "bedpe-loop":
                    this.decode = decodeBedpe;
                    this.delimiter = this.config.delimiter || "/t";
                    this.header = {colorColumn: 7};
                    break;
                case "interact":
                    this.decode = decodeInteract;
                    this.delimiter = this.config.delimiter || /\s+/;
                    break;
                case "snp":
                    this.decode = decodeSNP;
                    this.delimiter = "\t";
                    break;
                case "rmsk":
                    this.decode = decodeRepeatMasker;
                    this.delimiter = "\t";
                    break;
                case "gcnv":
                    this.decode = decodeGcnv;
                    this.delimiter = "\t";
                    break;
                default:
                    const customFormat = TrackUtils.getFormat(this.header.format);
                    if (customFormat !== undefined) {
                        this.decode = decodeCustom;
                        this.header.format = customFormat;
                        this.delimiter = customFormat.delimiter || "\t";
                    } else {
                        this.decode = decodeBed;
                        this.delimiter = this.config.delimiter || /\s+/;
                    }
            }
        }

        return this.decode;
    }

}

function parseTrackLine(line) {

    const properties = {};
    const tokens = line.split(/(?:")([^"]+)(?:")|([^\s"]+)(?=\s+|$)/g);

    // Clean up tokens array
    let curr;
    const tmp = [];
    for (let tk of tokens) {
        if (!tk || tk.trim().length === 0) continue;
        if (tk.endsWith("=")) {
            curr = tk;
        } else if (curr) {
            tmp.push(curr + tk);
            curr = undefined;
        } else {
            tmp.push(tk);
        }
    }

    for (let str of tmp) {
        if (!str) return;
        var kv = str.split('=', 2);
        if (kv.length === 2) {
            const key = kv[0].trim();
            const value = kv[1].trim();
            if (properties.hasOwnProperty(key)) {
                let currentValue = properties[key];
                if (Array.isArray(currentValue)) {
                    currentValue.push(value);
                } else {
                    properties[key] = [currentValue, value];
                }
            } else {
                properties[key] = value;
            }
        }
    }
    if ("interact" == properties["type"]) {
        properties["format"] = "interact";
    } else if ("gcnv" === properties["type"]) {
        properties["format"] = "gcnv";
    }
    return properties;
}

function parseColumnsDirective(line) {

    let properties = {};
    let t1 = line.split(/\s+/);

    if (t1.length === 2) {
        let t2 = t1[1].split(";");
        t2.forEach(function (keyValue) {
            let t = keyValue.split("=");
            if (t[0] === "color") {
                properties.colorColumn = Number.parseInt(t[1]) - 1;
            } else if (t[0] === "thickness") {
                properties.thicknessColumn = Number.parseInt(t[1]) - 1;
            }
        })
    }

    return properties;
}

function parseFixedStep(line) {
    const tokens = line.split(/\s+/);
    const chrom = tokens[1].split("=")[1];
    const start = parseInt(tokens[2].split("=")[1], 10) - 1;
    const step = parseInt(tokens[3].split("=")[1], 10);
    const span = (tokens.length > 4) ? parseInt(tokens[4].split("=")[1], 10) : 1;
    return {format: "fixedStep", chrom, start, step, span, index: 0};
}

function parseVariableStep(line) {
    const tokens = line.split(/\s+/);
    const chrom = tokens[1].split("=")[1];
    const span = tokens.length > 2 ? parseInt(tokens[2].split("=")[1], 10) : 1;
    return {format: "variableStep", chrom, span}
}

function getDecoder(format) {

    switch (format) {
        case "narrowpeak":
        case "broadpeak":
        case "regionpeak":
        case "peaks":
            return decodePeak;
        case "bedgraph":
            return decodeBedGraph;
        case "wig":
            return decodeWig;
        case "gff3" :
        case "gff" :
        case "gtf" :
            return decodeGFF;
        case "fusionjuncspan":
            return decodeFusionJuncSpan;
        case "gtexgwas":
            return decodeGtexGWAS;
        case "refflat":
            return decodeReflat;
        case "genepred":
            return decodeGenePred;
        case "genepredext":
            return decodeGenePredExt;
        case "ensgene":
            return decodeGenePred;
        case "refgene":
            return decodeGenePredExt;
        case "bed":
            return decodeBed;
        case "bedpe":
            return decodeBedpe;
        case "bedpe-domain":
            return decodeBedpeDomain;
        case "bedpe-loop":
            return decodeBedpe;
        case "interact":
            return decodeInteract;
        case "snp":
            return decodeSNP;
        case "rmsk":
            return decodeRepeatMasker;
        case "gcnv":
            return decodeGcnv;
        default:
            const customFormat = TrackUtils.getFormat(format);
            if (customFormat !== undefined) {
                this.decode = decodeCustom;
                this.header.format = customFormat;
                this.delimiter = customFormat.delimiter || "\t";
            } else {
                return decodeBed;
            }
    }

}


function getDelimiter(format) {
    return spaceDelimited.has(format) ? /\s+/ : "\t";
}

const spaceDelimited = new Set([
    "narrowpeak",
    "broadpeak",
    "regionpeak",
    "peaks",
    "fusionjuncspan",
    "bedgraph",
    "wig",
    "refflat",
    "genepred",
    "genepredext",
    "ensgene",
    "refgene",
    "bed",
    "interact"
])

export default FeatureParser;
