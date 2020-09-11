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
import IGVColor from "../igv-color.js";
import {getFormat} from "../util/trackUtils.js";
import {isNumber} from "../util/igvUtils.js";
import {decodeBedpe, decodeInteract, decodeBedpeDomain} from './bedpe.js';
import {numberFormatter} from "../util/stringUtils.js"

/**
 *  Define parsers for bed-like files  (.bed, .gff, .vcf, etc).  A parser should implement 2 methods
 *
 *     parseHeader(data) - return an object representing a header or metadata.  Details are format specific
 *
 *     parseFeatures(data) - return an array of features
 *
 */

const maxFeatureCount = Number.MAX_SAFE_INTEGER;    // For future use,  controls downsampling
const gffNameFields = ["Name", "gene_name", "gene", "gene_id", "alias", "locus", "name"];

/**
 * Return a parser for the given file format.
 */
const FeatureParser = function (format, decode, config) {

    var customFormat;

    if (format !== undefined) {
        this.format = format.toLowerCase();
    }
    this.nameField = config ? config.nameField : undefined;
    this.skipRows = 0;   // The number of fixed header rows to skip.  Override for specific types as needed

    if (decode) {
        this.decode = decode;
    } else {

        switch (this.format) {
            case "narrowpeak":
            case "broadpeak":
            case "regionpeak":
            case "peaks":
                this.decode = decodePeak;
                this.delimiter = /\s+/;
                break;
            case "bedgraph":
                this.decode = decodeBedGraph;
                this.delimiter = /\s+/;
                break;
            case "wig":
                this.decode = decodeWig;
                this.delimiter = /\s+/;
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
                this.delimiter = /\s+/;
                break;
            case "gtexgwas":
                this.skipRows = 1;
                this.decode = decodeGtexGWAS;
                this.delimiter = "\t";
                break;
            case "refflat":
                this.decode = decodeReflat;
                this.delimiter = /\s+/;
                break;
            case "genepred":
                this.decode = decodeGenePred;
                this.delimiter = /\s+/;
                break;
            case "genepredext":
                this.decode = decodeGenePredExt;
                this.delimiter = /\s+/;
                break;
            case "ensgene":
                this.decode = decodeGenePred
                this.shift = 1;
                this.delimiter = /\s+/;
                break;
            case "refgene":
                this.decode = decodeGenePredExt;
                this.delimiter = /\s+/;
                this.shift = 1;
                break;
            case "bed":
                this.decode = decodeBed;
                this.delimiter = config.delimiter || /\s+/;
                break;
            case "bedpe":
                this.skipRows = 0;
                this.decode = decodeBedpe;
                this.delimiter = /\s+/;
                break;
            case "bedpe-domain":
                this.decode = decodeBedpeDomain;
                this.headerLine = true;
                this.delimiter = /\s+/;
                break;
            case "bedpe-loop":
                this.decode = decodeBedpe;
                this.delimiter = /\s+/;
                this.skipRows = 1;
                this.header = {colorColumn: 7};
                break;
            case "interact":
                this.decode = decodeInteract;
                this.delimiter = /\s+/;
                break;
            case "snp":
                this.decode = decodeSNP;
                this.delimiter = "\t";
                break;
            case "rmsk":
                this.decode = decodeRepeatMasker;
                this.delimiter = "\t";
                break;
            default:

                customFormat = getFormat(this.format);
                if (customFormat !== undefined) {
                    this.decode = decodeCustom;
                    this.format = customFormat;
                    this.delimiter = customFormat.delimiter || "\t";
                } else {
                    this.decode = decodeBed;
                    this.delimiter = /\s+/;
                }
        }
    }

};

FeatureParser.prototype.parseHeader = function (data) {

    const dataWrapper = getDataWrapper(data);
    let line, header;
    while ((line = dataWrapper.nextLine()) !== undefined) {
        if (line.startsWith("track") || line.startsWith("#") || line.startsWith("browser")) {
            if (line.startsWith("track") || line.startsWith("#track")) {
                let h = parseTrackLine(line);
                if (header) {
                    Object.assign(header, h);
                } else {
                    header = h;
                }
            } else if (line.startsWith("#columns")) {
                let h = parseColumnsDirective(line);
                if (header) {
                    Object.assign(header, h);
                } else {
                    header = h;
                }
            } else if (line.startsWith("##gff-version 3")) {
                this.format = "gff3";
                if (!header) header = {};
                header["format"] = "gff3";
            } else if (line.startsWith("#gffTags")) {
                if (!header) header = {};
                header["gffTags"] = true;
            }
        } else {
            break;
        }
    }
    this.header = header;    // Directives might be needed for parsing lines
    return header;
}

