import {BGZip, igvxhr, StringUtils} from "../../node_modules/igv-utils/src/index.js"
import Chromosome from "./chromosome.js"
import {isDataURL} from "../util/igvUtils.js"

const splitLines = StringUtils.splitLines

const reservedProperties = new Set(['fastaURL', 'indexURL', 'cytobandURL', 'indexed'])

/**
 * Represents a reference object created from a ChromSizes file.  This is unusual, primarily for testing.
 */
class ChromSizes {

    #chromosomeNames
    chromosomes = new Map()

    constructor(url) {
        this.url = url
    }

    async init() {
        return this.loadAll()
    }

    getSequenceRecord(chr) {
        return this.chromosomes.get(chr)
    }

    get chromosomeNames() {
        if(!this.#chromosomeNames) {
            this.#chromosomeNames = Array.from(this.chromosomes.keys())
        }
    }

    async getSequence(chr, start, end) {
        return null // TODO -- return array of "N"s?
    }

    async loadAll() {

        let data
        if (isDataURL(this.url)) {
            let bytes = BGZip.decodeDataURI(this.fastaURL)
            data = ""
            for (let b of bytes) {
                data += String.fromCharCode(b)
            }
        } else {
            data = await igvxhr.load(this.url, {})
        }

        const lines = splitLines(data)
        let order = 0
        for (let nextLine of lines) {
            const tokens = nextLine.split('\t')
            if(tokens.length > 1) {
                const chrLength = Number.parseInt(tokens[1])
                const chromosome = new Chromosome(tokens[0], order++, chrLength)
                this.chromosomes.set(tokens[0], chromosome)
            }
        }
    }

}

async function loadChromSizes(url) {

    const chromosomeSizes = new Map();

    let data
    if (isDataURL(url)) {
        let bytes = BGZip.decodeDataURI(url)
        data = ""
        for (let b of bytes) {
            data += String.fromCharCode(b)
        }
    } else {
        data = await igvxhr.load(url, {})
    }

    const lines = splitLines(data)
    let order = 0
    for (let nextLine of lines) {
        const tokens = nextLine.split('\t')
        if(tokens.length > 1) {
            const chrLength = Number.parseInt(tokens[1])
            chromosomeSizes.set(tokens[0], new Chromosome(tokens[0], order++, chrLength))
        }
    }
    return chromosomeSizes
}


export default ChromSizes
export {loadChromSizes}
