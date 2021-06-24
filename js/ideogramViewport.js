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
import { DOMUtils } from "../node_modules/igv-utils/src/index.js"
import ViewPort from "./viewport.js"

class IdeogramViewport extends ViewPort {

    constructor(trackView, $viewportColumn, referenceFrame, width) {
        super(trackView, $viewportColumn, referenceFrame, width)
    }

    initializationHelper() {

        this.$ideogramCanvas = $('<canvas>', { class: 'igv-ideogram-canvas' })
        this.$ideogramCanvas.insertBefore(this.$canvas)

        const canvas = this.$ideogramCanvas.get(0)
        this.ideogram_ctx = canvas.getContext('2d')

        this.$canvas.remove()
        this.canvas = undefined
        this.ctx = undefined

        this.$viewport.on('click.ideogram', e => {
            clickHandler(e, canvas, this.browser, this.referenceFrame)
        })

    }
    setWidth(width) {
        this.$viewport.width(width);
    }

    drawSVGWithContext(context, width, height, id, x, y, yClipOffset) {

        context.saveWithTranslationAndClipRect(id, x, y, width, height, yClipOffset);

        this.trackView.track.draw({ context, referenceFrame: this.referenceFrame, pixelWidth: width, pixelHeight: height })

        context.restore()
    }

    async repaint() {
        this.draw({ referenceFrame: this.referenceFrame })
    }

    draw({ referenceFrame }) {

        this.$canvas.hide()

        IGVGraphics.configureHighDPICanvas(this.ideogram_ctx, this.$viewport.width(), this.$viewport.height())

        this.trackView.track.draw({ context: this.ideogram_ctx, referenceFrame, pixelWidth: this.$viewport.width(), pixelHeight: this.$viewport.height() })
    }

    startSpinner() {}
    stopSpinner() {}

}

function clickHandler(e, canvas, browser, referenceFrame) {

    const { xNormalized, width } = DOMUtils.translateMouseCoordinates(e, canvas);
    const { bpLength } = browser.genome.getChromosome(referenceFrame.chr);
    const locusLength = referenceFrame.bpPerPixel * width;
    const chrCoveragePercentage = locusLength / bpLength;

    let xPercentage = xNormalized;
    if (xPercentage - (chrCoveragePercentage / 2.0) < 0) {
        xPercentage = chrCoveragePercentage / 2.0;
    }

    if (xPercentage + (chrCoveragePercentage / 2.0) > 1.0) {
        xPercentage = 1.0 - chrCoveragePercentage / 2.0;
    }

    const ss = Math.round((xPercentage - (chrCoveragePercentage / 2.0)) * bpLength);
    const ee = Math.round((xPercentage + (chrCoveragePercentage / 2.0)) * bpLength);

    referenceFrame.start = ss;
    referenceFrame.end = ee;
    referenceFrame.bpPerPixel = (ee - ss) / width;

    browser.updateViews(referenceFrame, browser.trackViews, true)

}

export default IdeogramViewport;
