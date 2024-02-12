/**
 * Wrapper for a sequence loader that provides caching
 */

import GenomicInterval from "./genomicInterval.js"

class CachedSequence {

    #currentQuery
    #cachedIntervals = []
    #maxIntervals = 10   // TODO - this should be >= the number of viewports for multi-locus view

    constructor(sequenceReader, browser) {
        this.sequenceReader = sequenceReader
        this.browser = browser
    }

    get hasChromosomes() {
        return this.sequenceReader.hasChromosomes
    }

    get chromosomes() {
        return this.sequenceReader.chromosomes
    }

    async getSequenceRecord(chr) {
        return this.sequenceReader.getSequenceRecord(chr)
    }

    async getSequence(chr, start, end) {

        let interval = this.#cachedIntervals.find(i => i.contains(chr, start, end))
        if (!interval) {

            interval = await this.#queryForSequence(chr, start, end)
        }

        return this.getSequenceSync(chr, start, end)
    }

    getSequenceSync(chr, start, end) {

        let interval = this.#cachedIntervals.find(i => i.contains(chr, start, end))
        if (interval) {
            const offset = start - interval.start
            const n = end - start
            const seq = interval.features ? interval.features.substring(offset, offset + n) : null
            return seq
        } else {
            return undefined
        }
    }

    async #queryForSequence(chr, start, end) {
        // Expand query, to minimum of 50kb
        let qstart = start
        let qend = end
        if ((end - start) < 50000) {
            const w = (end - start)
            const center = Math.round(start + w / 2)
            qstart = Math.max(0, center - 25000)
            qend = center + 25000
        }
        const interval = new GenomicInterval(chr, qstart, qend)

        if (this.#currentQuery && this.#currentQuery[0].contains(chr, start, end)) {
            return this.#currentQuery[1]
        } else {
            const queryPromise = new Promise(async (resolve, reject) => {
                interval.features = await this.sequenceReader.readSequence(chr, qstart, qend)

                // Filter out redundant (subsumed) cached intervals
                this.#cachedIntervals = this.#cachedIntervals.filter(i => !interval.contains(i))
                if (this.#cachedIntervals.length === this.#maxIntervals) {
                    this.#cachedIntervals.shift()
                }

                // Filter out out-of-view cached intervals.  Don't try this if there are too many frames, inefficient
                if (this.browser && this.browser.referenceFrameList.length < 10) {
                    this.#cachedIntervals = this.#cachedIntervals.filter(i => {
                        const b = this.browser.referenceFrameList.find(frame => frame.overlaps(i))
                        if (!b) {
                            console.log("Removing interval " + i.locusString)
                        }
                        return b
                    })
                }

                this.#cachedIntervals.push(interval)

                resolve(interval)
            })
            this.#currentQuery = [interval, queryPromise]
            return queryPromise
        }
    }


    async init() {
        return this.sequenceReader.init()
    }

    get chromosomeNames() {
        return this.sequenceReader.chromosomeNames
    }

    getFirstChromosomeName() {
        return typeof this.sequenceReader.getFirstChromosomeName === 'function' ? this.sequenceReader.getFirstChromosomeName() : undefined
    }

    #isIntervalInView(interval) {
        this.browser.referenceFrameList
    }
}

export default CachedSequence


