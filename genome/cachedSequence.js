/**
 * Wrapper for a sequence loader that provides caching
 */

import SequenceInterval from "./sequenceInterval.js"

class CachedSequence {

    static #minQuerySize = 1e5
    #currentQuery
    #cachedIntervals = []
    #maxIntervals = 10   // TODO - this should be >= the number of viewports for multi-locus view

    constructor(sequenceReader, browser) {
        this.sequenceReader = sequenceReader
        this.browser = browser
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
            interval =  await this.#queryForSequence(chr, start, end)
            this.#trimCache(interval)
            this.#cachedIntervals.push(interval)
        }

        if (interval) {
            const offset = start - interval.start
            const n = end - start
            const seq = interval.features ? interval.features.substring(offset, offset + n) : null
            return seq
        } else {
            return undefined
        }
    }

    #trimCache(interval) {
        // Filter out redundant (subsumed) cached intervals
        this.#cachedIntervals = this.#cachedIntervals.filter(i => !interval.contains(i))
        if (this.#cachedIntervals.length === this.#maxIntervals) {
            this.#cachedIntervals.shift()
        }

        // Filter out out-of-view cached intervals.  Don't try this if there are too many frames, inefficient
        if (this.browser && this.browser.referenceFrameList.length < 100) {
            this.#cachedIntervals = this.#cachedIntervals.filter(i => {
                const b = undefined !== this.browser.referenceFrameList.find(frame => frame.overlaps(i))
                if(!b) {
                   // console.log("Filtering " + i.locusString)
                }
                return b;
            })
        }
    }

    /**
     * Return the first cached interval containing the specified region, or undefined if no interval is found.
     *
     * @param chr
     * @param start
     * @param end
     * @returns a SequenceInterval or undefined
     */
    getSequenceInterval(chr, start, end) {
        return this.#cachedIntervals.find(i => i.contains(chr, start, end))
    }

    /**
     * Query for a sequence.  Returns a promise that is resolved when the asynchronous call to read sequence returns.
     *
     * @param chr
     * @param start
     * @param end
     * @returns {Promise<sequence>}
     */
    async #queryForSequence(chr, start, end) {
        // Expand query, to minimum of 100kb
        let qstart = start
        let qend = end
        if ((end - start) < CachedSequence.#minQuerySize) {
            const w = (end - start)
            const center = Math.round(start + w / 2)
            qstart = Math.max(0, center - CachedSequence.#minQuerySize/2)
            qend = qstart + CachedSequence.#minQuerySize
        }
        const interval = new SequenceInterval(chr, qstart, qend)

        if (this.#currentQuery && this.#currentQuery[0].contains(chr, start, end)) {
            return this.#currentQuery[1]
        } else {
            const queryPromise = new Promise(async (resolve, reject) => {
                interval.features = await this.sequenceReader.readSequence(chr, qstart, qend)
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


