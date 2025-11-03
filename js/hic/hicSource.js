import HicFile from '../../node_modules/hic-straw/src/hicFile.js'
import LRU from "../util/lruCache.js"

class HicSource {

    constructor(config, genome) {
        this.config = config
        this.genome = genome
        this.hicFile = config._hicFile ? config._hicFile : new HicFile(config)
        config._hicFile = undefined

        this.binThreshold = config.binThreshold || 5
        this.percentileThreshold = config.percentileThreshold || 80
        this.recordCache = new Map()
        this.normVectorCache = new LRU(10)
    }

    async getHeader() {
        await this.hicFile.init()
        this.normalizationOptions = await this.hicFile.getNormalizationOptions()
        return this.hicFile
    }

    async getFeatures({chr, start, end, bpPerPixel, visibilityWindow, normalization}) {

        if (!this.hicFile.initialized) {
            await this.hicFile.init()
        }

        // Find the best resolution => resolution
        const resolutions = this.hicFile.bpResolutions
        let index = -1
        for (let i = resolutions.length - 1; i >= 0; i--) {
            if (resolutions[i] >= bpPerPixel) {
                index = i
                break
            }
        }
        const selectedIndex = index !== -1 ? index : 0
        const binSize = resolutions[selectedIndex]
        const records = await this.getRecords(chr, start, end, binSize)

        // Not interested in interactions close to the diagonal
        const binThreshold = this.binThreshold

        let nvX1, nvY1, normVector1, normVector2
        if (normalization && "NONE" !== normalization) {
            const nv1 = await this.getNormalizationVector(normalization, chr, binSize)
            nvX1 = Math.floor(start / binSize)
            nvY1 = Math.floor(start / binSize)
            normVector1 = await nv1.getValues(nvX1, Math.ceil(end / binSize))
            normVector2 = await nv1.getValues(nvY1, Math.ceil(end / binSize))
        }


        // Computer statistic for thresholding
        const values = []
        for (let rec of records) {
            if (Math.abs(rec.bin1 - rec.bin2) > binThreshold) {
                const {bin1, bin2, counts} = rec
                let value = counts
                if (normalization && "NONE" !== normalization) {
                    const nvnv = normVector1[bin1 - nvX1] * normVector2[bin2 - nvY1]
                    if (nvnv !== 0 && !isNaN(nvnv)) {
                        value /= nvnv
                    } else {
                        continue   // skip this record
                    }
                }
                values.push(value)
            }
        }

        // If the # of features is > 1,000, set a threshold on counts to limit the number of features returned.
        const [threshold, min, max] = values.length < 1000 ? 0 : percentiles(values, this.percentileThreshold, 50000) //100 - this.percentileThreshold)

        const features = []
        for (let rec of records) {

            const {bin1, bin2, counts} = rec
            // Skip diagonal
            if (Math.abs(bin1 - bin2) <= binThreshold) continue

            let value = counts
            if (normalization && "NONE" !== normalization) {
                const nvnv = normVector1[bin1 - nvX1] * normVector2[bin2 - nvY1]
                if (nvnv !== 0 && !isNaN(nvnv)) {
                    value /= nvnv
                } else {
                    continue   // skip this record
                }
            }
            // Skip bins with value below threshold
            if (value < threshold) continue

            const c = this.genome.getChromosomeName(chr)
            const start1 = bin1 * binSize
            const end1 = bin1 * binSize + binSize
            const start2 = bin2 * binSize
            const end2 = bin2 * binSize + binSize
            const delta = Math.abs(start2 - start1)

            features.push({
                chr: c,
                chr1: c,
                chr2: c,
                start: Math.min(start1, start2),
                end: Math.max(end1, end2),
                start1,
                end1,
                start2,
                end2,
                value,
               score: (max > min) ? Math.round(200 + Math.min(Math.max((value - min) / (max - min), 0), 1) * 600) : 800
            })
        }

        features.sort((a, b) => a.start - b.start)
        return features

    }

    async getNormalizationVector(normalization, chr, binSize) {
        const cacheKey = `${normalization}_${chr}_${binSize}`
        if (this.normVectorCache.has(cacheKey)) {
            return this.normVectorCache.get(cacheKey)
        }
        const nv1 = await this.hicFile.getNormalizationVector(normalization, chr, "BP", binSize)
        this.normVectorCache.set(cacheKey, nv1)
        return nv1
    }

    async getRecords(chr, start, end, binSize) {

        const cacheKey = `${chr}_${binSize}`
        if (this.recordCache.has(cacheKey)) {
            const cachedValue = this.recordCache.get(cacheKey)
            if (start >= cachedValue.start && end <= cachedValue.end) {
                return cachedValue.records
            }
        }

        // Expand region to bin boundaries
        const expandedStart = Math.floor((start + 1) / binSize) * binSize
        const expandedEnd = Math.ceil((end - 1) / binSize) * binSize

        const records = await this.hicFile.getContactRecords(
            undefined,
            {chr, start: expandedStart, end: expandedEnd},
            {chr, start: expandedStart, end: expandedEnd},
            "BP",
            binSize
        )

        // Keep just a single entry in the cache for now
        this.recordCache.clear()
        this.recordCache.set(cacheKey, {start: expandedStart, end: expandedEnd, records})
        return records
    }

    supportsWholeGenome() {
        return false
    }

}

/**
 * Calculate the pth percentile of an array.
 *
 * @param array
 * @param p
 * @param maxSize
 * @returns {*|number}
 */
function percentiles(array, p, maxSize = 50000) {

    if (array.length === 0) return 0

    array.sort(function (a, b) {
        return a - b
    })

    const k = Math.max(Math.floor(array.length * (p / 100)), Math.max(0, array.length- maxSize))

    // Indices for 5th and 95th percentiles of the truncated array
    const i = k + (Math.floor((array.length - k) * (5/100)))
    const j = k + (Math.floor((array.length - k) * (95/100)))

    return [array[k], array[i], array[j]]

}


export default HicSource