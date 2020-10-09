/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import { isLocusString, searchWebService } from './browser.js'
import {StringUtils,DOMUtils} from "../node_modules/igv-utils/src/index.js";
import {validateLocusExtent} from "./util/igvUtils.js";
import GtexSelection from "./gtex/gtexSelection.js";

// Reference frame classes.  Converts domain coordinates (usually genomic) to pixel coordinates

const ReferenceFrame = function (genome, chrName, start, end, bpPerPixel) {
    this.genome = genome;
    this.chrName = chrName;
    this.start = start;
    this.initialEnd = end;                 // TODO WARNING THIS IS NOT UPDATED !!!
    this.initialStart = start;
    this.bpPerPixel = bpPerPixel;
    this.id = DOMUtils.guid()

};

ReferenceFrame.prototype.calculateEnd = function (pixels) {
    return this.start + this.bpPerPixel * pixels;
};

ReferenceFrame.prototype.calculateBPP = function (end, pixels) {
    return (end - this.start) / pixels;
};

ReferenceFrame.prototype.set = function (json) {
    this.chrName = json.chrName;
    this.start = json.start;
    this.bpPerPixel = json.bpPerPixel;
};

ReferenceFrame.prototype.toPixels = function (bp) {
    return bp / this.bpPerPixel;
};

ReferenceFrame.prototype.toBP = function (pixels) {
    return this.bpPerPixel * pixels;
};

/**
 * Shift frame by stated pixels.  Return true if view changed, false if not.
 * @param pixels
 * @param viewportWidth
 */
ReferenceFrame.prototype.shiftPixels = function (pixels, viewportWidth) {
    const start = this.start;
    this.start += pixels * this.bpPerPixel;
    this.clamp(viewportWidth);
    return start !== this.start;
};

ReferenceFrame.prototype.clamp = function (viewportWidth) {
    // clamp left
    const min = this.genome.getChromosome(this.chrName).bpStart || 0
    this.start = Math.max(min, this.start);

    // clamp right
    if (viewportWidth) {

        var chromosome = this.genome.getChromosome(this.chrName);
        var maxEnd = chromosome.bpLength;
        var maxStart = maxEnd - (viewportWidth * this.bpPerPixel);

        if (this.start > maxStart) {
            this.start = maxStart;
        }
    }
}

ReferenceFrame.prototype.getChromosome = function () {
    return this.genome.getChromosome(this.chrName)
}

ReferenceFrame.prototype.presentLocus = function(pixels) {

    if ('all' === this.chrName) {
        return this.chrName
    } else {
        const ss = StringUtils.numberFormatter(Math.floor(this.start) + 1);
        const ee = StringUtils.numberFormatter(Math.round(this.start + this.bpPerPixel * pixels));
        return `${ this.chrName }:${ ss }-${ ee }`
    }

}

async function createReferenceFrameList(browser, loci) {

    const viewportWidth = browser.calculateViewportWidth(loci.length)

    let searchConfig = browser.searchConfig;
    let list = [];

    // Try locus string first  (e.g.  chr1:100-200)
    for (let locus of loci) {

        const candidate = isLocusString(browser, locus)
        if (candidate) {
            candidate.viewportWidth = viewportWidth
            const referenceFrame = createReferenceFrame(candidate)
            list.push(referenceFrame)
        } else {
            const feature = browser.featureDB[ locus.toUpperCase() ]
            if (feature) {
                const referenceFrame = createReferenceFrame({ browser: browser, feature, locus, viewportWidth })
                list.push(referenceFrame)
            } else {
                // Try webservice
                let searchServiceResponse = await searchWebService(browser, locus, searchConfig)
                const referenceFrame = createReferenceFrame({ browser: browser, searchServiceResponse, searchConfig, viewportWidth })
                list.push(referenceFrame)
            }
        }

    }

    return list;

}

