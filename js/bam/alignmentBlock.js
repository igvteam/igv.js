/**
 * Created by jrobinso on 4/5/18.
 */

/**
 * Expected properties
 *   start: genomic position
 *   seqOffset: index offset to read sequence for this block's sequence
 *   len: length of block
 *   type: from CIGAR string (S, I, M, ...)
 */

class AlignmentBlock {
    constructor(b) {
        if (b) {
            Object.assign(this, b)
        }
    }

    seqIndexAt(genomicLocation) {
        return Math.floor(genomicLocation) - this.start + this.seqOffset
    }
}

export default AlignmentBlock
