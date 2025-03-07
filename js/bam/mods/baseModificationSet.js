import {complementBase} from "../../util/sequenceUtils.js"
import BaseModificationKey from "./baseModificationKey.js"
import {byteToUnsignedInt} from "./baseModificationUtils.js"

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
        this.key = BaseModificationKey.getKey(base, strand, modification)
    }

    containsPosition(pos) {
        return this.likelihoods.has(pos)
    }

    is5mC() {
        return this.modification.equals("m") && ((this.base === 'C' && this.strand === '+') || (this.base === 'G' && this.strand === '-'))
    }

    fullName() {
        return codeValues.get(this.modification) || this.modification
    }
}

const codeValues = new Map()
codeValues.set("m", "5mC")
codeValues.set("h", "5hmC")
codeValues.set("f", "5fC")
codeValues.set("c", "5caC")
codeValues.set("g", "5hmU")
codeValues.set("e", "5fU")
codeValues.set("b", "5caU")
codeValues.set("a", "6mA")
codeValues.set("o", "8xoG")
codeValues.set("n", "Xao")
codeValues.set("C", "Unknown C")
codeValues.set("T", "Unknown T")
codeValues.set("A", "Unknown A")
codeValues.set("G", "Unknown G")
codeValues.set("N", "Unknown")


export default BaseModificationSet
