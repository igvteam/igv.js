import {StringUtils} from "../../node_modules/igv-utils/src/index.js"
import {isNumber} from "../util/igvUtils.js"
import Chromosome from "./chromosome.js"


class Genome {

    featureDB = new Map()   // Hash of name -> feature, used for search function.

    constructor(config, sequence, aliases, chromosomes, cytobands) {

        this.config = config
        this.id = config.id || generateGenomeID(config)
        this.sequence = sequence
        this.nameSet = config.nameSet
        this.chromosomes = chromosomes

        // Set chromosome order for WG view and chromosome pulldown
        if (config.chromosomeOrder) {
            if (Array.isArray(config.chromosomeOrder)) {
                this.wgChromosomeNames = config.chromosomeOrder
            } else {
                this.wgChromosomeNames = config.chromosomeOrder.split(',').map(nm => nm.trim())
            }
        } else {
            this.wgChromosomeNames = trimChromosomes(chromosomes)
        }

        // Build the ordered list of chromosome names
        const o = new Set(this.wgChromosomeNames)
        this.chromosomeNames = Array.from(this.wgChromosomeNames)
        for (let c of this.chromosomes.keys()) {
            if (!o.has(c)) this.chromosomeNames.push(c)
        }

        // Build the alias table and correct cytoband sequence names
        this.chrAliasTable = createAliasTable(this.chromosomes, aliases)

        if (cytobands) {
            this.cytobands = {}
            for (let c of Object.keys(cytobands)) {
                const chrName = this.getChromosomeName(c)
                this.cytobands[chrName] = cytobands[c]
            }
        }

        // Optionally create the psuedo chromosome "all" to support whole genome view
        this.wholeGenomeView = config.wholeGenomeView !== false
        if (this.wholeGenomeView && this.chromosomes.size > 1) {
            const l = this.wgChromosomeNames.reduce((accumulator, currentValue) => accumulator += this.chromosomes.get(currentValue).bpLength, 0)
            this.chromosomes.set("all", new Chromosome("all", 0, l))
            this.chromosomeNames.unshift("all")
        }


    }

    showWholeGenomeView() {
        return this.wholeGenomeView
    }

    toJSON() {
        return Object.assign({}, this.config, {tracks: undefined})
    }

    getInitialLocus() {

    }

    getHomeChromosomeName() {
        if (this.showWholeGenomeView() && this.chromosomes.has("all")) {
            return "all"
        } else {
            return this.chromosomeNames[0]

        }
    }

    getChromosomeName(str) {
        const chr = str ? this.chrAliasTable[str.toLowerCase()] : str
        return chr ? chr : str
    }

    getChromosomeDisplayName(str) {
        const canonicalName = this.getChromosomeName(str)
        if (this.nameSet) {
            return this.chromosomes.has(canonicalName) ? this.chromosomes.get(canonicalName).getAltName("ucsc") : canonicalName
        } else {
            return canonicalName
        }
    }

    getChromosome(chr) {
        chr = this.getChromosomeName(chr)
        return this.chromosomes.get(chr)
    }

    getCytobands(chr) {
        const chrName = this.getChromosomeName(chr)
        return this.cytobands ? this.cytobands[chrName] : null
    }

    getLongestChromosome() {

        var longestChr,
            chromosomes = this.chromosomes
        for (let key in chromosomes) {
            if (chromosomes.hasOwnProperty(key)) {
                var chr = chromosomes[key]
                if (longestChr === undefined || chr.bpLength > longestChr.bpLength) {
                    longestChr = chr
                }
            }
            return longestChr
        }
    }

    getChromosomes() {
        return this.chromosomes
    }

    /**
     * Return the genome coordinate in kb for the give chromosome and position.
     * NOTE: This might return undefined if the chr is filtered from whole genome view.
     */
    getGenomeCoordinate(chr, bp) {

        var offset = this.getCumulativeOffset(chr)
        if (offset === undefined) return undefined

        return offset + bp
    }

    /**
     * Return the chromosome and coordinate in bp for the given genome coordinate
     */
    getChromosomeCoordinate(genomeCoordinate) {

        if (this.cumulativeOffsets === undefined) {
            this.cumulativeOffsets = computeCumulativeOffsets.call(this)
        }

        let lastChr = undefined
        let lastCoord = 0
        for (let name of this.wgChromosomeNames) {

            const cumulativeOffset = this.cumulativeOffsets[name]
            if (cumulativeOffset > genomeCoordinate) {
                const position = genomeCoordinate - lastCoord
                return {chr: lastChr, position: position}
            }
            lastChr = name
            lastCoord = cumulativeOffset
        }

        // If we get here off the end
        return {chr: this.wgChromosomeNames[this.wgChromosomeNames.length - 1], position: 0}

    };


    /**
     * Return the offset in genome coordinates (kb) of the start of the given chromosome
     * NOTE:  This might return undefined if the chromosome is filtered from whole genome view.
     */
    getCumulativeOffset(chr) {

        if (this.cumulativeOffsets === undefined) {
            this.cumulativeOffsets = computeCumulativeOffsets.call(this)
        }

        const queryChr = this.getChromosomeName(chr)
        return this.cumulativeOffsets[queryChr]

        function computeCumulativeOffsets() {

            let self = this
            let acc = {}
            let offset = 0
            for (let name of self.wgChromosomeNames) {

                acc[name] = Math.floor(offset)

                const chromosome = self.getChromosome(name)

                offset += chromosome.bpLength
            }

            return acc
        }
    }

