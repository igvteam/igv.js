//table chromatinInteract
// "Chromatin interaction between two regions"
//     (
//     string chrom;      "Chromosome (or contig, scaffold, etc.). For interchromosomal, use 2 records"
//     uint chromStart;   "Start position of lower region. For interchromosomal, set to chromStart of this region"
//     uint chromEnd;     "End position of upper region. For interchromosomal, set to chromEnd of this region"
//     string name;       "Name of item, for display"
//     uint score;        "Score from 0-1000"
//     double value;      "Strength of interaction or other data value. Typically basis for score"
//     string exp;        "Experiment name (metadata for filtering). Use . if not applicable"
//     string color;      "Item color.  Specified as r,g,b or hexadecimal #RRGGBB or html color name, as in //www.w3.org/TR/css3-color/#html4."
//     string region1Chrom;  "Chromosome of lower region. For non-directional interchromosomal, chrom of this region."
//     uint region1Start;  "Start position of lower/this region"
//     uint region1End;    "End position in chromosome of lower/this region"
//     string region1Name;  "Identifier of lower/this region"
//     string region1Strand; "Orientation of lower/this region: + or -.  Use . if not applicable"
//     string region2Chrom; "Chromosome of upper region. For non-directional interchromosomal, chrom of other region"
//     uint region2Start;  "Start position in chromosome of upper/this region"
//     uint region2End;    "End position in chromosome of upper/this region"
//     string region2Name; "Identifier of upper/this region"
//     string region2Strand; "Orientation of upper/this region: + or -.  Use . if not applicable"
//     )
import {IGVColor} from "../../node_modules/igv-utils/src/index.js"

function getDecoder(definedFieldCount, fieldCount, autoSql, format) {

    if ("biginteract" === format || (autoSql && 'chromatinInteract' === autoSql.table)) {
        return decodeInteract
    } else if ("biggenepred" === format) {
        return decodeBigGenePred
    } else {
        const standardFieldCount = definedFieldCount - 3
        return function (feature, tokens) {

            decodeStandardFields(feature, tokens)

            if (autoSql) {
                const extraStart = definedFieldCount
                for (let i = extraStart; i < fieldCount; i++) {
                    if (i < autoSql.fields.length) {
                        const name = autoSql.fields[i].name
                        const value = tokens[i - 3]
                        feature[name] = value
                    }
                }
            }
        }
    }
}

function decodeStandardFields(feature, tokens) {

    if (tokens.length > 0) {
        feature.name = tokens[0]
    }
    if (tokens.length > 1) {
        feature.score = Number(tokens[1])
    }
    if (tokens.length > 2) {
        feature.strand = tokens[2]
    }
    if (tokens.length > 3) {
        feature.cdStart = parseInt(tokens[3])
    }
    if (tokens.length > 4) {
        feature.cdEnd = parseInt(tokens[4])
    }
    if (tokens.length > 5) {
        if (tokens[5] !== "." && tokens[5] !== "0" && tokens[5] !== "-1") {
            const c = IGVColor.createColorString(tokens[5])
            feature.color = c.startsWith("rgb") ? c : undefined
        }
    }
    if (tokens.length > 8) {
        const exonCount = parseInt(tokens[6])
        const exonSizes = tokens[7].split(',')
        const exonStarts = tokens[8].split(',')
        const exons = []
        for (let i = 0; i < exonCount; i++) {
            const eStart = feature.start + parseInt(exonStarts[i])
            const eEnd = eStart + parseInt(exonSizes[i])
            exons.push({start: eStart, end: eEnd})
        }
        findUTRs(exons, feature.cdStart, feature.cdEnd)
        feature.exons = exons
    }
}

function decodeInteract(feature, tokens) {

    feature.chr1 = tokens[5]
    feature.start1 = Number.parseInt(tokens[6])
    feature.end1 = Number.parseInt(tokens[7])

    feature.chr2 = tokens[10]
    feature.start2 = Number.parseInt(tokens[11])
    feature.end2 = Number.parseInt(tokens[12])

    feature.name = tokens[0]
    feature.score = Number(tokens[1])
    feature.value = Number(tokens[2])
    feature.color = tokens[4] === '.' ? undefined : tokens[4] === "0" ? "rgb(0,0,0)" : tokens[4]

    return feature
}


/**
 string chrom;        "Reference sequence chromosome or scaffold"
 uint   chromStart;    "Start position in chromosome"
 uint   chromEnd;        "End position in chromosome"
 ------------
 0 string name;            "Name or ID of item, ideally both human-readable and unique"
 1 uint score;            "Score (0-1000)"
 2 char[1] strand;        "+ or - for strand"
 3 uint thickStart;        "Start of where display should be thick (start codon)"
 4 uint thickEnd;        "End of where display should be thick (stop codon)"
 5 uint reserved;        "RGB value (use R,G,B string in input file)"
 6 int blockCount;        "Number of blocks"
 7 int[blockCount] blockSizes; "Comma separated list of block sizes"
 8 int[blockCount] chromStarts;"Start positions relative to chromStart"
 9 string name2;        "Alternative/human readable name"
 10 string cdsStartStat;    "Status of CDS start annotation (none, unknown, incomplete, or complete)"
 11 string cdsEndStat;    "Status of CDS end annotation (none, unknown, incomplete, or complete)"
 12 int[blockCount] exonFrames; "Exon frame {0,1,2}, or -1 if no frame for exon"
 13 string type;            "Transcript type"
 14 string geneName;        "Primary identifier for gene"
 15 string geneName2;    "Alternative/human-readable gene name"
 16 string geneType;        "Gene type"
 * @param feature
 * @param tokens
 * @returns {*}
 */

function decodeBigGenePred(feature, tokens) {

    decodeStandardFields(feature, tokens)

    // frame shifts

}


// TODO -- copied from "ucsc.js", move to common file
function findUTRs(exons, cdStart, cdEnd) {

    for (let exon of exons) {
        const end = exon.end
        const start = exon.start
        if (end < cdStart || start > cdEnd) {
            exon.utr = true
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

export default getDecoder
