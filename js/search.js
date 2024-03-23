import {igvxhr, StringUtils} from "../node_modules/igv-utils/src/index.js"


const DEFAULT_SEARCH_CONFIG = {
    timeout: 5000,
    type: "plain",   // Legacy plain text support -- deprecated
    url: 'https://igv.org/genomes/locus.php?genome=$GENOME$&name=$FEATURE$',
    coords: 0,
    chromosomeField: "chromosome",
    startField: "start",
    endField: "end",
    geneField: "gene",
    snpField: "snp"
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

    let searchConfig = browser.searchConfig || DEFAULT_SEARCH_CONFIG
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
        if(locus.includes(":")) {
            locusObject = parseLocusString(locus, browser.isSoftclipped())
            chromosome = await browser.genome.loadChromosome(locusObject.chr)
        }

        if (!chromosome) {
            locusObject = undefined

            // Not a locus string, search track annotations
            const searchableTracks = browser.tracks.filter(t => t.searchable)
            for (let track of searchableTracks) {
                const feature = await track.search(locus)
                if (feature) {
                    locusObject = {
                        chr: feature.chr,
                        start: feature.start,
                        end: feature.end,
                        gene: feature.name
                    }
                    break
                }
            }

            // If still not found try webservice, if enabled
            if (!locusObject && (browser.config && false !== browser.config.search)) {
                try {
                    locusObject = await searchWebService(browser, locus, searchConfig)
                } catch (error) {
                    console.log("Search service not available " + error)
                }
            }

            // Finally assume string is a chromosome name.
            chromosome = await browser.genome.loadChromosome(locus)
            if(chromosome) {
                locusObject = {chr: chromosome.name}
            }
        }

        // Force load chromosome here (a side effect, but neccessary to do this in an async function so it's available)
        if (locusObject) {
            chromosome = chromosome ||  await browser.genome.loadChromosome(locusObject.chr)
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
 * Parse a locus string of the form <chr>:<start>-<end>
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

    const locusObject = processSearchResult(browser, result, searchConfig)
    return locusObject
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
        if (searchConfig.geneField && type === "gene") {
            locusObject.gene = result[searchConfig.geneField]
        }
        if (searchConfig.snpField && type === "snp") {
            locusObject.snp = result[searchConfig.snpField]
        }

        return locusObject
    }
}

/**
 * Parse the igv line-oriented (non json) search results.
 * Example
 *    EGFR    chr7:55,086,724-55,275,031    refseq
 *
 */
function parseSearchResults(browser, data) {

    const linesTrimmed = []
    const results = []
    const lines = StringUtils.splitLines(data)

    lines.forEach(function (item) {
        if ("" === item) {
            // do nothing
        } else {
            linesTrimmed.push(item)
        }
    })

    linesTrimmed.forEach(function (line) {

        var tokens = line.split("\t"),
            source,
            locusTokens,
            rangeTokens,
            obj

        if (tokens.length >= 3) {

            locusTokens = tokens[1].split(":")
            rangeTokens = locusTokens[1].split("-")
            source = tokens[2].trim()

            obj =
                {
                    gene: tokens[0],
                    chromosome: browser.genome.getChromosomeName(locusTokens[0].trim()),
                    start: parseInt(rangeTokens[0].replace(/,/g, '')),
                    end: parseInt(rangeTokens[1].replace(/,/g, '')),
                    type: ("gtex" === source ? "snp" : "gene")
                }

            results.push(obj)

        }

    })

    return results

}


// Export some functions for unit testing
export {parseLocusString, searchWebService}

export default search


