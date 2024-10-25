import {igvxhr, StringUtils} from "../node_modules/igv-utils/src/index.js"


const DEFAULT_SEARCH_CONFIG = {
    timeout: 5000,
    type: "plain",
    url: 'https://igv.org/genomes/locus.php?genome=$GENOME$&name=$FEATURE$',
    coords: 0
}

async function searchFeatures(browser, name) {

    const searchConfig = browser.searchConfig || DEFAULT_SEARCH_CONFIG
    let feature

    name = name.toUpperCase()
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
 * Return an object representing the locus of the given string.  Object is of the form
 * {
 *   chr,
 *   start,
 *   end,
 *   locusSearchString,
 *   gene,
 *   snp
 * }
 * @param browser
 * @param string
 * @returns {Promise<*>}
 */
async function search(browser, string) {

    if (undefined === string || '' === string.trim()) {
        return
    }

    const loci = string.split(' ')

    let list = []

    const searchForLocus = async (locus) => {

        if (locus.trim().toLowerCase() === "all" || locus === "*") {
            if (browser.genome.wholeGenomeView) {
                const wgChr = browser.genome.getChromosome("all")
                return {chr: "all", start: 0, end: wgChr.bpLength}
            } else {
                return undefined
            }
        }

        let locusObject
        let chromosome
        if (locus.includes(":")) {
            locusObject = parseLocusString(locus, browser.isSoftclipped())
            if (locusObject) {
                chromosome = await browser.genome.loadChromosome(locusObject.chr)
            }
        }

        if (!chromosome) {

            // Not a locus string
            locusObject = undefined

            // Not a locus string, search track annotations
            const feature = await searchFeatures(browser, locus)
            if(feature) {
                locusObject = {
                    chr: feature.chr,
                    start: feature.start,
                    end: feature.end,
                    name: (feature.name || locus).toUpperCase(),

                }
            }

            // If still not found assume locus is a chromosome name.
            if (!locusObject) {
                chromosome = await browser.genome.loadChromosome(locus)
                if (chromosome) {
                    locusObject = {chr: chromosome.name}
                }
            }
        }

        // Force load chromosome here (a side effect, but neccessary to do this in an async function so it's available)
        if (locusObject) {
            chromosome = chromosome || await browser.genome.loadChromosome(locusObject.chr)
            locusObject.chr = chromosome.name    // Replace possible alias with canonical name
            if (locusObject.start === undefined && locusObject.end === undefined) {
                locusObject.start = 0
                locusObject.end = chromosome.bpLength
            }
        }

        return locusObject
    }

    for (let locus of loci) {
        const locusObject = await searchForLocus(locus)
        if (locusObject) {
            list.push(locusObject)
        }
    }

    // If nothing is found, consider possibility that loci name itself has spaces
    if (list.length === 0) {
        const locusObject = await searchForLocus(string.replaceAll(' ', '+'))
        if (locusObject) {
            list.push(locusObject)
        }
    }

    return 0 === list.length ? undefined : list
}

/**
 * Parse a locus string of the form <chr>:<start>-<end>.  If string does not parse as a locus return undefined
 *
 * @param locus
 * @param isSoftclipped
 * @returns {{start: number, end: number, chr: *}|undefined|{start: number, chr: *}}
 */
function parseLocusString(locus, isSoftclipped = false) {

    // Check for tab delimited locus string
    const tabTokens = locus.split('\t')
    if (tabTokens.length > 2) {
        // Possibly a tab-delimited locus
        try {
            const chr = tabTokens[0]//  browser.genome.getChromosomeName(tabTokens[0])
            const start = parseInt(tabTokens[1].replace(/,/g, ''), 10) - 1
            const end = parseInt(tabTokens[2].replace(/,/g, ''), 10)
            if (!isNaN(start) && !isNaN(end)) {
                return {chr, start, end}
            }
        } catch (e) {
            // Not a tab delimited locus, apparently, but not really an error as that was a guess
        }
    }

    const a = locus.split(':')
    const locusObject = {chr: a[0]}
    if (a.length > 1) {

        let b = a[1].split('-')
        if (b.length > 2) {
            // Allow for negative coordinates, which is possible if showing alignment soft clips
            if (a[1].startsWith('-')) {
                const i = a[1].indexOf('-', 1)
                if (i > 0) {
                    const t1 = a[1].substring(0, i)
                    const t2 = a[1].substring(i + 1)
                    b = [t1, t2]
                }
            } else {
                return undefined
            }
        }

        let numeric
        numeric = b[0].replace(/,/g, '')
        if (isNaN(numeric)) {
            return undefined
        }

        locusObject.start = parseInt(numeric, 10) - 1
        locusObject.end = locusObject.start + 1

        if (1 === b.length) {
            // Don't clamp coordinates if single coordinate is supplied.
            locusObject.start -= 20
            locusObject.end += 20
        }

        if (2 === b.length) {
            numeric = b[1].replace(/,/g, '')
            if (isNaN(numeric)) {
                return undefined
            } else {
                locusObject.end = parseInt(numeric, 10)
            }

            // Allow negative coordinates only if browser is softclipped, i.e. there is at least alignment track with softclipping on
            if (locusObject.start < 0 && !isSoftclipped) {
                const delta = -extent.start
                locusObject.start += delta
                locusObject.end += delta
            }
        }
    }

    return locusObject

}

async function searchWebService(browser, locus, searchConfig) {

    let path = searchConfig.url.replace("$FEATURE$", locus.toUpperCase())
    if (path.indexOf("$GENOME$") > -1) {
        path = path.replace("$GENOME$", (browser.genome.id ? browser.genome.id : "hg19"))
    }
    const options = searchConfig.timeout ? {timeout: searchConfig.timeout} : undefined
    const result = await igvxhr.loadString(path, options)

    return processSearchResult(browser, result, searchConfig)
}

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
        const type = result.type ? result.type : "gene"
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
                chromosome: browser.genome.getChromosomeName(locusTokens[0].trim()),
                start: parseInt(rangeTokens[0].replace(/,/g, '')),
                end: parseInt(rangeTokens[1].replace(/,/g, '')),
                name: tokens[0].toUpperCase()
            })
        }
    }

    return results

}


// Export some functions for unit testing
export {parseLocusString, searchWebService, searchFeatures}

export default search


