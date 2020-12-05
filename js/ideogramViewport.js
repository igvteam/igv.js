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

import $ from "./vendor/jquery-3.3.1.slim.js";
import C2S from "./canvas2svg.js";
import {FileUtils, DOMUtils } from "../node_modules/igv-utils/src/index.js";
import ViewPort from "./viewport.js";

class IdeogramViewport extends ViewPort {

    constructor(trackView, $viewportContainer, referenceFrame, width) {
        super(trackView, $viewportContainer, referenceFrame, width)
    }

    initializationHelper() {

        this.$ideogramCanvas = $('<canvas>', { class: 'igv-ideogram-canvas' })
        this.$ideogramCanvas.insertBefore(this.$canvas)

        const canvas = this.$ideogramCanvas.get(0)
        this.ideogram_ctx = canvas.getContext('2d')

        // this.$ideogramCanvas.on('click.ideogram', e => {
        //     this.handleClick(e, canvas)
        // })

        this.$viewport.on('click.ideogram', e => {
            console.log(`${ Date.now() } - ideogram viewport click`)
            this.handleClick(e, canvas, this.browser, this.referenceFrame)
        })

    }

    handleClick(e, canvas, browser, referenceFrame) {

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
        referenceFrame.initialEnd = ee;
        referenceFrame.bpPerPixel = (ee - ss) / width;

        if (browser.referenceFrameList > 1) {
            browser.updateLocusSearchWidget(browser.referenceFrameList)
        } else {
            browser.updateLocusSearchWidget([ referenceFrame ])
        }

        browser.updateViews()

        this.draw({ context: this.ideogram_ctx, referenceFrame, pixelWidth: this.$viewport.width(), pixelHeight: this.$viewport.height() })

    }

    draw({ context, referenceFrame, pixelWidth, pixelHeight }) {

        this.$canvas.hide()
        this.trackView.track.draw({ context: this.ideogram_ctx, referenceFrame, pixelWidth: this.$viewport.width(), pixelHeight: this.$viewport.height() })
    }

    // TODO: Not needed. No menus on ideogram track
    saveSVG() {

        const { width, height } = this.$viewport.get(0).getBoundingClientRect()

        const context = new C2S(
            {
                width,
                height,
                viewbox:
                    {
                        x: 0,
                        y: -$(this.contentDiv).position().top,
                        width,
                        height
                    }

            });

        this.drawSVGWithContect(context, width, height)

        const svg = context.getSerializedSvg(true);
        const data = URL.createObjectURL(new Blob([ svg ], { type: "application/octet-stream" }));
        FileUtils.download(`${ this.trackView.track.id }.svg`, data);

    }

    drawSVGWithContect(context, width, height) {

        const config =
        {
            ctx: context,
            width,
            height,
            genome: this.browser.genome,
            referenceFrame: this.referenceFrame,
            ideogramWidth: this.$content.width()
        }

        context.save();
        repaintContext(config)
        context.restore();
    }

    DEPRICATE_repaint() {

        let config =
            {
                ctx: this.ctx,
                width: this.$canvas.width(),
                height: this.$canvas.height(),
                genome: this.browser.genome,
                referenceFrame: this.referenceFrame,
                ideogramWidth: this.$content.width()
            };

        repaintContext(config);

    }

}

export default IdeogramViewport;
