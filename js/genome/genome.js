/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import {loadFasta} from "./fasta.js"
import Cytoband from "./cytoband.js"
import {buildOptions, isDataURL} from "../util/igvUtils.js"
import {BGZip, igvxhr, StringUtils} from "../../node_modules/igv-utils/src/index.js"
import version from "../version.js"

const DEFAULT_GENOMES_URL = "https://igv.org/genomes/genomes.json"
const BACKUP_GENOMES_URL = "https://s3.amazonaws.com/igv.org.genomes/genomes.json"

const splitLines = StringUtils.splitLines

const GenomeUtils = {

    loadGenome: async function (options) {

        const cytobandUrl = options.cytobandURL
        const aliasURL = options.aliasURL
        const sequence = await loadFasta(options)

        let aliases
        if (aliasURL) {
            aliases = await loadAliases(aliasURL, sequence.config)
        }

        const genome = new Genome(options, sequence, aliases)

        // Delay loading cytbands untils after genome initialization to use chromosome aliases (1 vs chr1, etc).
        if (cytobandUrl) {
            genome.cytobands  = await loadCytobands(cytobandUrl, sequence.config, genome)
        }

        return genome
    },

    initializeGenomes: async function (config) {

        if (!GenomeUtils.KNOWN_GENOMES) {

            GenomeUtils.KNOWN_GENOMES = {}

            try {
                const url = `${ config.genome || DEFAULT_GENOMES_URL }?randomSeed=${ Math.random().toString(36) }&version=${ version() }`
                const jsonArray = await igvxhr.loadJson(url, {timeout: 5000})
                updateKnownGenomesTable(GenomeUtils.KNOWN_GENOMES, jsonArray)
            } catch (e) {
                console.error(e)
                try {
                    const url = `${ config.genome || BACKUP_GENOMES_URL }?randomSeed=${ Math.random().toString(36) }&version=${ version() }`
                    const jsonArray = await igvxhr.loadJson(url, {})
                    updateKnownGenomesTable(GenomeUtils.KNOWN_GENOMES, jsonArray)
                } catch (e) {
                    console.error(e)
                    console.warn("Errors loading default genome definitions.")
                }
            }

            // Add user-defined genomes
            const genomeList = config.genomeList
            if (genomeList) {
                if (typeof genomeList === 'string') {
                    const jsonArray = await igvxhr.loadJson(genomeList, {})
                    updateKnownGenomesTable(GenomeUtils.KNOWN_GENOMES, jsonArray)
                } else {
                    updateKnownGenomesTable(GenomeUtils.KNOWN_GENOMES, genomeList)
                }
            }

        }
    },

    isWholeGenomeView: function (chr) {
        return 'all' === chr.toLowerCase()
    },

    // Expand a genome id to a reference object, if needed
    expandReference: function (alert, idOrConfig) {

        // idOrConfig might be json
        if (StringUtils.isString(idOrConfig) && idOrConfig.startsWith("{")) {
            try {
                idOrConfig = JSON.parse(idOrConfig)
            } catch (e) {
                // Apparently its not json,  could be an ID starting with "{".  Unusual but legal.
            }
        }

        let genomeID
        if (StringUtils.isString(idOrConfig)) {
            genomeID = idOrConfig
        } else if (idOrConfig.genome) {
            genomeID = idOrConfig.genome
        } else if (idOrConfig.id !== undefined && idOrConfig.fastaURL === undefined) {
            // Backward compatibility
            genomeID = idOrConfig.id
        }

        if (genomeID) {
            const knownGenomes = GenomeUtils.KNOWN_GENOMES
            const reference = knownGenomes[genomeID]
            if (!reference) {
                alert.present(new Error(`Unknown genome id: ${genomeID}`), undefined)
            }
            return reference
        } else {
            return idOrConfig
        }
    }
}

function updateKnownGenomesTable(knownGenomesTable, jsonArray) {
    for (const json of jsonArray) {
        knownGenomesTable[ json.id ] = json
    }
}

class Genome {

    constructor(config, sequence, aliases) {

        this.config = config
        this.id = config.id || generateGenomeID(config)
        this.sequence = sequence
        this.chromosomeNames = sequence.chromosomeNames
        this.chromosomes = sequence.chromosomes  // An object (functions as a dictionary)
        this.featureDB = {}   // Hash of name -> feature, used for search function.

        this.wholeGenomeView = config.wholeGenomeView === undefined || config.wholeGenomeView
        if (this.wholeGenomeView && Object.keys(sequence.chromosomes).length > 1) {
            constructWG(this, config)
        } else {
            this.wgChromosomeNames = sequence.chromosomeNames
        }

        /**
         * Return the official chromosome name for the (possibly) alias.  Deals with
         * 1 <-> chr1,  chrM <-> MT,  IV <-> chr4, etc.
         * @param str
         */
        var chrAliasTable = {},
            self = this


        // The standard mappings
        chrAliasTable["all"] = "all"
        this.chromosomeNames.forEach(function (name) {
            var alias = name.startsWith("chr") ? name.substring(3) : "chr" + name
            chrAliasTable[alias.toLowerCase()] = name
            if (name === "chrM") chrAliasTable["mt"] = "chrM"
            if (name === "MT") chrAliasTable["chrm"] = "MT"
            chrAliasTable[name.toLowerCase()] = name
        })

        // Custom mappings
        if (aliases) {
            aliases.forEach(function (array) {
                // Find the official chr name
                var defName, i

                for (i = 0; i < array.length; i++) {
                    if (self.chromosomes[array[i]]) {
                        defName = array[i]
                        break
                    }
                }

                if (defName) {
                    array.forEach(function (alias) {
                        if (alias !== defName) {
                            chrAliasTable[alias.toLowerCase()] = defName
                            chrAliasTable[alias] = defName      // Should not be needed
                        }
                    })
                }

            })
        }

        this.chrAliasTable = chrAliasTable

    }