FeatureParser.prototype.parseFeatures = function (data) {

    if (!data) return null;

    const dataWrapper = getDataWrapper(data);
    const nextLine = dataWrapper.nextLine.bind(dataWrapper);
    const allFeatures = [];
    let cnt = 0;
    const decode = this.decode;
    const format = this.format;
    const delimiter = this.delimiter || "\t";
    let i = 0;
    let wig;
    let line;
    while ((line = nextLine()) !== undefined) {
        i++;
        if (i <= this.skipRows) continue;

        if (!line || line.startsWith("track") || line.startsWith("#") || line.startsWith("browser")) {
            continue;
        } else if (format === "wig" && line.startsWith("fixedStep")) {
            wig = parseFixedStep(line);
            continue;
        } else if (format === "wig" && line.startsWith("variableStep")) {
            wig = parseVariableStep(line);
            continue;
        }

        const tokens = line.split(delimiter);
        if (tokens.length < 1) {
            continue;
        }

        const feature = decode.call(this, tokens, wig);

        if (feature) {
            if (allFeatures.length < maxFeatureCount) {
                allFeatures.push(feature);
            } else {
                // Reservoir sampling,  conditionally replace existing feature with new one.
                const j = Math.floor(Math.random() * cnt);
                if (j < maxFeatureCount) {
                    allFeatures[j] = feature;
                }
            }
            cnt++;
        }
    }

    // Special hack for bedPE
    if (decode === decodeBedpe) {
        setBedPEValue(allFeatures);
    }

    return allFeatures;

    // Double quoted strings can contain newlines in AED
    // "" is an escape for a ".
    // Parse all this, clean it up, split into tokens in a custom way
    function readTokensAed() {
        var tokens = [],
            token = "",
            quotedString = false,
            n,
            c;

        while (line || line === '') {
            for (n = 0; n < line.length; n++) {
                c = line.charAt(n);
                if (c === delimiter) {
                    if (!quotedString) {
                        tokens.push(token);
                        token = "";
                    } else {
                        token += c;
                    }
                } else if (c === "\"") {
                    // Look ahead to the next character
                    if (n + 1 < line.length && line.charAt(n + 1) === "\"") {
                        if (quotedString) {
                            // Turn "" into a single " in the output string
                            token += "\"";
                        } else {
                            // "" on its own means empty string, ignore
                        }
                        // Skip the next double quote
                        n++;
                    } else {
                        // We know the next character is NOT a double quote, flip our state
                        quotedString = !quotedString;
                    }
                } else {
                    token += c;
                }
            }
            // We are at the end of the line
            if (quotedString) {
                token += '\n'; // Add newline to the token
                line = nextLine(); // Keep going
            } else {
                // We can end the loop
                break;
            }
        }
        // Push the last token
        tokens.push(token);
        return tokens;
    }
}


function parseFixedStep(line) {

    var tokens = line.split(/\s+/),
        cc = tokens[1].split("=")[1],
        ss = parseInt(tokens[2].split("=")[1], 10) - 1,
        step = parseInt(tokens[3].split("=")[1], 10),
        span = (tokens.length > 4) ? parseInt(tokens[4].split("=")[1], 10) : 1;

    return {format: "fixedStep", chrom: cc, start: ss, step: step, span: span, index: 0};

}

function parseVariableStep(line) {

    var tokens = line.split(/\s+/),
        cc = tokens[1].split("=")[1],
        span = tokens.length > 2 ? parseInt(tokens[2].split("=")[1], 10) : 1;
    return {format: "variableStep", chrom: cc, span: span}
}

