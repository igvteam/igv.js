import {buildOptions, isDataURL} from "../util/igvUtils.js"
import {BGZip, igvxhr, StringUtils} from "../../node_modules/igv-utils/src/index.js"
import {Cytoband} from "./cytoband.js"
import Chromosome from "./chromosome.js"

class CytobandFile {

    cytobands = new Map()

    constructor(url, config) {
        this.url = url;
        this.config = config;
    }

    async getCytobands(chr) {
        if(this.cytobands.size === 0) {
            await this.#loadCytobands()
        }
        return this.cytobands.get(chr)
    }


    /**
     * Load a UCSC bigbed cytoband file. Features are in bed+4 format.
     * {
     *   "chr": "chr1",
     *   "start": 0,
     *   "end": 1735965,
     *   "name": "p36.33",
     *   "gieStain": "gneg"
     * }
     * @returns {Promise<*[]>}
     */
    async #loadCytobands() {

        let data
        if (isDataURL(this.url)) {
            const plain = BGZip.decodeDataURI(this.url)
            data = ""
            const len = plain.length
            for (let i = 0; i < len; i++) {
                data += String.fromCharCode(plain[i])
            }
        } else {
            data = await igvxhr.loadString(this.url, buildOptions(this.config))
        }

        let lastChr
        let bands = []
        const lines = StringUtils.splitLines(data)
        for (let line of lines) {

            const tokens = line.split("\t")
            const chrName = tokens[0] //genome.getChromosomeName(tokens[0])   // Note allowance for alias name, not sure why this is needed here
            if (!lastChr) lastChr = chrName

            if (chrName !== lastChr) {
                this.cytobands.set(lastChr, bands)
                bands = []
                lastChr = chrName
            }

            if (tokens.length === 5) {
                //10	0	3000000	p15.3	gneg
                const start = parseInt(tokens[1])
                const end = parseInt(tokens[2])
                const name = tokens[3]
                const stain = tokens[4]
                bands.push(new Cytoband(start, end, name, stain))
            }
        }

    }

    /**
     * Infer genome chromosome names from cytoband data.  This should only be used as a last resort
     */
    async getChromosomeNames() {
        if(this.cytobands.size === 0) {
            await this.#loadCytobands()
        }
        return Array.from(this.cytobands.keys())
    }

    /**
     * Infer chromosome objects from cytoband data.  This should only be used as last resort.
     */
    async getChromosomes() {
        if(this.cytobands.size === 0) {
            await this.#loadCytobands()
        }

        const chromosomes = []
        let order = 0;
        for(let [chrName, cytoList] of this.cytobands.entries()) {
            chromosomes.push(new Chromosome(chrName, order++, cytoList[cytoList.length - 1].end))
        }
        return chromosomes
    }

}

export default CytobandFile