    /**
     * Return the nominal genome length, this is the length of the main chromosomes (no scaffolds, etc).
     */
    getGenomeLength() {

        if (!this.bpLength) {
            let bpLength = 0
            for (let cname of this.wgChromosomeNames) {
                let c = this.chromosomes.get(cname)
                bpLength += c.bpLength
            }
            this.bpLength = bpLength
        }
        return this.bpLength
    }

    async getSequence(chr, start, end) {
        chr = this.getChromosomeName(chr)
        return this.sequence.getSequence(chr, start, end)
    }

    addFeaturesToDB(featureList, config) {

        const insertFeature = (name, feature) => {
            const current = this.featureDB.get(name)
            if (current) {
                feature = (feature.end - feature.start) > (current.end - current.start) ? feature : current

            }
            this.featureDB.set(name, feature)
        }

        for (let feature of featureList) {
            if (feature.name) {
                insertFeature(feature.name.toUpperCase(), feature)
            }
            if (feature.gene && feature.gene.name) {
                insertFeature(feature.gene.name.toUpperCase(), feature)
            }

            if (config.searchableFields) {
                for (let f of config.searchableFields) {
                    const value = feature.getAttributeValue(f)
                    if (value) {
                        if (value.indexOf(" ") > 0) {
                            insertFeature(value.replaceAll(" ", "+").toUpperCase(), feature)
                        } else {
                            insertFeature(value.toUpperCase(), feature)
                        }
                    }
                }
            }
        }
    }

    constructWG(config) {

        // Compute psuedo-chromosome "all"
        const l = this.wgChromosomeNames.reduce((accumulator, currentValue) => accumulator += this.chromosomes.get(currentValue).bpLength, 0)
        this.chromosomes.set("all", new Chromosome("all", 0, l))
    }
}

function createAliasTable(chromosomes, aliases) {

    /**
     * Return the official chromosome name for the (possibly) alias.  Deals with
     * 1 <-> chr1,  chrM <-> MT,  IV <-> chr4, etc.
     * @param str
     */
    const chrAliasTable = {}

    // The standard mappings
    chrAliasTable["all"] = "all"
    chromosomes.forEach(function (c) {
        const name = c.name
        if (name.startsWith("chr")) {
            chrAliasTable[name.substring(3)] = name
        } else if (isNumber(name)) {
            chrAliasTable["chr" + name] = name
        }
        if (name === "chrM") chrAliasTable["mt"] = "chrM"
        if (name === "MT") chrAliasTable["chrm"] = "MT"
        chrAliasTable[name.toLowerCase()] = name
    })

    // Custom mappings
    if (aliases) {
        for (let array of aliases) {

            // Find the official chr name
            let defName
            for (let i = 0; i < array.length; i++) {
                if (chromosomes.get(array[i])) {
                    defName = array[i]
                    break
                }
            }

            if (defName) {
                for (let alias of array) {
                    if (alias !== defName) {
                        chrAliasTable[alias.toLowerCase()] = defName
                        chrAliasTable[alias] = defName      // Should not be needed
                    }
                }
            }
        }
    }
    return chrAliasTable
}

/**
 * Trim small sequences (chromosomes) and return the list of trimmed chromosome names.
 * The results are used to construct the whole genome view and optionally chromosome pulldown
 * *
 * @param config - the "reference" configuration object
 * @returns {string|*|*[]|string[]}
 */
function trimChromosomes(chromosomes) {

    // Trim small chromosomes.
    const lengths = Array.from(chromosomes.values()).map(c => c.bpLength)
    const max = lengths.reduce((acc, val) => acc > val ? acc : val)  // Dont' use spread operator here, lengths can be large
    const threshold = max / 50
    const wgChromosomes = Array.from(chromosomes.values()).filter(chr => chr.bpLength > threshold)

    // Sort chromosomes.  First segregate numeric and alpha names, sort numeric, leave alpha as is
    const numericChromosomes = wgChromosomes.filter(chr => isDigit(chr.name.replace('chr', '')))
    const alphaChromosomes = wgChromosomes.filter(chr => !isDigit(chr.name.replace('chr', '')))
    numericChromosomes.sort((a, b) => Number.parseInt(a.name.replace('chr', '')) - Number.parseInt(b.name.replace('chr', '')))
    const wgChromosomeNames = numericChromosomes.map(chr => chr.name)
    for (let chr of alphaChromosomes) {
        wgChromosomeNames.push(chr.name)
    }
    return wgChromosomeNames

}

function isDigit(val) {
    return /^\d+$/.test(val)
}

function generateGenomeID(config) {
    if (config.id !== undefined) {
        return config.id
    } else if (config.fastaURL && StringUtils.isString(config.fastaURL)) {
        return config.fastaURL
    } else if (config.fastaURL && config.fastaURL.name) {
        return config.fastaURL.name
    } else {
        return ("0000" + (Math.random() * Math.pow(36, 4) << 0).toString(36)).slice(-4)
    }
}

export default Genome
