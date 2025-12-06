import {igvxhr, StringUtils} from "../node_modules/igv-utils/src/index.js"
import {HGVS} from "./genome/hgvs.js"
import {searchFeatures, searchWebService} from "./searchFeatures.js"

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

        if (HGVS.isValidHGVS(locus)) {
            const hgvsResult = await HGVS.search(locus, browser)
            if (hgvsResult) {
                return hgvsResult
            }
        }

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
            if (feature) {
                locusObject = {
                    chr: feature.chr,
                    start: feature.start,
                    end: feature.end,
                    name: (feature.name || locus).toUpperCase()

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


// Export some functions for unit testing
export {parseLocusString, searchWebService, searchFeatures}

export default search


