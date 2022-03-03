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
import {viewportColumnManager} from './viewportColumnManager.js'

class IdeogramViewport extends TrackViewport {

    constructor(trackView, viewportColumn, referenceFrame, width) {
        super(trackView, viewportColumn, referenceFrame, width)
    }

    initializationHelper() {

        this.$ideogramCanvas = $('<canvas>', {class: 'igv-ideogram-canvas'})
        this.$ideogramCanvas.insertBefore(this.$canvas)

        const canvas = this.$ideogramCanvas.get(0)
        this.ideogram_ctx = canvas.getContext('2d')

        this.$canvas.remove()
        this.canvas = undefined
        this.ctx = undefined

        this.addMouseHandlers()

    }

    addMouseHandlers() {
        this.addBrowserObserver()
        this.addViewportClickHandler(this.$viewport.get(0))
    }

    removeMouseHandlers() {
        this.removeBrowserObserver()
        this.removeViewportClickHandler(this.$viewport.get(0))

    }

    addBrowserObserver() {

        function observerHandler(referenceFrameList) {
            const column = this.$viewport.get(0).parentElement
            if (null !== column) {
                const index = viewportColumnManager.indexOfColumn(this.browser.columnContainer, column)
                // console.log(`ideogram-viewport - locus-change-handler index(${ index }) ${ referenceFrameList[ index ].getLocusString() } ${ Date.now() } `)
                this.update(this.ideogram_ctx, this.$viewport.width(), this.$viewport.height(), referenceFrameList[ index ])
            }
        }

        this.boundObserverHandler = observerHandler.bind(this)
        this.browser.on('locuschange', this.boundObserverHandler)
    }

    removeBrowserObserver() {
        this.browser.off('locuschange', this.boundObserverHandler)
    }

    addViewportClickHandler(viewport) {

        function clickHandler(event) {

            const column = viewport.parentElement
            const index = viewportColumnManager.indexOfColumn(this.browser.columnContainer, column)
            const referenceFrame = this.browser.referenceFrameList[ index ]

            const {xNormalized, width} = DOMUtils.translateMouseCoordinates(event, this.ideogram_ctx.canvas)
            const {bpLength} = this.browser.genome.getChromosome(referenceFrame.chr)
            const locusLength = referenceFrame.bpPerPixel * width
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

            referenceFrame.start = ss
            referenceFrame.end = ee
            referenceFrame.bpPerPixel = (ee - ss) / width

            this.browser.updateViews(referenceFrame, this.browser.trackViews, true)

        }

        this.boundClickHandler = clickHandler.bind(this)
        viewport.addEventListener('click', this.boundClickHandler)

    }

    removeViewportClickHandler(viewport) {
        viewport.removeEventListener('click', this.boundClickHandler)
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

    update(context, pixelWidth, pixelHeight, referenceFrame) {
        this.$canvas.hide()
        IGVGraphics.configureHighDPICanvas(context, pixelWidth, pixelHeight)
        this.trackView.track.draw({ context, referenceFrame, pixelWidth, pixelHeight })
    }

    startSpinner() {
    }

    stopSpinner() {
    }

}

export default IdeogramViewport