function parseTrackLine(line) {

    const properties = {};
    const tokens = line.split(/(?:")([^"]+)(?:")|([^\s"]+)(?=\s+|$)/g);


    // Clean up tokens array
    let curr;
    const tmp = [];
    for (let tk of tokens) {
        if (!tk || tk.trim().length === 0) continue;
        if (tk.endsWith("=") > 0) {
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
            properties[key] = value;
        }

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

/**
 * Decode the "standard" UCSC bed format
 * @param tokens
 * @param ignore
 * @returns decoded feature, or null if this is not a valid record
 */
function decodeBed(tokens, ignore) {

    var chr, start, end, id, name, tmp, idName, exonCount, exonSizes, exonStarts, exons, exon, feature,
        eStart, eEnd;

    if (tokens.length < 3) return undefined;

    const gffTags = this.header && this.header.gffTags;

    chr = tokens[0];
    start = parseInt(tokens[1]);
    end = tokens.length > 2 ? parseInt(tokens[2]) : start + 1;
    feature = {chr: chr, start: start, end: end, score: 1000};

    if (tokens.length > 3) {
        // Note: these are very special rules for the gencode gene files.
        // tmp = tokens[3].replace(/"/g, '');
        // idName = tmp.split(';');
        // for (var i = 0; i < idName.length; i++) {
        //     var kv = idName[i].split('=');
        //     if (kv[0] == "gene_id") {
        //         id = kv[1];
        //     }
        //     if (kv[0] == "gene_name") {
        //         name = kv[1];
        //     }
        // }
        // feature.id = id ? id : tmp;
        // feature.name = name ? name : tmp;

        //parse gffTags in the name field
        if (tokens[3].indexOf(';') > 0) {
            const attributes = parseAttributeString(tokens[3], '=');
            for (let nmField of gffNameFields) {
                if (attributes.hasOwnProperty(nmField)) {
                    feature.name = attributes[nmField];
                    delete attributes[nmField];
                    break;
                }
            }
            feature.attributes = attributes;
        }
        if (!feature.name) {
            feature.name = tokens[3];
        } else {
            feature["nameField"] = tokens[3];
        }
    }

    if (tokens.length > 4) {
        feature.score = parseFloat(tokens[4]);
    }
    if (tokens.length > 5) {
        feature.strand = tokens[5];
    }
    if (tokens.length > 6) {
        feature.cdStart = parseInt(tokens[6]);
    }
    if (tokens.length > 7) {
        feature.cdEnd = parseInt(tokens[7]);
    }
    if (tokens.length > 8) {
        if (tokens[8] !== "." && tokens[8] !== "0")
            feature.color = IGVColor.createColorString(tokens[8]);
    }
    if (tokens.length > 11) {
        exonCount = parseInt(tokens[9]);
        exonSizes = tokens[10].split(',');
        exonStarts = tokens[11].split(',');
        exons = [];

        for (let i = 0; i < exonCount; i++) {
            eStart = start + parseInt(exonStarts[i]);
            eEnd = eStart + parseInt(exonSizes[i]);
            exons.push({start: eStart, end: eEnd});
        }

        findUTRs(exons, feature.cdStart, feature.cdEnd)

        feature.exons = exons;
    }

    // Optional extra columns
    if (this.header) {
        let thicknessColumn = this.header.thicknessColumn;
        let colorColumn = this.header.colorColumn;
        if (colorColumn && colorColumn < tokens.length) {
            feature.color = IGVColor.createColorString(tokens[colorColumn])
        }
        if (thicknessColumn && thicknessColumn < tokens.length) {
            feature.thickness = tokens[thicknessColumn];
        }
    }

    return feature;

}

/**
 * Decode a UCSC repeat masker record.
 *
 * Columns, from UCSC documentation
 *
 * 0  bin    585    smallint(5) unsigned    Indexing field to speed chromosome range queries.
 * 1  swScore    1504    int(10) unsigned    Smith Waterman alignment score
 * 2  milliDiv    13    int(10) unsigned    Base mismatches in parts per thousand
 * 3  milliDel    4    int(10) unsigned    Bases deleted in parts per thousand
 * 4  milliIns    13    int(10) unsigned    Bases inserted in parts per thousand
 * 5  genoName    chr1    varchar(255)    Genomic sequence name
 * 6  genoStart    10000    int(10) unsigned    Start in genomic sequence
 * 7  genoEnd    10468    int(10) unsigned    End in genomic sequence
 * 8  genoLeft    -249240153    int(11)    -#bases after match in genomic sequence
 * 9  strand    +    char(1)    Relative orientation + or -
 * 10 repName    (CCCTAA)n    varchar(255)    Name of repeat
 * 11 repClass    Simple_repeat    varchar(255)    Class of repeat
 * 12 repFamily    Simple_repeat    varchar(255)    Family of repeat
 * 13 repStart    1    int(11)    Start (if strand is +) or -#bases after match (if strand is -) in repeat sequence
 * 14 repEnd    463    int(11)    End in repeat sequence
 * 15 repLeft    0    int(11)    -#bases after match (if strand is +) or start (if strand is -) in repeat sequence
 * 16 id    1    char(1)    First digit of id field in RepeatMasker .out file. Best ignored.
 */
function decodeRepeatMasker(tokens, ignore) {

    if (tokens.length <= 15) return undefined;

    const feature = {
        swScore: Number.parseInt(tokens[1]),
        milliDiv: Number.parseInt(tokens[2]),
        milliDel: Number.parseInt(tokens[3]),
        milliIns: Number.parseInt(tokens[4]),
        chr: tokens[5],
        start: Number.parseInt(tokens[6]),
        end: Number.parseInt(tokens[7]),
        //genoLeft: tokens[8],
        strand: tokens[9],
        repName: tokens[10],
        repClass: tokens[11],
        repFamily: tokens[12],
        repStart: Number.parseInt(tokens[13]),
        repEnd: Number.parseInt(tokens[14]),
        repLeft: Number.parseInt(tokens[15])
    };

    return feature;

}

/**
 * Decode a UCSC "genePred" record.
 *
 * @param tokens
 * @param ignore
 * @returns {*}
 */
function decodeGenePred(tokens, ignore) {

    var shift = this.shift === undefined ? 0 : 1;

    if (tokens.length <= 9 + shift) return undefined;

    const cdStart = parseInt(tokens[5 + shift])
    const cdEnd = parseInt(tokens[6 + shift])
    var feature = {
            name: tokens[0 + shift],
            chr: tokens[1 + shift],
            strand: tokens[2 + shift],
            start: parseInt(tokens[3 + shift]),
            end: parseInt(tokens[4 + shift]),
            cdStart: cdStart,
            cdEnd: cdEnd,
            id: tokens[0 + shift]
        },
        exonCount = parseInt(tokens[7 + shift]),
        exonStarts = tokens[8 + shift].split(','),
        exonEnds = tokens[9 + shift].split(','),
        exons = [];

    for (let i = 0; i < exonCount; i++) {
        const start = parseInt(exonStarts[i])
        const end = parseInt(exonEnds[i])
        exons.push({start: start, end: end});
    }
    findUTRs(exons, cdStart, cdEnd)

    feature.exons = exons;

    return feature;

}

/**
 * Decode a UCSC "genePredExt" record.  refGene files are in this format.
 *
 * @param tokens
 * @param ignore
 * @returns {*}
 */
function decodeGenePredExt(tokens, ignore) {

    var shift = this.shift === undefined ? 0 : 1;

    if (tokens.length <= 11 + shift) return undefined;

    const cdStart = parseInt(tokens[5 + shift])
    const cdEnd = parseInt(tokens[6 + shift])
    const feature = {
            name: tokens[11 + shift],
            chr: tokens[1 + shift],
            strand: tokens[2 + shift],
            start: parseInt(tokens[3 + shift]),
            end: parseInt(tokens[4 + shift]),
            cdStart: cdStart,
            cdEnd: cdEnd,
            id: tokens[0 + shift]
        },
        exonCount = parseInt(tokens[7 + shift]),
        exonStarts = tokens[8 + shift].split(','),
        exonEnds = tokens[9 + shift].split(','),
        exons = [];

    for (let i = 0; i < exonCount; i++) {
        const start = parseInt(exonStarts[i])
        const end = parseInt(exonEnds[i])
        exons.push({start: start, end: end});
    }
    findUTRs(exons, cdStart, cdEnd)

    feature.exons = exons;

    return feature;
}

/**
 * Decode a UCSC "refFlat" record
 * @param tokens
 * @param ignore
 * @returns {*}
 */
function decodeReflat(tokens, ignore) {

    var shift = this.shift === undefined ? 0 : 1;

    if (tokens.length <= 10 + shift) return undefined;

    const cdStart = parseInt(tokens[6 + shift])
    const cdEnd = parseInt(tokens[7 + shift])
    var feature = {
            name: tokens[0 + shift],
            id: tokens[1 + shift],
            chr: tokens[2 + shift],
            strand: tokens[3 + shift],
            start: parseInt(tokens[4 + shift]),
            end: parseInt(tokens[5 + shift]),
            cdStart: cdStart,
            cdEnd: cdEnd
        },
        exonCount = parseInt(tokens[8 + shift]),
        exonStarts = tokens[9 + shift].split(','),
        exonEnds = tokens[10 + shift].split(','),
        exons = [];

    for (let i = 0; i < exonCount; i++) {
        const start = parseInt(exonStarts[i])
        const end = parseInt(exonEnds[i])
        exons.push({start: start, end: end});
    }
    findUTRs(exons, cdStart, cdEnd)

    feature.exons = exons;

    return feature;
}

function findUTRs(exons, cdStart, cdEnd) {

    for (let exon of exons) {
        const end = exon.end
        const start = exon.start
        if (end < cdStart || start > cdEnd) {
            exon.utr = true;
        } else {
            if (cdStart >= start && cdStart <= end) {
                exon.cdStart = cdStart
            }
            if (cdEnd >= start && cdEnd <= end) {
                exon.cdEnd = cdEnd
            }
        }
    }

}

function decodePeak(tokens, ignore) {

    var tokenCount, chr, start, end, strand, name, score, qValue, signal, pValue;

    tokenCount = tokens.length;
    if (tokenCount < 9) {
        return undefined;
    }

    chr = tokens[0];
    start = parseInt(tokens[1]);
    end = parseInt(tokens[2]);
    name = tokens[3];
    score = parseFloat(tokens[4]);
    strand = tokens[5].trim();
    signal = parseFloat(tokens[6]);
    pValue = parseFloat(tokens[7]);
    qValue = parseFloat(tokens[8]);

    if (score === 0) score = signal;

    return {
        chr: chr, start: start, end: end, name: name, score: score, strand: strand, signal: signal,
        pValue: pValue, qValue: qValue
    };
}

function decodeBedGraph(tokens, ignore) {

    var chr, start, end, value;

    if (tokens.length <= 3) return undefined;

    chr = tokens[0];
    start = parseInt(tokens[1]);
    end = parseInt(tokens[2]);
    value = parseFloat(tokens[3]);
    const feature = {chr: chr, start: start, end: end, value: value};

    // Optional extra columns
    if (this.header) {
        let colorColumn = this.header.colorColumn;
        if (colorColumn && colorColumn < tokens.length) {
            feature.color = IGVColor.createColorString(tokens[colorColumn])
        }
    }

    return feature;
}

function decodeWig(tokens, wig) {

    var ss,
        ee,
        value;

    if (wig.format === "fixedStep") {
        ss = (wig.index * wig.step) + wig.start;
        ee = ss + wig.span;
        value = parseFloat(tokens[0]);
        ++(wig.index);
        return isNaN(value) ? null : {chr: wig.chrom, start: ss, end: ee, value: value};
    } else if (wig.format === "variableStep") {

        if (tokens.length < 2) return null;
        ss = parseInt(tokens[0], 10) - 1;
        ee = ss + wig.span;
        value = parseFloat(tokens[1]);
        return isNaN(value) ? null : {chr: wig.chrom, start: ss, end: ee, value: value};

    } else {
        return decodeBedGraph(tokens);
    }
}

function decodeFusionJuncSpan(tokens, ignore) {

    /*
     Format:

     0       #scaffold
     1       fusion_break_name
     2       break_left
     3       break_right
     4       num_junction_reads
     5       num_spanning_frags
     6       spanning_frag_coords

     0       B3GNT1--NPSR1
     1       B3GNT1--NPSR1|2203-10182
     2       2203
     3       10182
     4       189
     5       1138
     6       1860-13757,1798-13819,1391-18127,1443-17174,...

     */


    if (tokens.length < 7) return undefined;

    var chr = tokens[0];
    var fusion_name = tokens[1];
    var junction_left = parseInt(tokens[2]);
    var junction_right = parseInt(tokens[3]);
    var num_junction_reads = parseInt(tokens[4]);
    var num_spanning_frags = parseInt(tokens[5]);

    var spanning_frag_coords_text = tokens[6];

    var feature = {
        chr: chr,
        name: fusion_name,
        junction_left: junction_left,
        junction_right: junction_right,
        num_junction_reads: num_junction_reads,
        num_spanning_frags: num_spanning_frags,
        spanning_frag_coords: [],

        start: -1,
        end: -1
    }; // set start and end later based on min/max of span coords

    var min_coord = junction_left;
    var max_coord = junction_right;

    if (num_spanning_frags > 0) {

        var coord_pairs = spanning_frag_coords_text.split(',');

        for (var i = 0; i < coord_pairs.length; i++) {
            var split_coords = coord_pairs[i].split('-');

            var span_left = split_coords[0];
            var span_right = split_coords[1];

            if (span_left < min_coord) {
                min_coord = span_left;
            }
            if (span_right > max_coord) {
                max_coord = span_right;
            }
            feature.spanning_frag_coords.push({left: span_left, right: span_right});

        }
    }

    feature.start = min_coord;
    feature.end = max_coord;


    return feature;

}


function decodeGtexGWAS(tokens, ignore) {
    //chrom	chromStart	chromEnd	Strongest SNP-risk allele	Disease/Phenotype	P-value	Odds ratio or beta	PUBMEDID
    //1	1247493	1247494	rs12103-A	Inflammatory bowel disease	8.00E-13	1.1	23128233

    const tokenCount = tokens.length;
    if (tokenCount < 7) {
        return null;
    }
    const feature = {
        chr: tokens[0],
        start: parseInt(tokens[1]) - 1,
        end: parseInt(tokens[2]),
        'Strongest SNP-risk allele': tokens[3],
        'Disease/Phenotype': tokens[4],
        'P-value': tokens[5],
        'Odds ratio or beta': tokens[6],
    }
    if (tokens.length > 6) {
        feature['PUBMEDID'] = `<a target = "blank" href = "https://www.ncbi.nlm.nih.gov/pubmed/${tokens[7]}">${tokens[7]}</a>`
    }
    return feature
}

function parseAttributeString(attributeString, keyValueDelim) {
    // parse 'attributes' string (see column 9 docs in https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md)
    var attributes = {};
    for (let kv of attributeString.split(';')) {
        const t = kv.trim().split(keyValueDelim, 2)
        if (t.length === 2) {
            const key = t[0].trim();
            let value = t[1].trim();
            //Strip off quotes, if any
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substr(1, value.length - 2);
            }
            attributes[key] = value;
        }
    }
    return attributes
}