function createReferenceFrame(params) {

    let referenceFrame = undefined

    if (params.browser && params.chr) {
        referenceFrame = initializeWithLocus(params)
    } else if (params.browser && params.feature && params.locus) {

        const { chr, start, end } = params.feature

        const chromosome = params.browser.genome.getChromosome(chr)
        validateLocusExtent(chromosome.bpLength, { start, end }, params.browser.minimumBases())

        referenceFrame = new ReferenceFrame(params.browser.genome, chr, start, end, (end - start) / params.viewportWidth)
        referenceFrame.locusSearchString = params.locus

    } else if (params.browser && params.searchServiceResponse && params.searchConfig) {

        referenceFrame = processSearchResult(params.browser, params.searchServiceResponse, params.searchConfig, params.viewportWidth)
    } else if (params.referenceFrame) {
        referenceFrame = params.referenceFrame
        referenceFrame.locusSearchString = referenceFrame.presentLocus(params.viewportWidth)
    }

    return referenceFrame
}

function initializeWithLocus(params) {

    const chromosome = params.browser.genome.getChromosome(params.chr)
    validateLocusExtent(chromosome.bpLength, { start: params.start, end: params.end }, params.browser.minimumBases())

    const referenceFrame = new ReferenceFrame(params.browser.genome, params.chr, params.start, params.end, (params.end - params.start) / params.viewportWidth)
    referenceFrame.locusSearchString = params.locus
    return referenceFrame
}

function processSearchResult(browser, searchServiceResponse, searchConfig, viewportWidth) {

    let results

    if ('plain' === searchConfig.type) {
        results = parseSearchResults(browser, searchServiceResponse.result)
    } else {
        results = JSON.parse(searchServiceResponse.result)
    }

    if (searchConfig.resultsField) {
        results = results[searchConfig.resultsField]
    }

    if (!results || 0 === results.length) {
        console.error('ERROR attempting to construct ReferenceFrame')
        return undefined
    } else {

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

        if (!(result.hasOwnProperty(searchConfig.chromosomeField) && (result.hasOwnProperty(searchConfig.startField)))) {
            console.error("Search service results must include chromosome and start fields: " + result)
        }

        let start = result[searchConfig.startField] - searchConfig.coords
        let end = result[searchConfig.endField]

        if (undefined === end) {
            end = start + 1
        }

        if (browser.flanking) {
            start = Math.max(0, start - browser.flanking)
            end += browser.flanking
        }

        const chromosome = browser.genome.getChromosome(result[ searchConfig.chromosomeField ])
        const referenceFrame = new ReferenceFrame(browser.genome, chromosome.name, start, end, (end - start) / viewportWidth)

        referenceFrame.locusSearchString = searchServiceResponse.locusSearchString
        referenceFrame.gene = result.gene
        referenceFrame.selection = new GtexSelection(result[searchConfig.geneField], result[searchConfig.snpField])
        return referenceFrame
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


function adjustReferenceFrame(referenceFrame, viewportWidth, alignmentStart, alignmentLength) {

    const alignmentEE = alignmentStart + alignmentLength
    const alignmentCC = (alignmentStart + alignmentEE) / 2

    referenceFrame.start = alignmentCC - (referenceFrame.bpPerPixel * (viewportWidth / 2))
    referenceFrame.initialEnd = referenceFrame.start + (referenceFrame.bpPerPixel * viewportWidth)
    referenceFrame.locusSearchString = referenceFrame.presentLocus(viewportWidth)

}

function createReferenceFrameWithAlignment(genome, chromosomeName, bpp, viewportWidth, alignmentStart, alignmentLength) {

    const alignmentEE = alignmentStart + alignmentLength;
    const alignmentCC = (alignmentStart + alignmentEE) / 2;

    const ss = alignmentCC - (bpp * (viewportWidth / 2));
    const ee = ss + (bpp * viewportWidth);

    const referenceFrame = new ReferenceFrame(genome, chromosomeName, ss, ee, bpp)
    referenceFrame.locusSearchString = referenceFrame.presentLocus(viewportWidth)

    return referenceFrame
}

export { createReferenceFrameList, adjustReferenceFrame, createReferenceFrameWithAlignment }
export default ReferenceFrame;
