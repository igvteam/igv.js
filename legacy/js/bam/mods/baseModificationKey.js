import {complementBase} from "../../util/sequenceUtils.js"

class BaseModificationKey {

    static instances = new Map()

    static getKey(base, strand, modification) {

        const s = "" + base + strand + modification
        if (!BaseModificationKey.instances.has(s)) {
            BaseModificationKey.instances.set(s, new BaseModificationKey(base, strand, modification))
        }
        return BaseModificationKey.instances.get(s)
    }

    // char base;
    // char strand;
    // String modification;
    constructor(base, strand, modification) {
        this.base = base
        this.strand = strand
        this.modification = modification
        this.canonicalBase = this.strand === '+' ? this.base : complementBase(this.base)
    }

    getCanonicalBase() {
        return
    }


    toString() {
        return "" + this.base + this.strand + this.modification
    }

    static compare(a, b) {
        const mod1 = a.modification
        const mod2 = b.modification

        if (mod1 === mod2) {
            return a.strand.charAt(0) - b.strand.charAt(0)
        }

        if (modificationRankOrder.has(mod1) & modificationRankOrder.has(mod2)) {
            return modificationRankOrder.get(mod1) - modificationRankOrder.get(mod2)
        } else if (modificationRankOrder.has(mod1)) {
            return 1
        } else if (modificationRankOrder.has(mod2)) {
            return -1
        } else {
            return mod1 > mod2 ? 1 : -1
        }
    }
}

const modificationRankOrder = new Map(
    ["NONE_C", "NONE_T", "NONE_G", "NONE_A", "m", "h", "f", "c", "C", "g", "e", "b", "T", "U", "a", "A", "o", "G", "n", "N"].map((elem, idx) => [elem, idx])
)

export default BaseModificationKey
