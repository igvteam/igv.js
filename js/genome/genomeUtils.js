import Genome from "./genome.js"
import {loadFasta} from "./fasta.js"
import {loadCytobands, loadCytobandsBB} from "./cytoband.js"
import {buildOptions} from "../util/igvUtils.js"
import {igvxhr, StringUtils} from "../../node_modules/igv-utils/src/index.js"
import BWReader from "../bigwig/bwReader.js"
import Chromosome from "./chromosome.js"

const DEFAULT_GENOMES_URL = "https://igv.org/genomes/genomes.json"
const BACKUP_GENOMES_URL = "https://s3.amazonaws.com/igv.org.genomes/genomes.json"

const GenomeUtils = {

    loadGenome: async function (options) {

        const sequence = await loadFasta(options)

        let aliases
        let chromosomes
        let cytobands
        if (options.aliasBbURL) {  // Order is important, try this first
            const abb = await loadAliasesBB(options.aliasBbURL, options)
            aliases = abb.aliases
            chromosomes = abb.chromosomes
        } else {
            chromosomes = sequence.chromosomes
            if (options.aliasURL) {
                aliases = await loadAliases(options.aliasURL, options)
            }
        }

        if (options.cytobandBbURL) {
            const cc = await loadCytobandsBB(options.cytobandBbURL, options)
            cytobands = cc.cytobands
            if (!chromosomes) {
                chromosomes = cc.chromosomes
            }
        } else if (options.cytobandURL) {
            cytobands = await loadCytobands(options.cytobandURL, options)
        }

        const genome = new Genome(options, sequence, aliases, chromosomes, cytobands)

        return genome
    },

    initializeGenomes: async function (config) {

        if (!GenomeUtils.KNOWN_GENOMES) {

            const table = {}

            // Get default genomes
            if (config.loadDefaultGenomes !== false) {
                try {
                    const url = DEFAULT_GENOMES_URL
                    const jsonArray = await igvxhr.loadJson(url, {timeout: 5000})
                    processJson(jsonArray)
                } catch (e) {
                    console.error(e)
                    try {
                        const url = BACKUP_GENOMES_URL
                        const jsonArray = await igvxhr.loadJson(url, {})
                        processJson(jsonArray)
                    } catch (e) {
                        console.error(e)
                        console.warn("Errors loading default genome definitions.")
                    }
                }
            }

            // Add user-defined genomes
            const genomeList = config.genomeList || config.genomes
            if (genomeList) {
                if (typeof genomeList === 'string') {
                    const jsonArray = await igvxhr.loadJson(genomeList, {})
                    processJson(jsonArray)
                } else {
                    processJson(genomeList)
                }
            }

            GenomeUtils.KNOWN_GENOMES = table

            function processJson(jsonArray) {
                jsonArray.forEach(function (json) {
                    table[json.id] = json
                })
                return table
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
        } else if (idOrConfig.id !== undefined && !(idOrConfig.fastaURL || idOrConfig.twobitURL)) {
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

/**
 * Load a tab-delimited alias file
 * @param aliasURL
 * @param config
 * @returns {Promise<*[]>}
 */
async function loadAliases(aliasURL, config) {

    const data = await igvxhr.loadString(aliasURL, buildOptions(config))
    const lines = StringUtils.splitLines(data)
    const aliases = []
    for (let line of lines) {
        if (!line.startsWith("#") && line.length > 0) aliases.push(line.split("\t"))
    }
    return aliases
}

/**
 * Load a UCSC bigbed alias file. Features are in bed+3 format.
 *     {
 *         "chr": "CM021939.1",
 *         "start": 0,
 *         "end": 223606306,
 *         "genbank": "CM021939.1",
 *         "assembly": "1",
 *         "ensembl": "1",
 *         "ncbi": "1",
 *         "ucsc": "chr1"
 *     }
 * @param url
 * @param config
 * @returns {Promise<*[]>}
 */
async function loadAliasesBB(url, config) {

    const bbReader = new BWReader({url: url, format: "bigbed", wholeFile: true})
    const features = await bbReader.readWGFeatures()
    if (features.length === 0) return

    const keys = Object.keys(features[0]).filter(k => !(k === "start" || k === "end"))


    const aliases = []
    const chromosomes = new Map()   // chromosome metadata object
    let order = 0
    for (let f of features) {
        aliases.push(keys.filter(k => f[k]).map(k => f[k]))

        const altNames = new Map()
        for (let k of keys.filter(k => k != "chr")) {
            altNames.set(k, f[k])
        }
        chromosomes.set(f["chr"], new Chromosome(f["chr"], order++, f["end"], altNames))
    }

    return {chromosomes, aliases}
}

export default GenomeUtils
