import GenomicInterval from "./genomicInterval.js"

class SequenceInterval extends GenomicInterval {

    constructor(chr, start, end, features) {
        super(chr, start, end, features)
    }

    getSequence(start, end) {
        if (start < this.start || end > this.end) {
            throw Error("Range out of bounds")
        }
        const offset = start - this.start
        const n = end - start
        const seq = this.features ? this.features.substring(offset, offset + n) : null
        return seq
    }

}

export default SequenceInterval