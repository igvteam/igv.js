/**
 * Wrapper for a sequence loader that provides caching
 */

import GenomicInterval from "./genomicInterval.js"

class CachedSequence {

    constructor(sequenceReader) {
        this.sequenceReader = sequenceReader
    }

    async getSequence(chr, start, end) {

        const hasCachedSquence = this.interval && this.interval.contains(chr, start, end)

        if (!hasCachedSquence) {

            // Expand query, to minimum of 50kb
            let qstart = start
            let qend = end
            if ((end - start) < 50000) {
                const w = (end - start)
                const center = Math.round(start + w / 2)
                qstart = Math.max(0, center - 25000)
                qend = center + 25000
            }

            const seqBytes = await this.sequenceReader.readSequence(chr, qstart, qend)
            this.interval = new GenomicInterval(chr, qstart, qend, seqBytes)
        }

        const offset = start - this.interval.start
        const n = end - start
        const seq = this.interval.features ? this.interval.features.substr(offset, n) : null
        return seq
    }

    async init() {
        return this.sequenceReader.init()
    }

    get chromosomes() {
        return this.sequenceReader.chromosomes
    }

    get chromosomeNames() {
        return this.sequenceReader.chromosomeNames
    }

}

export default CachedSequence


