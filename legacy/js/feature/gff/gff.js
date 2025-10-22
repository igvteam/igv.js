import {IGVColor} from "../../../node_modules/igv-utils/src/index.js"
import {GFFFeature} from "./gffFeature.js"
import {decodeGFFAttribute, parseAttributeString} from "./parseAttributeString.js"

function decode(tokens, header) {

    const format = header.format
    if (tokens.length < 9) {
        return undefined      // Not a valid gff record
    }

    const delim = ('gff3' === format) ? '=' : ' '
    return new GFFFeature({
        source: decodeGFFAttribute(tokens[1]),
        type: tokens[2],
        chr: tokens[0],
        start: parseInt(tokens[3]) - 1,
        end: parseInt(tokens[4]),
        score: "." === tokens[5] ? undefined : Number(tokens[5]),
        strand: tokens[6],
        phase: "." === tokens[7] ? "." : parseInt(tokens[7]),
        attributeString: tokens[8],
        delim: delim
    })
}


/**
 * Decode a single gff record (1 line in file).  Aggregations such as gene models are constructed at a higher level.
 *      ctg123 . mRNA            1050  9000  .  +  .  ID=mRNA00001;Parent=gene00001
 * @param tokens
 * @param ignore
 * @returns {*}
 */
function decodeGFF3(tokens, header) {

    const feature = decode(tokens, header)

    if (!feature) {
        return
    }

    const attributes =  parseAttributeString(feature.attributeString, feature.delim)

    // Search for color value as case insenstivie key
    for (let [key, value] of attributes) {
        const keyLower = key.toLowerCase()
        if ("color" === keyLower || "colour" === keyLower) {
            feature.color = IGVColor.createColorString(value)
        } else if (key === "ID") {
            feature.id = value
        } else if (key === "Parent") {
            feature.parent = value
        }
    }
    return feature
}

/**
 * GTF format example:
 NC_000008.11    BestRefSeq    gene    127735434    127742951    .    +    .    gene_id "MYC"; transcript_id ""; db_xref "GeneID:4609"; db_xref "HGNC:HGNC:7553"; db_xref "MIM:190080"; description "MYC proto-oncogene, bHLH transcription factor"; gbkey "Gene"; gene "MYC"; gene_biotype "protein_coding"; gene_synonym "bHLHe39"; gene_synonym "c-Myc"; gene_synonym "MRTL"; gene_synonym "MYCC";
 NC_000008.11    BestRefSeq    transcript    127735434    127742951    .    +    .    gene_id "MYC"; transcript_id "NM_001354870.1"; db_xref "GeneID:4609"; gbkey "mRNA"; gene "MYC"; product "MYC proto-oncogene, bHLH transcription factor, transcript variant 2"; transcript_biotype "mRNA";
 NC_000008.11    BestRefSeq    exon    127735434    127736623    .    +    .    gene_id "MYC"; transcript_id "NM_001354870.1"; db_xref "GeneID:4609"; gene "MYC"; product "MYC proto-oncogene, bHLH transcription factor, transcript variant 2"; transcript_biotype "mRNA"; exon_number "1";
 *
 * @param tokens
 * @param ignore
 * @returns {*}
 */
function decodeGTF(tokens, header) {

    const feature = decode(tokens, header)

    if (!feature) {
        return
    }

    const attributes = parseAttributeString(feature.attributeString, feature.delim)

    // GTF files specify neither ID nor parent fields, but they can be inferred from common conventions
    let idField
    let parentField
    switch (feature.type) {
        case "gene":
            idField = "gene_id"
            break
        case "transcript":
            idField = "transcript_id"
            parentField = "gene_id"
            break
        default:
            parentField = "transcript_id"
    }

    for (let [key, value] of attributes) {
        const keyLower = key.toLowerCase()
        if ("color" === keyLower || "colour" === keyLower) {
            feature.color = IGVColor.createColorString(value)
        } else if (key === idField) {
            feature.id = value
        } else if (key === parentField) {
            feature.parent = value
        }
    }
    return feature

}



export {decodeGFF3, decodeGTF}



