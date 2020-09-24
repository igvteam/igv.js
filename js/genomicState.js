import {validateLocusExtent} from "./util/igvUtils.js";
import ReferenceFrame from "./referenceFrame.js";
import GtexSelection from "./gtex/gtexSelection";
import {StringUtils} from "igv-utils";

class GenomicState {
    constructor(params) {

        let status
        if (params.browser && params.locus) {
            status = this.isLocusChrNameStartEnd(params.browser, params.locus)
            if (false === status) {
                console.error('ERROR attempting to construct GenomicState')
            }
        } else if (params.browser && params.feature && params.locus) {

            const { chr, start, end } = params.feature

            this.chromosome = params.browser.genome.getChromosome(chr)
            this.locusSearchString = params.locus

            validateLocusExtent(this.chromosome.bpLength, { start, end }, params.browser.minimumBases())

            const viewportWidth = params.browser.calculateViewportWidth(params.browser.genomicStateList.length)
            this.referenceFrame = new ReferenceFrame(params.browser.genome, this.chromosome.name, start, end, (end - start) / viewportWidth)
        } else if (params.browser && params.searchServiceResponse && params.searchConfig) {
            this.processSearchResult(params.browser && params.searchServiceResponse, params.searchConfig)
        }
    }

    isLocusChrNameStartEnd(browser, locus) {

        let status = true

        const a = locus.split(':')

        const chr = a[0]
        const chromosome = browser.genome.getChromosome(chr)
        let numeric
        if (undefined === chromosome) {
            return false;
        } else {

            this.chromosome = chromosome;

            let start = 0;
            let end = chromosome.bpLength;

            if (a.length > 1) {

                const b = a[1].split('-');

                if (b.length > 2) {
                    // Not a locus string
                    status = false
                } else {

                    start = end = undefined;

                    numeric = b[0].replace(/,/g, '');
                    if (isNaN(numeric)) {
                        status = false
                    }

                    start = parseInt(numeric, 10) - 1;

                    if (isNaN(start)) {
                        status = false
                    }

                    if (2 === b.length) {

                        numeric = b[1].replace(/,/g, '');
                        if (isNaN(numeric)) {
                            status = false
                        }

                        end = parseInt(numeric, 10);
                    }

                }

                if (true === status) {

                    validateLocusExtent(this.chromosome.bpLength, { start, end }, browser.minimumBases())

                    this.locusSearchString = locus

                    const viewportWidth = browser.calculateViewportWidth(browser.genomicStateList.length)
                    this.referenceFrame = new ReferenceFrame(browser.genome, chromosome.name, start, end, (end - start) / viewportWidth)
                }



                return status;

            }

        }


    }

    processSearchResult(browser, searchServiceResponse, searchConfig) {

        let results
        if ('plain' === searchConfig.type) {
            results = parseSearchResults(searchServiceResponse.result);
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

            const chr = result[searchConfig.chromosomeField];
            let start = result[searchConfig.startField] - searchConfig.coords;
            let end = result[searchConfig.endField];

            if (undefined === end) {
                end = start + 1;
            }

            if (browser.flanking) {
                start = Math.max(0, start - browser.flanking);
                end += browser.flanking;
            }

            this.chromosome = browser.genome.getChromosome(chr);
            this.locusSearchString = searchServiceResponse.locusSearchString;

            this.selection = new GtexSelection(result[searchConfig.geneField], result[searchConfig.snpField]);

            const viewportWidth = browser.calculateViewportWidth(browser.genomicStateList.length)
            this.referenceFrame = new ReferenceFrame(browser.genome, this.chromosome.name, start, end, (end - start) / viewportWidth)

        }


        /**
         * Parse the igv line-oriented (non json) search results.
         * Example
         *    EGFR    chr7:55,086,724-55,275,031    refseq
         *
         * @param data
         */
        function parseSearchResults(data) {

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
    }
}

export default GenomicState
