import {IGVColor} from "../../../node_modules/igv-utils/src/index.js"

/**
 * Decode UCSC "interact" files.  See https://genome.ucsc.edu/goldenpath/help/interact.html
 *
 0  string chrom;        "Chromosome (or contig, scaffold, etc.). For interchromosomal, use 2 records"
 1  uint chromStart;     "Start position of lower region. For interchromosomal, set to chromStart of this region"
 2  uint chromEnd;       "End position of upper region. For interchromosomal, set to chromEnd of this region"
 3  string name;         "Name of item, for display.  Usually 'sourceName/targetName/exp' or empty"
 4  uint score;          "Score (0-1000)"
 5  double value;        "Strength of interaction or other data value. Typically basis for score"
 6  string exp;          "Experiment name (metadata for filtering). Use . if not applicable"
 7  string color;        "Item color.  Specified as r,g,b or hexadecimal #RRGGBB or html color name, as in //www.w3.org/TR/css3-color/#html4. Use 0 and spectrum setting to shade by score"
 8  string sourceChrom;  "Chromosome of source region (directional) or lower region. For non-directional interchromosomal, chrom of this region."
 9  uint sourceStart;    "Start position in chromosome of source/lower/this region"
 10 uint sourceEnd;      "End position in chromosome of source/lower/this region"
 11 string sourceName;   "Identifier of source/lower/this region"
 12 string sourceStrand; "Orientation of source/lower/this region: + or -.  Use . if not applicable"
 13 string targetChrom;  "Chromosome of target region (directional) or upper region. For non-directional interchromosomal, chrom of other region"
 14 uint targetStart;    "Start position in chromosome of target/upper/this region"
 15 uint targetEnd;      "End position in chromosome of target/upper/this region"
 16 string targetName;   "Identifier of target/upper/this region"
 17 string targetStrand; "Orientation of target/upper/this region: + or -.  Use . if not applicable"
 *
 * @param tokens
 * @param ignore
 * @returns {*}
 */
function decodeInteract(tokens, header) {

    if (tokens.length < 6) {
        console.log("Skipping line: " + tokens.join(' '))
        return undefined
    }

    var feature = {
        chr: tokens[0],
        start: Number.parseInt(tokens[1]),
        end: Number.parseInt(tokens[2]),

        chr1: tokens[8],
        start1: Number.parseInt(tokens[9]),
        end1: Number.parseInt(tokens[10]),

        chr2: tokens[13],
        start2: Number.parseInt(tokens[14]),
        end2: Number.parseInt(tokens[15]),

        name: tokens[3],
        score: Number(tokens[4]),
        value: Number(tokens[5]),
        color: tokens[7] === '.' ? undefined : tokens[7] === "0" ? "rgb(0,0,0)" : tokens[7],

    }

    return feature
}

/**
 * Special decoder for Hic Domain files.   In these files feature1 == feature2, they are really bed records.
 * @param tokens
 * @param ignore
 * @returns {*}
 */
function decodeBedpeDomain(tokens, ignore) {

    if (tokens.length < 8) return undefined

    return {
        chr: tokens[0],
        start: Number.parseInt(tokens[1]),
        end: Number.parseInt(tokens[2]),
        color: IGVColor.createColorString(tokens[6]),
        score: Number(tokens[7])
    }
}


export {decodeInteract}