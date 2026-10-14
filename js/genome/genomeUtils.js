import {igvxhr, StringUtils, FileUtils} from "../../node_modules/igv-utils/src/index.js"
import {convertToHubURL} from "../ucsc/ucscUtils.js"
import {loadHubGenomeConfig} from "../ucsc/hub/hub.js"
import {genomeLoadError, LoadError} from "../util/loadFailure.js"

const DEFAULT_GENOMES_URL = "https://igv.org/genomes/genomes3.json"
const BACKUP_GENOMES_URL = "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/genomes/web/genomes.json"

const GenomeUtils = {

    initializeGenomes: async function (config) {

        if (!GenomeUtils.KNOWN_GENOMES) {

            let table = {}

            const processJson = (jsonArray, table) => {
                jsonArray.forEach(function (json) {
                    table[json.id] = json
                })
                return table
            }

            // Get default genomes
            if (config.loadDefaultGenomes !== false) {
                try {
                    const jsonArray = await igvxhr.loadJson(DEFAULT_GENOMES_URL, {timeout: 2000})
                    processJson(jsonArray, table)
                } catch (error) {
                    try {
                        console.error("Error initializing default genomes:", error)
                        const jsonArray = await igvxhr.loadJson(BACKUP_GENOMES_URL, {timeout: 10000})
                        processJson(jsonArray, table)
                    } catch (e) {
                        console.error("Error initializing backup genomes:", error)
                    }
                }
            }

            // Append user-defined genomes, which might override defaults
            const genomeList = config.genomeList || config.genomes
            if (genomeList) {
                if (typeof genomeList === 'string') {
                    const jsonArray = await igvxhr.loadJson(genomeList, {})
                     processJson(jsonArray, table)
                } else {
                     processJson(genomeList, table)
                }
            }
            GenomeUtils.KNOWN_GENOMES = table
        }
    },

    isWholeGenomeView: function (chr) {
        return 'all' === chr.toLowerCase()
    },

    /**
     * Whether a genome string names a genome definition file (a json file holding a reference object, as in the
     * genome list) rather than a genome id.
     */
    isGenomeURL: function (string) {
        return StringUtils.isString(string) && "json" === FileUtils.getExtension(string)
    },

    /**
     * Load a genome definition file: a json file holding a reference object.  A file that cannot be read or parsed
     * fails the load with an error for the user.
     */
    loadGenomeURL: async function (url) {
        let reference
        try {
            reference = await igvxhr.loadJson(url)
        } catch (e) {
            throw genomeLoadError(undefined, new LoadError('genome', url, e))
        }
        if (Array.isArray(reference)) {
            const cause = new Error("it holds a list of genomes, not a single genome definition")
            throw genomeLoadError(undefined, new LoadError('genome', url, cause))
        }
        return reference
    },

    // Expand a genome id, or the url of a genome definition file, to a reference object, if needed
    expandReference: async function (idOrConfig) {

        // idOrConfig might be a json string?  I'm actually not sure how this arises.
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
            // A genome id never ends in .json, so such a string is the url of a genome definition file
            if (GenomeUtils.isGenomeURL(genomeID)) {
                return GenomeUtils.loadGenomeURL(genomeID)
            }
            const knownGenomes = GenomeUtils.KNOWN_GENOMES
            let reference = knownGenomes[genomeID]
            if (!reference) {
                if ((genomeID.startsWith("GCA_") || genomeID.startsWith("GCF_")) && genomeID.length >= 13) {
                    // A GenArk accession: its hub is the genome, so a hub that cannot be read fails the load
                    try {
                        reference = await loadHubGenomeConfig(convertToHubURL(genomeID), genomeID)
                    } catch (e) {
                        throw genomeLoadError(genomeID, e)
                    }
                }

                if (!reference) {
                    throw Error(`Unknown genome id: ${genomeID}`)
                }
            }
            return reference
        } else {
            return idOrConfig
        }
    }
}

export default GenomeUtils