import HicFile from '../../node_modules/hic-straw/src/hicFile.js'

class HicSource {

    constructor(config, genome) {
        this.config = config
        this.genome = genome
        this.hicFile = config._hicFile ? config._hicFile : new HicFile(config)
        config._hicFile = undefined

        this.diagonalBinThreshold = config.diagonalBinThreshold || 10
        this.percentileThreshold = config.percentileThreshold || 10
        this.alphaModifier = config.alphaModifier || 1  //0.1
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

        // TODO -- we need to account for chromosome aliases here
        const alias = this.hicFile.getFileChrName(chr)
        const records = await this.hicFile.getContactRecords(
            undefined,
            {chr: alias, start, end},
            {chr: alias, start, end},
            "BP",
            binSize
        )

        let max = 0
        const counts = []
        for (let rec of records) {
            if (Math.abs(rec.bin1 - rec.bin2) > this.diagonalBinThreshold) {
                counts.push(rec.counts)
                if (rec.counts > max) {
                    max = rec.counts
                }
            }
        }
        const threshold = percentile(counts, 100 - this.percentileThreshold)

        const features = []
        for (let rec of records) {

            const {bin1, bin2, counts} = rec
            // Skip diagonal
            if (Math.abs(bin1 - bin2) <= this.diagonalBinThreshold) continue

            if (counts < threshold) continue

            const alpha = Math.min(1.0, counts / max)
            const color = {red: 255, green: 0, blue: 0}
            const rgba = `rgba(${color.red},${color.green},${color.blue},${this.alphaModifier * alpha})`

            const c = this.genome.getChromosomeName(chr)
            features.push({
                chr1: c,
                start1: bin1 * binSize,
                end1: bin1 * binSize + binSize,
                chr2: c,
                start2: bin2 * binSize,
                end2: bin2 * binSize + binSize,
                value: counts,
                score: 1000 * (counts / max),
            })

            for (let feature of features) {
                feature.chr = feature.chr1
                feature.start = Math.min(feature.start1, feature.start2)
                feature.end = Math.max(feature.end1, feature.end2)
            }
        }

        return features

    }


    supportsWholeGenome() {
        return false
    }

}


function percentile(array, p) {

    if (array.length === 0) return undefined
    const k = Math.floor(array.length * ((100 - p) / 100))

    array.sort(function (a, b) {
        return b - a
    })
    return array[k]

}


export default HicSource