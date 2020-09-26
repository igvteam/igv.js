import {StringUtils} from "../node_modules/igv-utils/src/index.js";
import {validateLocusExtent} from "./util/igvUtils.js";
import ReferenceFrame from "./referenceFrame.js";
import GtexSelection from "./gtex/gtexSelection.js";

class GenomicState {

    constructor(params) {

        if (params.browser && params.chr) {
            this.initializeWithLocus(params)
        } else if (params.browser && params.feature && params.locus) {

            const { chr, start, end } = params.feature

            const chromosome = params.browser.genome.getChromosome(chr)
            validateLocusExtent(chromosome.bpLength, { start, end }, params.browser.minimumBases())

            this.referenceFrame = new ReferenceFrame(params.browser.genome, chr, start, end, (end - start) / params.viewportWidth)

            this.locusSearchString = params.locus

        } else if (params.browser && params.searchServiceResponse && params.searchConfig) {

            this.processSearchResult(params.browser, params.searchServiceResponse, params.searchConfig, params.viewportWidth)
        } else if (params.referenceFrame) {
            this.referenceFrame = params.referenceFrame
            this.locusSearchString = this.referenceFrame.presentLocus(params.viewportWidth)
        }

    }

    initializeWithLocus(params) {
        const chromosome = params.browser.genome.getChromosome(params.chr)
        validateLocusExtent(chromosome.bpLength, { start: params.start, end: params.end }, params.browser.minimumBases())

        this.referenceFrame = new ReferenceFrame(params.browser.genome, params.chr, params.start, params.end, (params.end - params.start) / params.viewportWidth)
        this.locusSearchString = params.locus
    }

    processSearchResult(browser, searchServiceResponse, searchConfig, viewportWidth) {

        let results
        if ('plain' === searchConfig.type) {
            results = parseSearchResults(browser, searchServiceResponse.result);
        } else {
            results = JSON.parse(searchServiceResponse.result);
        }

        if (searchConfig.resultsField) {
            results = results[searchConfig.resultsField];
        }

        if (!results || 0 === results.length) {
            console.error('ERROR attempting to construct GenomicState')
        } else {

            let result;
            if (Array.isArray(results)) {
                // Ignoring all but first result for now
                // TODO -- present all and let user select if results.length > 1
                result = results[0];
            } else {
                // When processing search results from Ensembl REST API
                // Example: https://rest.ensembl.org/lookup/symbol/macaca_fascicularis/BRCA2?content-type=application/json
                result = results;
            }

            if (!(result.hasOwnProperty(searchConfig.chromosomeField) && (result.hasOwnProperty(searchConfig.startField)))) {
                console.error("Search service results must include chromosome and start fields: " + result);
            }

            this.gene = result.gene
            const chromosome = browser.genome.getChromosome(result[ searchConfig.chromosomeField ]);
            this.locusSearchString = searchServiceResponse.locusSearchString;
            this.selection = new GtexSelection(result[searchConfig.geneField], result[searchConfig.snpField]);

            let start = result[searchConfig.startField] - searchConfig.coords;
            let end = result[searchConfig.endField];

            if (undefined === end) {
                end = start + 1;
            }

            if (browser.flanking) {
                start = Math.max(0, start - browser.flanking);
                end += browser.flanking;
            }

            this.referenceFrame = new ReferenceFrame(browser.genome, chromosome.name, start, end, (end - start) / viewportWidth)

        }
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

export default GenomicState