    showWholeGenomeView() {
        return this.config.wholeGenomeView !== false
    }

    toJSON() {
        return Object.assign({}, this.config, {tracks: undefined})
    }

    getInitialLocus() {

    }

    getHomeChromosomeName() {
        if (this.showWholeGenomeView() && this.chromosomes.hasOwnProperty("all")) {
            return "all"
        } else {
            return this.chromosomeNames[0]

        }
    }

    getChromosomeName(str) {
        const chr = str ? this.chrAliasTable[str.toLowerCase()] : str
        return chr ? chr : str
    }

    getChromosome(chr) {
        chr = this.getChromosomeName(chr)
        return this.chromosomes[chr]
    }

    getCytobands(chr) {
        return this.cytobands ? this.cytobands[chr] : null
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

        let self = this

        if (!this.bpLength) {
            let bpLength = 0
            self.wgChromosomeNames.forEach(function (cname) {
                let c = self.chromosomes[cname]
                bpLength += c.bpLength
            })
            this.bpLength = bpLength
        }
        return this.bpLength
    }

    async getSequence(chr, start, end) {
        chr = this.getChromosomeName(chr)
        return this.sequence.getSequence(chr, start, end)
    }
}

async function loadCytobands(cytobandUrl, config, genome) {

    let data
    if (isDataURL(cytobandUrl)) {
        const plain = BGZip.decodeDataURI(cytobandUrl)
        data = ""
        const len = plain.length
        for (let i = 0; i < len; i++) {
            data += String.fromCharCode(plain[i])
        }
    } else {
        data = await igvxhr.loadString(cytobandUrl, buildOptions(config))
    }

    // var bands = [],
    //     lastChr,
    //     n = 0,
    //     c = 1,
    //
    //     len = lines.length,
    const cytobands = {}
    let lastChr
    let bands = []
    const lines = splitLines(data)
    for (let line of lines) {
        var tokens = line.split("\t")
        var chr = genome.getChromosomeName(tokens[0])
        if (!lastChr) lastChr = chr

        if (chr !== lastChr) {
            cytobands[lastChr] = bands
            bands = []
            lastChr = chr
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

function loadAliases(aliasURL, config) {

    return igvxhr.loadString(aliasURL, buildOptions(config))

        .then(function (data) {

            var lines = splitLines(data),
                aliases = []

            lines.forEach(function (line) {
                if (!line.startsWith("#") && line.length > 0) aliases.push(line.split("\t"))
            })

            return aliases
        })

}

function constructWG(genome, config) {

    let wgChromosomes
    if (config.chromosomeOrder) {
        if (Array.isArray(config.chromosomeOrder)) {
            genome.wgChromosomeNames = config.chromosomeOrder
        } else {
            genome.wgChromosomeNames = config.chromosomeOrder.split(',').map(nm => nm.trim())
        }
        wgChromosomes = genome.wgChromosomeNames.map(nm => genome.chromosomes[nm]).filter(chr => chr !== undefined)

    } else {

        // Trim small chromosomes.
        const lengths = Object.keys(genome.chromosomes).map(key => genome.chromosomes[key].bpLength)
        const median = lengths.reduce((a, b) => Math.max(a, b))
        const threshold = median / 50
        wgChromosomes = Object.values(genome.chromosomes).filter(chr => chr.bpLength > threshold)

        // Sort chromosomes.  First segregate numeric and alpha names, sort numeric, leave alpha as is
        const numericChromosomes = wgChromosomes.filter(chr => isDigit(chr.name.replace('chr', '')))
        const alphaChromosomes = wgChromosomes.filter(chr => !isDigit(chr.name.replace('chr', '')))
        numericChromosomes.sort((a, b) => Number.parseInt(a.name.replace('chr', '')) - Number.parseInt(b.name.replace('chr', '')))

        const wgChromosomeNames = numericChromosomes.map(chr => chr.name)
        for (let chr of alphaChromosomes) {
            wgChromosomeNames.push(chr.name)
        }
        genome.wgChromosomeNames = wgChromosomeNames
    }


    // Compute psuedo-chromosome "all"
    const l = wgChromosomes.reduce((accumulator, currentValue) => accumulator += currentValue.bpLength, 0)
    genome.chromosomes["all"] = {
        name: "all",
        bpLength: l
    }

    function isDigit(val) {
        return /^\d+$/.test(val)
    }

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

export default GenomeUtils
