import {igvxhr, StringUtils} from "../../node_modules/igv-utils/src/index.js"
import {convertToHubURL} from "../ucsc/ucscUtils.js"
import {loadHub} from "../ucsc/hub/hubParser.js"

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

    // Expand a genome id to a reference object, if needed
    expandReference: async function (alert, idOrConfig) {

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
            const knownGenomes = GenomeUtils.KNOWN_GENOMES
            let reference = knownGenomes[genomeID]
            if (!reference) {
                if ((genomeID.startsWith("GCA_") || genomeID.startsWith("GCF_")) && genomeID.length >= 13) {
                    try {
                        const hubURL = convertToHubURL(genomeID)
                        const hub = await loadHub(hubURL)
                        reference = hub.getGenomeConfig(genomeID)
                    } catch (e) {
                        console.error(e)
                    }
                }

                if (!reference) {
                    alert.present(new Error(`Unknown genome id: ${genomeID}`), undefined)
                }
            }
            return reference
        } else {
            return idOrConfig
        }
    }
}

export default GenomeUtils