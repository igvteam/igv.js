/**
 * Object for chromosome meta-data
 */


class Chromosome {
    constructor(name, order, bpLength, altNames) {
        this.name = name
        this.order = order
        this.bpLength = bpLength
        this.altNames = altNames
    }

    getAltName(key) {
        return this.altNames && this.altNames.has(key) ? this.altNames.get(key) : this.name
    }
}

export default Chromosome