/**
 * Decode a single gff record (1 line in file).  Aggregations such as gene models are constructed at a higher level.
 *      ctg123 . mRNA            1050  9000  .  +  .  ID=mRNA00001;Parent=gene00001
 * @param tokens
 * @param ignore
 * @returns {*}
 */
function decodeGFF(tokens, ignore) {

    var tokenCount, chr, start, end, strand, type, score, phase, attributeString, color, name,
        transcript_id, i,
        format = this.format;

    tokenCount = tokens.length;
    if (tokenCount < 9) {
        return null;      // Not a valid gff record
    }

    chr = tokens[0];
    type = tokens[2];
    start = parseInt(tokens[3]) - 1;
    end = parseInt(tokens[4]);
    score = "." === tokens[5] ? 0 : parseFloat(tokens[5]);
    strand = tokens[6];
    phase = "." === tokens[7] ? 0 : parseInt(tokens[7]);
    attributeString = tokens[8];

    // Find ID and Parent, or transcript_id
    var delim = ('gff3' === format) ? '=' : /\s+/;
    var attributes = parseAttributeString(attributeString, delim);
    for (let [key, value] of Object.entries(attributes)) {
        const keyLower = key.toLowerCase()
        if ("color" === keyLower || "colour" === keyLower) {
            color = IGVColor.createColorString(value);
        } else if ('gff3' === format)
            try {
                attributes[key] = unescape(value);
            } catch (e) {
                attributes[key] = value;   // Invalid
                console.error(`Malformed gff3 attibute value: ${value}`);
            }
    }

    // Find name (label) property
    if (this.nameField) {
        name = attributes[this.nameField];
    } else {
        for (i = 0; i < gffNameFields.length; i++) {
            if (attributes.hasOwnProperty(gffNameFields[i])) {
                this.nameField = gffNameFields[i];
                name = attributes[this.nameField];
                break;
            }
        }
    }

    const id = attributes["ID"] || attributes["transcript_id"]
    const parent = attributes["Parent"]

    return new GFFFeature({
        id: id,
        parent: parent,
        name: name,
        type: type,
        chr: chr,
        start: start,
        end: end,
        score: score,
        strand: strand,
        color: color,
        attributeString: attributeString,
        delim: delim
    })

}

