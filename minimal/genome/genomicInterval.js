class GenomicInterval {

    constructor(chr, start, end, features) {
        this.chr = chr
        this.start = start
        this.end = end
        this.features = features
    }

    contains(chr, start, end) {
        return this.chr === chr &&
            this.start <= start &&
            this.end >= end
    }

    containsRange(range) {
        return this.chr === range.chr &&
            this.start <= range.start &&
            this.end >= range.end
    }

    get locusString() {
        return `${this.chr}:${this.start + 1}-${this.end}`
    }
}

export default GenomicInterval