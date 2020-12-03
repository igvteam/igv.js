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

import {DOMUtils, StringUtils} from "../node_modules/igv-utils/src/index.js";
import {validateLocusExtent} from "./util/igvUtils.js";
import GtexSelection from "./gtex/gtexSelection.js";

// Reference frame classes.  Converts domain coordinates (usually genomic) to pixel coordinates

class ReferenceFrame {

    constructor(genome, chr, start, end, bpPerPixel) {
        this.genome = genome;
        this.chr = chr;
        this.start = start;
        this.initialEnd = end;                 // TODO WARNING THIS IS NOT UPDATED !!!
        this.initialStart = start;
        this.bpPerPixel = bpPerPixel;
        this.id = DOMUtils.guid()
    }


    calculateEnd(pixels) {
        return this.start + this.bpPerPixel * pixels;
    }

    calculateBPP(end, pixels) {
        return (end - this.start) / pixels;
    }

    set(json) {
        this.chr = json.chr;
        this.start = json.start;
        this.bpPerPixel = json.bpPerPixel;
    }

    toPixels(bp) {
        return bp / this.bpPerPixel;
    }

    toBP(pixels) {
        return this.bpPerPixel * pixels;
    }

    /**
     * Shift frame by stated pixels.  Return true if view changed, false if not.
     * @param pixels
     * @param viewportWidth
     */
    shiftPixels(pixels, viewportWidth) {
        const start = this.start;
        this.start += pixels * this.bpPerPixel;
        this.clamp(viewportWidth);
        return start !== this.start;
    }

    clamp(viewportWidth) {
        // clamp left
        const min = this.genome.getChromosome(this.chr).bpStart || 0
        this.start = Math.max(min, this.start);

        // clamp right
        if (viewportWidth) {

            var chromosome = this.genome.getChromosome(this.chr);
            var maxEnd = chromosome.bpLength;
            var maxStart = maxEnd - (viewportWidth * this.bpPerPixel);

            if (this.start > maxStart) {
                this.start = maxStart;
            }
        }
    }

    getChromosome() {
        return this.genome.getChromosome(this.chr)
    }

    presentLocus(pixels) {

        if ('all' === this.chr) {
            return this.chr
        } else {
            const ss = StringUtils.numberFormatter(Math.floor(this.start) + 1);
            const ee = StringUtils.numberFormatter(Math.round(this.start + this.bpPerPixel * pixels));
            return `${this.chr}:${ss}-${ee}`
        }

    }
}

function createReferenceFrameList(browser, loci) {

    const viewportWidth = browser.calculateViewportWidth(loci.length)
    return loci.map(locusObject => {

        // If a flanking region is defined, and the search object is a symbol ("gene") type, adjust start and end
        if (browser.flanking && locusObject.gene) {
            locusObject.start = Math.max(0, locusObject.start - browser.flanking)
            locusObject.end += browser.flanking
        }

        // Validate the range.  This potentionally modifies start & end of locusObject.
        const chromosome = browser.genome.getChromosome(locusObject.chr)
        validateLocusExtent(chromosome.bpLength, locusObject, browser.minimumBases())

        const referenceFrame = new ReferenceFrame(
            browser.genome,
            locusObject.chr,
            locusObject.start,
            locusObject.end,
            (locusObject.end - locusObject.start) / viewportWidth)

        referenceFrame.locusSearchString = locusObject.locusSearchString

        // GTEX hack
        if (locusObject.gene || locusObject.snp) {
            referenceFrame.selection = new GtexSelection(locusObject.gene, locusObject.snp);
        }

        return referenceFrame
    });
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

export {createReferenceFrameList, adjustReferenceFrame, createReferenceFrameWithAlignment}
export default ReferenceFrame;