function GFFFeature(props) {
    Object.assign(this, props)
}

GFFFeature.prototype.popupData = function (genomicLocation) {
    const kvs = this.attributeString.split(';')
    const pd = [];
    if(this.name) {
        pd.push({name: 'name:', value: this.name})
    }
    pd.push({name: 'type:', value: this.type})
    for (let kv of kvs) {
        const t = kv.trim().split(this.delim, 2);
        if (t.length === 2 && t[1] !== undefined) {
            const key = t[0].trim();
            if('name' === key.toLowerCase()) continue;
            let value = t[1].trim();
            //Strip off quotes, if any
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substr(1, value.length - 2);
            }
            pd.push({name: key + ":", value: value});
        }
    }
    pd.push({name: 'position:', value: `${this.chr}:${numberFormatter(this.start + 1)}-${numberFormatter(this.end)}`})
    return pd;
}

function decodeSNP(tokens, ignore) {

    if (tokens.length < 6) return undefined;

    const autoSql = [
        'bin',
        'chr',
        'start',
        'end',
        'name',
        'score',
        'strand',
        'refNCBI',
        'refUCSC',
        'observed',
        'molType',
        'class',
        'valid',
        'avHet',
        'avHetSE',
        'func',
        'locType',
        'weight',
        'exceptions',
        'submitterCount',
        'submitters',
        'alleleFreqCount',
        'alleles',
        'alleleNs',
        'alleleFreqs',
        'bitfields'
    ];


    const feature = {
        chr: tokens[1],
        start: Number.parseInt(tokens[2]),
        end: Number.parseInt(tokens[3]),
        name: tokens[4],
        score: Number.parseInt(tokens[5])
    };

    const n = Math.min(tokens.length, autoSql.length);
    for (let i = 6; i < n; i++) {
        feature[autoSql[i]] = tokens[i];
    }
    return feature;

}


