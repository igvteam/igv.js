import {buildOptions, isDataURL} from "../util/igvUtils.js"
import {BGZip, igvxhr, StringUtils} from "../../node_modules/igv-utils/src/index.js"
import BWReader from "../bigwig/bwReader.js"
import Chromosome from "./chromosome.js"

class Cytoband {
    constructor(start, end, name, typestain) {
        this.start = start
        this.end = end
        this.name = name
        this.stain = 0

        // Set the type, either p, n, or c
        if (typestain === 'acen') {
            this.type = 'c'
        } else {
            this.type = typestain.charAt(1)
            if (this.type === 'p') {
                this.stain = parseInt(typestain.substring(4))
            }
        }
    }
}

async function loadCytobands(cytobandURL, config) {

    let data
    if (isDataURL(cytobandURL)) {
        const plain = BGZip.decodeDataURI(cytobandURL)
        data = ""
        const len = plain.length
        for (let i = 0; i < len; i++) {
            data += String.fromCharCode(plain[i])
        }
    } else {
        data = await igvxhr.loadString(cytobandURL, buildOptions(config))
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

    return cytobands
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
 * @param url
 * @param config
 * @returns {Promise<*[]>}
 */
async function loadCytobandsBB(url, config) {

    const bbReader = new BWReader({url: url, format: "bigbed", wholeFile: true})
    const features = await bbReader.readWGFeatures()
    if (features.length === 0) return

    // Sort features
    features.sort((a, b) => {
        if (a.chr === b.chr) {
            return a.start - b.start
        } else {
            return a.chr.localeCompare(b.chr)
        }
    })

    const cytobands = {}
    const chromosomes = new Map()   // chromosome metadata object
    let order = 0
    let lastChr
    let lastEnd
    let bands = []
    for (let f of features) {

        const chrName = f.chr
        if (!lastChr) lastChr = chrName

        if (chrName !== lastChr) {
            cytobands[lastChr] = bands
            chromosomes.set(lastChr, new Chromosome(lastChr, order++, lastEnd))
            bands = []
            lastChr = chrName
        }

        bands.push(new Cytoband(f.start, f.end, f.name, f.gieStain))
        lastEnd = f.end
    }

    return {chromosomes, cytobands}
}

export {Cytoband}
