import { GenomicRegion } from '../models/genomicRegion.js'
import { igvxhr, StringUtils } from '../../node_modules/igv-utils/src/index.js'

const DEFAULT_SEARCH_CONFIG = {
    timeout: 5000,
    type: "plain",
    url: 'https://igv.org/genomes/locus.php?genome=$GENOME$&name=$FEATURE$',
    coords: 0
}

/**
 * Search for a genomic locus by name or coordinates
 * @param {MinimalBrowser} browser - The browser instance
 * @param {string} string - The search string (locus or gene name)
 * @returns {Promise<GenomicRegion|undefined>}
 */
export async function search(browser, string) {
    if (undefined === string || '' === string.trim()) {
        return undefined
    }

    const locus = string.trim()

    // First try to parse as a locus string (chr:start-end)
    if (locus.includes(':')) {
        try {
            const locusObject = parseLocusString(locus)
            if (locusObject) {
                // Normalize chromosome name and create region
                const normalizedChr = browser.chromosomeInfo.normalize(locusObject.chr)
                return new GenomicRegion(normalizedChr, locusObject.start, locusObject.end)
            }
        } catch (error) {
            console.log('Not a valid locus string, trying feature search:', error.message)
        }
    }

    // If not a locus string, search for feature by name
    const feature = await searchFeatures(browser, locus)
    if (feature) {
        const normalizedChr = browser.chromosomeInfo.normalize(feature.chr)
        return new GenomicRegion(normalizedChr, feature.start, feature.end)
    }

    // If still not found, try whole chromosome name
    if (browser.chromosomeInfo.hasChromosome(locus)) {
        const normalizedChr = browser.chromosomeInfo.normalize(locus)
        const size = browser.chromosomeInfo.getSize(normalizedChr)
        return new GenomicRegion(normalizedChr, 0, size)
    }

    throw new Error(`Could not find locus or feature: ${string}`)
}

/**
 * Search for features in tracks
 * @param {MinimalBrowser} browser
 * @param {string} name - Feature name to search for
 * @returns {Promise<Object|undefined>}
 */
async function searchFeatures(browser, name) {
    const searchConfig = browser.config.searchConfig || DEFAULT_SEARCH_CONFIG

    name = name.toUpperCase()

    // Search in searchable tracks (not yet implemented for minimal browser)
    // const searchableTracks = browser.tracks.filter(t => t.searchable)
    // for (let track of searchableTracks) {
    //     const feature = await track.search(name)
    //     if (feature) {
    //         return feature
    //     }
    // }

    // Try web service search
    if (browser.config && false !== browser.config.search) {
        try {
            const feature = await searchWebService(browser, name, searchConfig)
            return feature
        } catch (error) {
            console.log("Search service not available:", error)
        }
    }

    return undefined
}

/**
 * Search a web service for feature location
 */
async function searchWebService(browser, locus, searchConfig) {
    let path = searchConfig.url.replace("$FEATURE$", locus.toUpperCase())
    if (path.indexOf("$GENOME$") > -1) {
        const genomeId = browser.genome?.id || "hg19"
        path = path.replace("$GENOME$", genomeId)
    }
    
    const options = searchConfig.timeout ? { timeout: searchConfig.timeout } : undefined
    const result = await igvxhr.loadString(path, options)

    return processSearchResult(browser, result, searchConfig)
}

/**
 * Process search results from web service
 */
function processSearchResult(browser, result, searchConfig) {
    let results

    if ('plain' === searchConfig.type) {
        results = parseSearchResults(browser, result)
    } else {
        results = JSON.parse(result)
    }

    if (searchConfig.resultsField) {
        results = results[searchConfig.resultsField]
    }

    if (!results || 0 === results.length) {
        return undefined
    }

    const chromosomeField = searchConfig.chromosomeField || "chromosome"
    const startField = searchConfig.startField || "start"
    const endField = searchConfig.endField || "end"
    const coords = searchConfig.coords || 1

    let result_item
    if (Array.isArray(results)) {
        // Use first result
        result_item = results[0]
    } else {
        result_item = results
    }

    if (!(result_item.hasOwnProperty(chromosomeField) && result_item.hasOwnProperty(startField))) {
        console.error("Search service results must include chromosome and start fields:", result_item)
        return undefined
    }

    const chr = result_item[chromosomeField]
    let start = result_item[startField] - coords
    let end = result_item[endField]
    
    if (undefined === end) {
        end = start + 1
    }

    return { chr, start, end, name: result_item.name }
}

/**
 * Parse the IGV line-oriented (non json) search results.
 * Example: EGFR    chr7:55,086,724-55,275,031    refseq
 */
function parseSearchResults(browser, data) {
    const results = []
    const lines = StringUtils.splitLines(data)

    for (let line of lines) {
        const tokens = line.split("\t")

        if (tokens.length >= 3) {
            const locusTokens = tokens[1].split(":")
            const rangeTokens = locusTokens[1].split("-")
            results.push({
                chromosome: locusTokens[0].trim(),
                start: parseInt(rangeTokens[0].replace(/,/g, ''), 10),
                end: parseInt(rangeTokens[1].replace(/,/g, ''), 10),
                name: tokens[0].toUpperCase()
            })
        }
    }

    return results
}

/**
 * Parse a locus string of the form <chr>:<start>-<end>
 * Returns {chr, start, end} or undefined if not a valid locus string
 */
function parseLocusString(locus) {
    // Remove commas
    const cleaned = locus.replace(/,/g, '')

    // Handle tab-delimited format
    const tabTokens = cleaned.split('\t')
    if (tabTokens.length >= 3) {
        try {
            const chr = tabTokens[0]
            const start = parseInt(tabTokens[1], 10) - 1
            const end = parseInt(tabTokens[2], 10)
            if (!isNaN(start) && !isNaN(end)) {
                return { chr, start, end }
            }
        } catch (e) {
            // Not tab-delimited
        }
    }

    // Parse chr:start-end format
    const colonTokens = cleaned.split(':')
    if (colonTokens.length !== 2) {
        return undefined
    }

    const chr = colonTokens[0]
    const rangeTokens = colonTokens[1].split('-')
    
    if (rangeTokens.length !== 2) {
        return undefined
    }

    const start = parseInt(rangeTokens[0], 10) - 1  // Convert to 0-based
    const end = parseInt(rangeTokens[1], 10)

    if (isNaN(start) || isNaN(end)) {
        return undefined
    }

    return { chr, start, end }
}

export { parseLocusString, searchWebService, searchFeatures }