/**
 * Decode a custom columnar format.  Required columns are 'chr' and 'start'
 *
 * @param tokens
 * @param ignore
 * @returns decoded feature, or null if this is not a valid record
 */
function decodeCustom(tokens, ignore) {

    if (tokens.length < this.format.fields.length) return undefined;

    const format = this.format;         // "this" refers to FeatureParser instance
    const coords = format.coords || 0;

    const chr = tokens[format.chr];
    const start = parseInt(tokens[format.start]) - coords;
    const end = format.end !== undefined ? parseInt(tokens[format.end]) : start + 1;

    const feature = {chr: chr, start: start, end: end};

    if (format.fields) {
        format.fields.forEach(function (field, index) {

            if (index !== format.chr &&
                index !== format.start &&
                index !== format.end) {

                feature[field] = tokens[index];
            }
        });
    }

    return feature;

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

/**
 * Hack for bedPE formats, where "score" can be in column 7 (name) or 8 (score)
 * @param features
 */
function setBedPEValue(features) {

    if(features.length == 0) return;

    // Assume all features have same properties
    const firstFeature = features[0];
    if(firstFeature.score !== undefined) {
        for(let f of features) {
            f.value = f.score === '.' ? Number.NaN : parseFloat(f.score);
        }
    } else if(firstFeature.name !== undefined) {
        // Name field (col 7) is sometimes used for score.
        for(let f of features) {
            if(!isNumber(f.name)) return;
        }
        for(let f of features) {
            f.value = parseFloat(f.name);
            delete f.name;
        }
    }
}

export default FeatureParser;
