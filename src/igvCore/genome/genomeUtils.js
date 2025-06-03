import {igvxhr} from 'igv-utils'

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
            GenomeUtils.KNOWN_GENOMES = table
        }
    },

    isWholeGenomeView: function (chr) {
        return 'all' === chr.toLowerCase()
    }
}

export default GenomeUtils
