import igvxhr from "./igvxhr.js"
import {StringUtils} from "../node_modules/igv-utils/src/index.js";

async function search(browser, string) {

    if (undefined === string || '' === string.trim()) {
        return
    }

    if (string && string.trim().toLowerCase() === "all" || string === "*") {
        string = "all";
    }

    const loci = string.split(' ')

    let searchConfig = browser.searchConfig;
    let list = [];

    const searchLocus = async (locus) => {
        let locusObject = parseLocusString(browser, locus)

        if (!locusObject) {
            locusObject = browser.featureDB[locus.toUpperCase()]
        }

        if (!locusObject) {
            locusObject = await searchWebService(browser, locus, searchConfig)
        }
        return locusObject
    }

    for (let locus of loci) {
        const locusObject = await searchLocus(locus)
        if (locusObject) {
            locusObject.locusSearchString = locus;
            list.push(locusObject);
        }
    }

    // If nothing is found, consider possibility that loci name itself has spaces
    if (list.length === 0) {
        const locusObject = await searchLocus(string);
        if (locusObject) {
            locusObject.locusSearchString = string;
            list.push(locusObject);
        }
    }


    return 0 === list.length ? undefined : list;
}

function parseLocusString(browser, locus) {

    const a = locus.split(':')
    const chr = a[0]

    if ('all' === chr && browser.genome.getChromosome(chr)) {
        return {chr, start: 0, end: browser.genome.getChromosome(chr).bpLength}

    } else if (undefined === browser.genome.getChromosome(chr)) {
        return undefined

    } else {
        const queryChr = browser.genome.getChromosomeName(chr);
        const extent = {
            chr: queryChr,
            start: 0,
            end: browser.genome.getChromosome(chr).bpLength
        }

        if (a.length > 1) {

            const b = a[1].split('-');
            if (b.length > 2) {
                return undefined;

            } else {

                let numeric
                numeric = b[0].replace(/,/g, '')
                if (isNaN(numeric)) {
                    return undefined;
                }

                extent.start = parseInt(numeric, 10) - 1;
                extent.end = extent.start + 1;

                if (1 === b.length) {
                    extent.start -= 20;
                    extent.end += 20;
                }

                if (2 === b.length) {
                    numeric = b[1].replace(/,/g, '')
                    if (isNaN(numeric)) {
                        return undefined;
                    } else {
                        extent.end = parseInt(numeric, 10)
                    }
                }
            }
        }

        return extent;
    }
}

async function searchWebService(browser, locus, searchConfig) {

    let path = searchConfig.url.replace("$FEATURE$", locus.toUpperCase());
    if (path.indexOf("$GENOME$") > -1) {
        path = path.replace("$GENOME$", (browser.genome.id ? browser.genome.id : "hg19"));
    }
    const result = await igvxhr.loadString(path);

    const locusObject = processSearchResult(browser, result, searchConfig);
    if(locusObject) {
        locusObject.locusSearchString = locus;
    }
    return locusObject;
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

        const chromosomeField = searchConfig.chromosomeField || "chromosome";
        const startField = searchConfig.startField || "start";
        const endField = searchConfig.endField || "end";
        const coords = searchConfig.coords || 1;


        let result;
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

        const chrResult = result[chromosomeField];
        const chromosome = browser.genome.getChromosome(chrResult);
        if (!chromosome) {
            return undefined;
        }
        const chr = chromosome.name;

        let start = result[startField] - coords
        let end = result[endField]
        if (undefined === end) {
            end = start + 1
        }

        const locusObject = {chr, start, end};

        // Some GTEX hacks
        const type = result.type ? result.type : "gene";
        if (searchConfig.geneField && type === "gene") {
            locusObject.gene = result[searchConfig.geneField];
        }
        if (searchConfig.snpField && type === "snp") {
            locusObject.snp = result[searchConfig.snpField];
        }

        return locusObject;
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
    const lines = StringUtils.splitLines(data);

    lines.forEach(function (item) {
        if ("" === item) {
            // do nothing
        } else {
            linesTrimmed.push(item);
        }
    });

    linesTrimmed.forEach(function (line) {

        var tokens = line.split("\t"),
            source,
            locusTokens,
            rangeTokens,
            obj;

        if (tokens.length >= 3) {

            locusTokens = tokens[1].split(":");
            rangeTokens = locusTokens[1].split("-");
            source = tokens[2].trim();

            obj =
                {
                    gene: tokens[0],
                    chromosome: browser.genome.getChromosomeName(locusTokens[0].trim()),
                    start: parseInt(rangeTokens[0].replace(/,/g, '')),
                    end: parseInt(rangeTokens[1].replace(/,/g, '')),
                    type: ("gtex" === source ? "snp" : "gene")
                };

            results.push(obj);

        }

    });

    return results;

}

// Export some functions for unit testing
export {parseLocusString, searchWebService}

export default search


