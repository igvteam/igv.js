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
function decodeLongrange(tokens, header) {

    if (tokens.length < 6) {
        console.log("Skipping line: " + tokens.join(' '))
        return undefined
    }

    const feature = {
        chr1: tokens[0],
        start1: Number.parseInt(tokens[1]),
        end1: Number.parseInt(tokens[2])
    }

    const col4parts = tokens[3].split(',')
    const locusParts = col4parts[0].split(':')
    feature.chr2 = locusParts[0]
    const positionParts = locusParts[1].split('-')
    feature.start2 = Number.parseInt(positionParts[0])
    feature.end2 = Number.parseInt(positionParts[1])

    if (locusParts.length > 1) {
        feature.score = Number.parseFloat(locusParts[1])
    }


    feature.chr = feature.chr1
    if(feature.chr1 === feature.chr2) {
        feature.start = Math.min(feature.start1, feature.start2)
        feature.end = Math.max(feature.end1, feature.end2)
    } else {
        feature.start = feature.start1
        feature.end = feature.end1
    }

    if (tokens.length > 4) {
        feature.name = tokens[4]
    }
    if (tokens.length > 5) {
        feature.color = tokens[5]
    }

    return feature
}


export {decodeLongrange}