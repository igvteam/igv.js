import {numberFormatter} from "../../node_modules/igv-utils/src/stringUtils.js"

class SupplementaryAlignment {

    constructor(rec) {
        const tokens = rec.split(',')
        this.chr = tokens[0]
        this.start = parseInt(tokens[1])
        this.strand = tokens[2].charAt(0)
        this.mapQ = parseInt(tokens[4])
        this.numMismatches = parseInt(tokens[5])
        this.lenOnRef = computeLengthOnReference(tokens[3])
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


function computeLengthOnReference(cigarString) {

    let len = 0
    let buf = ''

    for (let i = 0; i < cigarString.length; i++) {
        const c = cigarString.charCodeAt(i)
        if (c > 47 && c < 58) {
            buf += cigarString.charAt(i)
        } else {
            switch (c) {
                case 78:  // N
                case 68:  // D
                case 77:  // M
                case 61:  // =
                case 88:  // X
                    len += parseInt(buf.toString())
            }
            buf = ''
        }
    }
    return len
}


export {createSupplementaryAlignments, computeLengthOnReference}