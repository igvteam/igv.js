// Lazy import to avoid circular dependency
import {igvxhr, StringUtils} from "../node_modules/igv-utils/src/index.js"

/**
 * Search for a feature by name across various data sources
 * This module is separate to avoid circular dependencies between search.js and hgvs.js
 */

const DEFAULT_SEARCH_CONFIG = {
    timeout: 5000,
    type: "plain",
    url: 'https://igv.org/genomes/locus.php?genome=$GENOME$&name=$FEATURE$',
    coords: 0
}

/**
 * Search for a feature by name in MANE transcripts, searchable tracks, and web services
 * @param {Object} browser - The IGV browser instance
 * @param {string} name - The feature name to search for
 * @returns {Promise<Object|undefined>} The found feature or undefined
 */
async function searchFeatures(browser, name) {

    const searchConfig = browser.searchConfig || DEFAULT_SEARCH_CONFIG
    let feature

    name = name.toUpperCase()

    // Search MANE transcripts first, if available
    feature = await browser.genome.getManeTranscript(name)
    if (feature) {
        return feature
    }

    const searchableTracks = browser.tracks.filter(t => t.searchable)
    for (let track of searchableTracks) {
        const feature = await track.search(name)
        if (feature) {
            return feature
        }
    }

    // If still not found try webservice, if enabled
    if (browser.config && false !== browser.config.search) {
        try {
            feature = await searchWebService(browser, name, searchConfig)
            return feature    // Might be undefined
        } catch (error) {
            console.log("Search service not available " + error)
        }
    }

}

/**
 * Search for a feature using a web service
 * @param {Object} browser - The IGV browser instance
 * @param {string} locus - The locus to search for
 * @param {Object} searchConfig - Search configuration
 * @returns {Promise<Object|undefined>} The search result
 */
async function searchWebService(browser, locus, searchConfig) {

    let path = searchConfig.url.replace("$FEATURE$", locus.toUpperCase())
    if (path.indexOf("$GENOME$") > -1) {
        path = path.replace("$GENOME$", (browser.genome.id ? browser.genome.id : "hg19"))
    }
    const options = searchConfig.timeout ? {timeout: searchConfig.timeout} : undefined
    const result = await igvxhr.loadString(path, options)

    return await processSearchResult(browser, result, searchConfig)
}

/**
 * Process search results from web service
 * @param {Object} browser - The IGV browser instance
 * @param {string} result - The raw result from the web service
 * @param {Object} searchConfig - Search configuration
 * @returns {Promise<Object|undefined>} The processed search result
 */
async function processSearchResult(browser, result, searchConfig) {

    let results

    if ('plain' === searchConfig.type) {
        results = await parseSearchResults(browser, result)
    } else {
        results = JSON.parse(result)
    }

    if (searchConfig.resultsField) {
        results = results[searchConfig.resultsField]
    }

    if (!results || 0 === results.length) {
        return undefined

    } else {

        const chromosomeField = searchConfig.chromosomeField || "chromosome"
        const startField = searchConfig.startField || "start"
        const endField = searchConfig.endField || "end"
        const coords = searchConfig.coords || 1


        let result
        if (Array.isArray(results)) {
            // Ignoring all but first result for now
            // TODO -- present all and let user select if results.length > 1
            result = results[0]
        } else {
            // When processing search results from Ensembl REST API
            // Example: https://rest.ensembl.org/lookup/symbol/macaca_fascicularis/BRCA2?content-type=application/json
            result = results
        }

        if (!(result.hasOwnProperty(chromosomeField) && (result.hasOwnProperty(startField)))) {
            console.error("Search service results must include chromosome and start fields: " + result)
        }

        const chr = result[chromosomeField]
        let start = result[startField] - coords
        let end = result[endField]
        if (undefined === end) {
            end = start + 1
        }

        const locusObject = {chr, start, end}

        // Some GTEX hacks
        if (searchConfig.geneField && searchConfig.snpField) {
            const name = result[searchConfig.geneField] || result[searchConfig.snpField]  // Should never have both
            if (name) locusObject.name = name.toUpperCase()
        }

        return locusObject
    }
}

/**
 * Parse the igv line-oriented (non json) search results.
 * NOTE:  currently, and probably permanently,  this will always be a single line
 * Example
 *    EGFR    chr7:55,086,724-55,275,031    refseq
 *
 * @param {Object} browser - The IGV browser instance
 * @param {string} data - The raw search result data
 * @returns {Array} Array of parsed search results
 */
async function parseSearchResults(browser, data) {

    const results = []
    const lines = StringUtils.splitLines(data)

    for (let line of lines) {

        const tokens = line.split("\t")

        if (tokens.length >= 3) {
            const locusTokens = tokens[1].split(":")
            const rangeTokens = locusTokens[1].split("-")
            results.push({
                chromosome: browser.genome.getChromosomeName(locusTokens[0].trim()),
                start: parseInt(rangeTokens[0].replace(/,/g, '')),
                end: parseInt(rangeTokens[1].replace(/,/g, '')),
                name: tokens[0].toUpperCase()
            })
        }
    }

    return results

}

export {searchFeatures, searchWebService}

