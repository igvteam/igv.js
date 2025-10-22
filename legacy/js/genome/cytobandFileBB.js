import {Cytoband} from "./cytoband.js"
import BWSource from "../bigwig/bwSource.js"

class CytobandFileBB {

    cytobandMap = new Map()

    constructor(url, config, genome) {
        config = config || {}
        config.url = url
        this.source = new BWSource(config, genome)
    }

    async getCytobands(chr) {

        if (this.cytobandMap.has(chr)) {
            return this.cytobandMap.get(chr)
        } else {
            let cytobands = await this.#readCytobands(chr)
            if (!cytobands) cytobands = []  // Prevent loading again
            this.cytobandMap.set(chr, cytobands)
            return cytobands
        }
    }

    async #readCytobands(chr) {
        const features = await this.source.getFeatures({chr})
        return features.map(f => new Cytoband(f.start, f.end, f.name, f.gieStain))
    }
}

export default CytobandFileBB