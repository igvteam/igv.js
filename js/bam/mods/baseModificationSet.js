import {complementBase} from "../../util/sequenceUtils.js"

class BaseModificationSet {

    /**
     *
     * @param base
     * @param strand
     * @param modification
     * @param likelihoods  - map of position to likelihood
     */
    constructor(base, strand, modification, likelihoods) {
        this.base = base
        this.modification = modification
        this.strand = strand
        this.likelihoods = likelihoods
        this.canonicalBase = this.strand == '+' ? this.base : complementBase(this.base)
    }

    containsPosition(pos) {
        return this.likelihoods.has(pos)
    }

    is5mC() {
        return this.modification.equals("m") && ((this.base === 'C' && this.strand === '+') || (this.base === 'G' && this.strand === '-'))
    }
}

export default BaseModificationSet
