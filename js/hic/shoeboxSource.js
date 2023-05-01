import HicFile from './straw/hicFile.js'

class ShoeboxSource {

    constructor(config, genome) {
        this.config = config
        this.genome = genome
        this.hicFile = config._hicFile? config._hicFile : new HicFile(config)
        config._hicFile = undefined
    }

    async getHeader() {
        await this.hicFile.init()
        return this.hicFile
    }

    async getFeatures({chr, start, end, bpPerPixel, visibilityWindow}) {

        if(!this.hicFile.initialized) {
            await this.hicFile.init()
        }

        // Currently we support a single resolution
        const resolutions = this.hicFile.bpResolutions
        const binSize = resolutions[resolutions.length-1]

        const contactRecords = await this.hicFile.getContactRecords(
            undefined,
            {chr, start, end},
            {chr: "celltype", start: 0, end: 100000000},
            "BP",
            binSize
        )

        const features = contactRecords.map(cr => {
            const start = cr.bin1 * binSize
            const end = start + binSize
            return {chr, start, end, value: cr.counts, sample: cr.bin2.toString()}
        })

        return features

    }


    supportsWholeGenome() {
        return false
    }

}


export default ShoeboxSource