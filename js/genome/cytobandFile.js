import {buildOptions, isDataURL} from "../util/igvUtils.js"
import {BGZip, igvxhr, StringUtils} from "igv-utils"
import {Cytoband} from "./cytoband.js"

class CytobandFile {

    constructor(url, config) {
        this.url = url;
        this.config = config;
    }

    async getCytobands(chr) {
        if(!this.cytobands) {
            await this.#loadCytobands()
        }
        return this.cytobands[chr]
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

        const cytobands = {}
        let lastChr
        let bands = []
        const lines = StringUtils.splitLines(data)
        for (let line of lines) {

            const tokens = line.split("\t")
            const chrName = tokens[0] //genome.getChromosomeName(tokens[0])   // Note allowance for alias name, not sure why this is needed here
            if (!lastChr) lastChr = chrName

            if (chrName !== lastChr) {
                cytobands[lastChr] = bands
                bands = []
                lastChr = chrName
            }

            if (tokens.length === 5) {
                //10	0	3000000	p15.3	gneg
                var start = parseInt(tokens[1])
                var end = parseInt(tokens[2])
                var name = tokens[3]
                var stain = tokens[4]
                bands.push(new Cytoband(start, end, name, stain))
            }
        }

        this.cytobands = cytobands
    }

}

export default CytobandFile

