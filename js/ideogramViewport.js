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

import IGVGraphics from './igv-canvas.js'
import * as DOMUtils from "./ui/utils/dom-utils.js"
import TrackViewport from "./trackViewport.js"
import { IGVMath } from "../node_modules/igv-utils/src/index.js"

let timer
const toolTipTimeout = 1e4

class IdeogramViewport extends TrackViewport {

    featureCache = new IdeogramFeatureCache()

    constructor(trackView, viewportColumn, referenceFrame, width) {
        super(trackView, viewportColumn, referenceFrame, width)
    }

    initializationHelper() {

        this.canvas = document.createElement('canvas')

        this.canvas.className = 'igv-ideogram-canvas'
        this.viewportElement.appendChild(this.canvas);
        this.ideogram_ctx = this.canvas.getContext('2d')

        // Create the tooltip
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'igv-cytoband-tooltip';
        this.tooltip.style.height = `${this.viewportElement.clientHeight}px`;
        this.viewportElement.appendChild(this.tooltip);

        // Add tooltip for cytoband names
        this.tooltipContent = document.createElement('div');
        this.tooltip.appendChild(this.tooltipContent);
        
        // Initially hide the tooltip
        this.tooltip.style.display = 'none';

        this.addMouseHandlers()
    }

    async getFeatures(chr, start, end, bpPerPixel) {
        if (this.featureCache.containsRange(chr)) {
            return this.featureCache.get(chr)
        } else {
          return this.loadFeatures()
        }
    }

    async loadFeatures() {
        const chr = this.referenceFrame.chr;
        const features = await  this.referenceFrame.genome.getCytobands(chr)
        this.featureCache.set(chr, features)
        return features
    }

    repaint() {

        if (undefined === this.featureCache) {
            return
        }

        const {width, height} = this.viewportElement.getBoundingClientRect()
        IGVGraphics.configureHighDPICanvas(this.ideogram_ctx, width, height)

        const chr = this.referenceFrame.chr
        const features = this.featureCache.get(chr)

        const config =
            {
                context: this.ideogram_ctx,
                pixelWidth: width,
                pixelHeight: height,
                referenceFrame: this.referenceFrame,
                features
            }

        this.trackView.track.draw(config)

    }


    addMouseHandlers() {
        this.addViewportClickHandler(this.viewportElement)

        // Add tooltip when showing contig name
        if (this.trackView.track.showCytobandNames) {
            this.viewportElement.addEventListener('mousemove', this.mouseMove.bind(this))
            this.viewportElement.addEventListener('mouseleave', this.mouseLeave.bind(this))
        }
    }

    mouseMove(event) {
        const {x} = DOMUtils.translateMouseCoordinates(event, this.viewportElement)

        // Get features
        const features = this.featureCache.get(this.referenceFrame.chr)
        if (features) {
            const {width: w} = this.viewportElement.getBoundingClientRect()

            const chrLength = features[features.length - 1].end
            const scale = w / chrLength

            let found = false;
            // Find cytoband that the mouse is over
            for (let i = 0; i < features.length; i++) {
                const cytoband = features[i]
                const start = cytoband.start * scale
                const end = cytoband.end * scale

                // If the mouse is over the cytoband, show the tooltip
                if (x >= start && x <= end) {
                    this.tooltipContent.textContent = cytoband.name;
                    const {width: ww} = this.tooltipContent.getBoundingClientRect()
                    let center = (start + end) / 2 - ww / 2

                    const tooltipLeft = IGVMath.clamp(center, 0, w - ww);
                    this.tooltip.style.left = `${tooltipLeft}px`;

                    // hide tooltip when movement stops
                    clearTimeout(timer);
                    timer = setTimeout(() => {
                        if (this.tooltip) this.tooltip.style.display = "none";
                    }, toolTipTimeout);

                    this.tooltip.style.display = "block";

                    found = true
                    break
                }
            }
            if (found)
                return;
        }

        // If the mouse is not over a cytoband, or there are no features, hide the tooltip
        this.tooltip.style.display = 'none';
    }

    mouseLeave(event) {
        this.tooltip.style.display = 'none';
    }

    addViewportClickHandler(viewport) {

        this.boundClickHandler = clickHandler.bind(this)
        viewport.addEventListener('click', this.boundClickHandler)

        function clickHandler(event) {

            const {xNormalized, width} = DOMUtils.translateMouseCoordinates(event, this.ideogram_ctx.canvas)
            const {bpLength} = this.browser.genome.getChromosome(this.referenceFrame.chr)
            const locusLength = this.referenceFrame.bpPerPixel * width
            const chrCoveragePercentage = locusLength / bpLength

            let xPercentage = xNormalized
            if (xPercentage - (chrCoveragePercentage / 2.0) < 0) {
                xPercentage = chrCoveragePercentage / 2.0
            }

            if (xPercentage + (chrCoveragePercentage / 2.0) > 1.0) {
                xPercentage = 1.0 - chrCoveragePercentage / 2.0
            }

            const ss = Math.round((xPercentage - (chrCoveragePercentage / 2.0)) * bpLength)
            const ee = Math.round((xPercentage + (chrCoveragePercentage / 2.0)) * bpLength)

            this.referenceFrame.start = ss
            this.referenceFrame.end = ee
            this.referenceFrame.bpPerPixel = (ee - ss) / width

            this.browser.updateViews(this.referenceFrame, this.browser.trackViews, true)

        }

    }

    setWidth(width) {
        this.viewportElement.style.width = width + 'px';
    }

    renderSVGContext(context, {deltaX, deltaY}, includeLabel = true) {

        const {width, height} = this.viewportElement.getBoundingClientRect()

        const str = 'ideogram'
        const index = this.browser.referenceFrameList.indexOf(this.referenceFrame)
        const id = `${str}_referenceFrame_${index}_guid_${DOMUtils.guid()}`

        const x = deltaX
        const y = deltaY + this.contentTop
        const yClipOffset = -this.contentTop

        context.saveWithTranslationAndClipRect(id, x, y, width, height, yClipOffset)
        this.trackView.track.draw({
            context,
            pixelWidth: width,
            pixelHeight: height,
            referenceFrame: this.referenceFrame,
            features: this.featureCache.get(this.referenceFrame.chr)
        })
        context.restore()

    }


    startSpinner() {
    }

    stopSpinner() {
    }
}

/**
 * A very simple feature cache.  The smallest chunk of features for ideograms is a whole chromosome
 */
class IdeogramFeatureCache {
    features = new Map()

    containsRange(chr) {
        return this.features.has(chr)
    }

    set(chr, features) {
        this.features.set(chr, features)
    }

    get(chr) {
        return this.features.get(chr)
    }
}

export default IdeogramViewport
