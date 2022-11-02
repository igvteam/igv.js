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

import $ from "./vendor/jquery-3.3.1.slim.js"
import IGVGraphics from './igv-canvas.js'
import {DOMUtils} from "../node_modules/igv-utils/src/index.js"
import TrackViewport from "./trackViewport.js"

class IdeogramViewport extends TrackViewport {

    constructor(trackView, viewportColumn, referenceFrame, width) {
        super(trackView, viewportColumn, referenceFrame, width)
    }

    initializationHelper() {

        this.canvas = document.createElement('canvas')
        this.canvas.className = 'igv-ideogram-canvas'
        //this.$content.append($(this.canvas))
        this.$viewport.append($(this.canvas))
        this.ideogram_ctx = this.canvas.getContext('2d')

        this.addMouseHandlers()
    }

    addMouseHandlers() {
        this.addViewportClickHandler(this.$viewport.get(0))
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
        this.$viewport.width(width)
    }

    drawSVGWithContext(context, width, height, id, x, y, yClipOffset) {

        context.saveWithTranslationAndClipRect(id, x, y, width, height, yClipOffset)

        this.trackView.track.draw({
            context,
            referenceFrame: this.referenceFrame,
            pixelWidth: width,
            pixelHeight: height
        })

        context.restore()
    }

    repaint() {
        this.draw({referenceFrame: this.referenceFrame})
    }

    draw({referenceFrame}) {

        IGVGraphics.configureHighDPICanvas(this.ideogram_ctx, this.$viewport.width(), this.$viewport.height())

        this.trackView.track.draw({
            context: this.ideogram_ctx,
            referenceFrame,
            pixelWidth: this.$viewport.width(),
            pixelHeight: this.$viewport.height()
        })
    }

    startSpinner() {
    }

    stopSpinner() {
    }

}

export default IdeogramViewport
