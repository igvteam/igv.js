import HicFile from '../../node_modules/hic-straw/src/hicFile.js'

class HicSource {

    constructor(config, genome) {
        this.config = config
        this.genome = genome
        this.hicFile = config._hicFile ? config._hicFile : new HicFile(config)
        config._hicFile = undefined

        this.minPixelWidth = config.minPixelWidth || 10
        this.percentileThreshold = config.percentileThreshold || 5
    }

    async postInit() {
        await this.hicFile.init()
    }

    async getHeader() {
        await this.hicFile.init()
        return this.hicFile
    }

    async getFeatures({chr, start, end, bpPerPixel, visibilityWindow}) {

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

        const alias = this.hicFile.getFileChrName(chr)
        const records = await this.hicFile.getContactRecords(
            undefined,
            {chr: alias, start, end},
            {chr: alias, start, end},
            "BP",
            binSize
        )

        // Not interested in interactions < 10 pixels apart
        const binThreshold = Math.max(1, (bpPerPixel / binSize) * this.minPixelWidth)

        let max = 0
        const counts = []
        for (let rec of records) {
            if (Math.abs(rec.bin1 - rec.bin2) > binThreshold) {
                counts.push(rec.counts)
                if (rec.counts > max) {
                    max = rec.counts
                }
            }
        }

        // If the # of features is > 1,000, set a threshold on counts to limit the number of features returned.
        const threshold = counts.length < 1000 ? 0 : percentile(counts, 100 - this.percentileThreshold)

        const features = []
        for (let rec of records) {

            const {bin1, bin2, counts} = rec
            // Skip diagonal
            if (Math.abs(bin1 - bin2) <= binThreshold) continue

            if (counts < threshold) continue

            const c = this.genome.getChromosomeName(chr)
            const start1 = bin1 * binSize
            const end1 = bin1 * binSize + binSize
            const start2 = bin2 * binSize
            const end2 = bin2 * binSize + binSize
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
                value: counts,
                score: 1000 * (counts / max),
            })
        }
        for (let feature of features) {
            feature.chr = feature.chr1
            feature.start = Math.min(feature.start1, feature.start2)
            feature.end = Math.max(feature.end1, feature.end2)
        }

        features.sort((a, b) => a.start - b.start)
        return features

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
function percentile(array, p, maxSize = 100000) {

    if (array.length === 0) return 0

    array.sort(function (a, b) {
        return a - b
    })

    const k = Math.max(array.length - maxSize, Math.floor(array.length * (p / 100)))

    return array[k]

}


export default HicSource