import {IGVColor} from "../../../node_modules/igv-utils/src/index.js";
import {gffNameFields, parseAttributeString} from "./gff.js";
import DecodeError from "./decodeError.js";


/**
 * Decode the UCSC bed format.  Only the first 3 columns (chr, start, end) are required.   The remaining columns
 * must follow standard bed order, but we will tolerate deviations after column 3.
 *
 * @param tokens
 * @param ignore
 * @returns decoded feature, or null if this is not a valid record
 */
function decodeBed(tokens, header) {


    if (tokens.length < 3) return undefined;

    const gffTags = header && header.gffTags;

    const chr = tokens[0];
    const start = parseInt(tokens[1]);
    const end = tokens.length > 2 ? parseInt(tokens[2]) : start + 1;
    if (isNaN(start) || isNaN(end)) {
        return new DecodeError(`Unparsable bed record.`);
    }
    const feature = {chr: chr, start: start, end: end, score: 1000};

    try {
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
            if (tokens[3].indexOf(';') > 0 && tokens[3].indexOf('=') > 0) {
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
                feature.name = tokens[3] === '.' ? '' : tokens[3];
            }
        }

        if (tokens.length > 4) {
            feature.score = tokens[4] === '.' ? 0 : parseFloat(tokens[4]);
            if (isNaN(feature.score)) {
                return feature;
            }
        }

        if (tokens.length > 5) {
            feature.strand = tokens[5];
            if (!(feature.strand === '.' || feature.strand === '+' || feature.strand === '-')) {
                return feature;
            }
        }

        if (tokens.length > 6) {
            feature.cdStart = parseInt(tokens[6]);
            if (isNaN(feature.cdStart)) {
                return feature;
            }
        }

        if (tokens.length > 7) {
            feature.cdEnd = parseInt(tokens[7]);
            if (isNaN(feature.cdEnd)) {
                return feature;
            }
        }

        if (tokens.length > 8) {
            if (tokens[8] !== "." && tokens[8] !== "0")
                feature.color = IGVColor.createColorString(tokens[8]);
        }

        if (tokens.length > 11) {
            const exonCount = parseInt(tokens[9]);
            // Some basic validation
            if (exonCount > 1000) {
                // unlikely
                return feature;
            }

            const exonSizes = tokens[10].replace(/,$/, '').split(',');
            const exonStarts = tokens[11].replace(/,$/, '').split(',');
            if (!(exonSizes.length === exonStarts.length && exonCount === exonSizes.length)) {
                return feature;
            }

            const exons = [];
            for (let i = 0; i < exonCount; i++) {
                const eStart = start + parseInt(exonStarts[i]);
                const eEnd = eStart + parseInt(exonSizes[i]);
                exons.push({start: eStart, end: eEnd});
            }
            findUTRs(exons, feature.cdStart, feature.cdEnd)
            feature.exons = exons;
        }

        // Optional extra columns
        if (header) {
            let thicknessColumn = header.thicknessColumn;
            let colorColumn = header.colorColumn;
            if (colorColumn && colorColumn < tokens.length) {
                feature.color = IGVColor.createColorString(tokens[colorColumn])
            }
            if (thicknessColumn && thicknessColumn < tokens.length) {
                feature.thickness = tokens[thicknessColumn];
            }
        }
    } catch
        (e) {

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
function decodeRepeatMasker(tokens, header) {

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
function decodeGenePred(tokens, header) {

    var shift = header.shift === undefined ? 0 : 1;

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
function decodeGenePredExt(tokens, header) {

    var shift = header.shift === undefined ? 0 : 1;

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
function decodeReflat(tokens, header) {

    var shift = header.shift === undefined ? 0 : 1;

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

function decodePeak(tokens, header) {

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

function decodeBedGraph(tokens, header) {

    var chr, start, end, value;

    if (tokens.length <= 3) return undefined;

    chr = tokens[0];
    start = parseInt(tokens[1]);
    end = parseInt(tokens[2]);
    value = parseFloat(tokens[3]);
    const feature = {chr: chr, start: start, end: end, value: value};

    // Optional extra columns
    if (header) {
        let colorColumn = header.colorColumn;
        if (colorColumn && colorColumn < tokens.length) {
            feature.color = IGVColor.createColorString(tokens[colorColumn])
        }
    }

    return feature;
}

function decodeWig(tokens, header) {

    const wig = header.wig;

    if (wig && wig.format === "fixedStep") {
        const ss = (wig.index * wig.step) + wig.start;
        const ee = ss + wig.span;
        const value = parseFloat(tokens[0]);
        ++(wig.index);
        return isNaN(value) ? null : {chr: wig.chrom, start: ss, end: ee, value: value};
    } else if (wig && wig.format === "variableStep") {

        if (tokens.length < 2) return null;
        const ss = parseInt(tokens[0], 10) - 1;
        const ee = ss + wig.span;
        const value = parseFloat(tokens[1]);
        return isNaN(value) ? null : {chr: wig.chrom, start: ss, end: ee, value: value};

    } else {
        return decodeBedGraph(tokens);
    }
}

function decodeSNP(tokens, header) {

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


export {
    decodeBed, decodeBedGraph, decodeGenePred, decodeGenePredExt, decodePeak, decodeReflat, decodeRepeatMasker,
    decodeSNP, decodeWig
}

