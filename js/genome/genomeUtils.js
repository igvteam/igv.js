import {igvxhr, StringUtils} from "../../node_modules/igv-utils/src/index.js"
import {convertToHubURL} from "../ucsc/ucscUtils.js"
import Hub from "../ucsc/ucscHub.js"

const DEFAULT_GENOMES_URL = "https://igv.org/genomes/genomes.json"
const BACKUP_GENOMES_URL = "https://s3.amazonaws.com/igv.org.genomes/genomes.json"

const GenomeUtils = {

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
            // Backward compatibilityz
            genomeID = idOrConfig.id
        }

        if (genomeID) {
            const knownGenomes = GenomeUtils.KNOWN_GENOMES
            let reference = knownGenomes[genomeID]
            if (!reference) {
                if ((genomeID.startsWith("GCA_") || genomeID.startsWith("GCF_")) && genomeID.length >= 13) {
                    try {
                        const hubURL = convertToHubURL(genomeID)
                        const hub = await Hub.loadHub(hubURL)
                        reference = hub.getGenomeConfig("genes")
                    } catch (e) {
                        console.error(e)
                    }
                }

                if(!reference) {
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
