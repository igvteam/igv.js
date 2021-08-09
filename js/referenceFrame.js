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

import {DOMUtils, IGVMath, StringUtils} from "../node_modules/igv-utils/src/index.js";
import {validateLocusExtent,prettyBasePairNumber} from "./util/igvUtils.js";
import GtexSelection from "./gtex/gtexSelection.js";

// Reference frame classes.  Converts domain coordinates (usually genomic) to pixel coordinates

class ReferenceFrame {

    constructor(genome, chr, start, end, bpPerPixel) {
        this.genome = genome;
        this.chr = chr;

        this.start = start;

        // TODO WARNING THIS IS NOT UPDATED !!!
        this.end = end;

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

        const currentStart = this.start;

        const deltaBP = pixels * this.bpPerPixel

        this.start += deltaBP;
        this.clampStart(viewportWidth);

        this.end += deltaBP;
        const { bpLength } = this.genome.getChromosome(this.chr);
        this.end = Math.min(bpLength, this.end)

        return currentStart !== this.start;
    }

    clampStart(viewportWidth) {
        // clamp left
        const min = this.genome.getChromosome(this.chr).bpStart || 0
        this.start = Math.max(min, this.start);

        // clamp right
        if (viewportWidth) {

            const { bpLength } = this.genome.getChromosome(this.chr);
            const maxStart = bpLength - (viewportWidth * this.bpPerPixel);

            if (this.start > maxStart) {
                this.start = maxStart;
            }
        }
    }

    async zoomWithScaleFactor(browser, scaleFactor, viewportWidth, centerBPOrUndefined) {

        const centerBP = undefined === centerBPOrUndefined ? (this.start + this.toBP(viewportWidth / 2.0)) : centerBPOrUndefined

        // save initial start and bpp
        const { start, bpPerPixel } = this.start

        const { bpLength } = this.getChromosome()
        const bppThreshold = scaleFactor < 1.0 ? browser.minimumBases() / viewportWidth : bpLength / viewportWidth

        // update bpp
        if (scaleFactor < 1.0) {
            this.bpPerPixel = Math.max(this.bpPerPixel * scaleFactor, bppThreshold)
        } else {
            this.bpPerPixel = Math.min(this.bpPerPixel * scaleFactor, bppThreshold)
        }

        // update start and end
        const widthBP = this.bpPerPixel * viewportWidth
        this.start = centerBP - 0.5 * widthBP
        this.clampStart(viewportWidth)

        this.end = this.start + widthBP

        const viewChanged = start !== this.start || bpPerPixel !== this.bpPerPixel
        if (viewChanged) {
            await browser.updateViews(this)
        }

    }

    getChromosome() {
        return this.genome.getChromosome(this.chr)
    }

    getMultiLocusLabel(pixels) {
        const space = '&nbsp &nbsp &nbsp'
        const ss = Math.floor(this.start) + 1
        const ee = Math.round(this.start + this.bpPerPixel * pixels)
        return `${ this.chr }${ space }${ prettyBasePairNumber(ee-ss) }`
    }

    getPresentationLocusComponents(pixels) {

        if ('all' === this.chr) {
            return { chr: this.chr }
        } else {
            const ss = StringUtils.numberFormatter(Math.floor(this.start) + 1)
            const ee = StringUtils.numberFormatter( Math.round(this.start + this.bpPerPixel * pixels) )

            return { chr: this.chr, start: ss, end: ee }
        }

    }

    getPresentionLocus(pixels) {
        const { chr, start, end } = this.getPresentationLocusComponents(pixels)
        return 'all' === chr ? chr : `${ chr }:${ start }-${ end }`
    }

    description(blurb) {
        console.log(` ${ blurb || '' } referenceFrame - ${ this.chr } bpp ${ this.bpPerPixel.toFixed(3) } start ${ StringUtils.numberFormatter(Math.round(this.start)) } end ${ StringUtils.numberFormatter(Math.round(this.end)) } `)
    }
}

function createReferenceFrameList(loci, genome, browserFlanking, minimumBases, viewportWidth) {

    return loci.map(locus => {

        // If a flanking region is defined, and the search object is a symbol ("gene") type, adjust start and end
        if (browserFlanking && locus.gene) {
            locus.start = Math.max(0, locus.start - browserFlanking)
            locus.end += browserFlanking
        }

        // Validate the range.  This potentionally modifies start & end of locus.
        const chromosome = genome.getChromosome(locus.chr)
        validateLocusExtent(chromosome.bpLength, locus, minimumBases)

        const referenceFrame = new ReferenceFrame(genome,
            locus.chr,
            locus.start,
            locus.end,
            (locus.end - locus.start) / viewportWidth)

        referenceFrame.locusSearchString = locus.locusSearchString

        // GTEX hack
        if (locus.gene || locus.snp) {
            referenceFrame.selection = new GtexSelection(locus.gene, locus.snp);
        }

        return referenceFrame
    });
}

function adjustReferenceFrame(scaleFactor, referenceFrame, viewportWidth, alignmentStart, alignmentLength) {

    referenceFrame.bpPerPixel *= scaleFactor

    const alignmentEE = alignmentStart + alignmentLength
    const alignmentCC = (alignmentStart + alignmentEE) / 2

    referenceFrame.start = alignmentCC - (referenceFrame.bpPerPixel * (viewportWidth / 2))
    referenceFrame.end = referenceFrame.start + (referenceFrame.bpPerPixel * viewportWidth)
    referenceFrame.locusSearchString = referenceFrame.getPresentionLocus(viewportWidth)
}

function createReferenceFrameWithAlignment(genome, chromosomeName, bpp, viewportWidth, alignmentStart, alignmentLength) {

    const alignmentEE = alignmentStart + alignmentLength;
    const alignmentCC = (alignmentStart + alignmentEE) / 2;

    const ss = alignmentCC - (bpp * (viewportWidth / 2));
    const ee = ss + (bpp * viewportWidth);

    const referenceFrame = new ReferenceFrame(genome, chromosomeName, ss, ee, bpp)

    referenceFrame.locusSearchString = referenceFrame.getPresentionLocus(viewportWidth)

    return referenceFrame
}

export {createReferenceFrameList, adjustReferenceFrame, createReferenceFrameWithAlignment}
export default ReferenceFrame;
