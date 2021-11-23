import {numberFormatter} from "../../node_modules/igv-utils/src/stringUtils.js"
import BamUtils from "./bamUtils.js"

class SupplementaryAlignment {

    constructor(rec) {
        const tokens = rec.split(',')
        this.chr = tokens[0]
        this.start = parseInt(tokens[1])
        this.strand = tokens[2].charAt(0)
        this.mapQ = parseInt(tokens[4])
        this.numMismatches = parseInt(tokens[5])
        this.lenOnRef = BamUtils.computeLengthOnReference(tokens[3])
    }

    printString() {
        return this.chr + ":" + numberFormatter(this.start) + "-" + numberFormatter(this.start + this.lenOnRef)
            + " (" + this.strand + ") = " + numberFormatter(this.lenOnRef) + "bp @MAPQ: " + this.mapQ + " NM: " + this.numMismatches
    }
}

function createSupplementaryAlignments(str) {
    const tokens = str.split(';')
    return tokens.filter(t => t.length > 0).map(str => new SupplementaryAlignment(str))
}


export {createSupplementaryAlignments}