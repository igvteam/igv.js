/**
 * Insert size ("TLEN") statistics for a paired end alignment track.
 *
 * Samples are pooled across every window that is loaded, rather than taken from whichever load happens
 * to finish first.  The thresholds therefore do not depend on load order, and a single unrepresentative
 * window -- one centered on a structural variant, say -- cannot set them for the rest of the session.
 */

const MAX_SAMPLES = 20000
const MIN_SAMPLES = 100

// The most any one window may contribute.  A deep coverage load can supply tens of thousands of proper
// pairs -- more than the whole pool -- so without this the first window loaded would fill it and no later
// one could move the thresholds, which is the behaviour this class exists to avoid.
const MAX_PER_WINDOW = 1000

// Trim at this many robust standard deviations before taking a percentile.  Wide enough that a well
// behaved library loses nothing, narrow enough to separate out a discordant population.
const TRIM_DEVIATIONS = 10

class PairedEndStats {

    constructor({minTLENPercentile, maxTLENPercentile} = {}) {
        this.lp = minTLENPercentile === undefined ? 0.1 : minTLENPercentile
        this.up = maxTLENPercentile === undefined ? 99.5 : maxTLENPercentile
        this.isizes = []
        this.minTLEN = undefined
        this.maxTLEN = undefined
    }

    get totalCount() {
        return this.isizes.length
    }

    /**
     * Pool the proper pairs of a newly loaded window and recompute the thresholds over everything pooled
     * so far.  Recomputing every time is what makes the result independent of the order windows arrive
     * in; deferring it would leave the thresholds derived from whichever windows happened to come first,
     * which is the behavior this class exists to avoid.  Sorting the pool is negligible next to decoding
     * the alignments that fill it.
     */
    addSample(alignments) {

        const room = Math.min(MAX_SAMPLES - this.isizes.length, MAX_PER_WINDOW)
        if (room <= 0) return

        let properPairs = 0
        for (let alignment of alignments) {
            if (alignment.isProperPair()) properPairs++
        }
        if (properPairs === 0) return

        // Evenly spaced rather than the first "room" pairs, which would favour the leftmost reads of the
        // window and, over a deletion breakpoint, one side of it.
        const stride = Math.ceil(properPairs / room)
        let seen = 0, taken = 0
        for (let alignment of alignments) {
            if (alignment.isProperPair()) {
                if (seen % stride === 0) {
                    this.isizes.push(Math.abs(alignment.fragmentLength))
                    if (++taken === room) break
                }
                seen++
            }
        }

        if (this.isizes.length >= MIN_SAMPLES) {
            this.compute()
        }
    }

    compute() {
        const {min, max} = robustRange(this.isizes, this.lp, this.up)
        this.minTLEN = this.lp === 0 ? 0 : min
        this.maxTLEN = max
    }
}

/**
 * The percentiles are taken in the tails of the distribution, so a small fraction of discordant pairs --
 * which form a separate population far from the mode -- is enough to drag a threshold past every read
 * worth flagging.  Locate that population with the median and the median absolute deviation, neither of
 * which a minority of outliers can shift, and drop it before taking the percentiles.  A library with no
 * such population loses nothing, so well behaved files are unaffected.
 */
function robustRange(values, lp, up) {

    const sorted = Array.from(values).sort(numeric)
    const med = medianOfSorted(sorted)
    const scale = 1.4826 * medianOfSorted(sorted.map(v => Math.abs(v - med)).sort(numeric))

    let kept = sorted
    if (scale > 0) {
        const low = med - TRIM_DEVIATIONS * scale
        const high = med + TRIM_DEVIATIONS * scale
        const trimmed = sorted.filter(v => v >= low && v <= high)
        // Refuse to trim away a majority.  If that happens the sample is not a contaminated unimodal
        // distribution, and there is no basis for calling any part of it an outlier.
        if (trimmed.length >= sorted.length / 2) {
            kept = trimmed
        }
    }

    return {min: quantile(kept, lp), max: quantile(kept, up)}
}

function numeric(a, b) {
    return a - b
}

function medianOfSorted(sorted) {
    const n = sorted.length
    if (n === 0) return undefined
    return n % 2 === 1 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2
}

/**
 * The value at percentile "p" of a sorted array.  The index is clamped -- p = 100 would otherwise run off
 * the end and return undefined, silently disabling the threshold computed from it.
 */
function quantile(sorted, p) {
    if (sorted.length === 0) return undefined
    const k = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * (p / 100))))
    return sorted[k]
}

export default PairedEndStats
