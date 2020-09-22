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
import IGVGraphics from "./igv-canvas.js";
import ViewportBase from "./viewportBase.js";
import C2S from "./canvas2svg.js";
import {FileUtils, DOMUtils, IGVColor} from "../node_modules/igv-utils/src/index.js";

class IdeogramViewport extends ViewportBase {

    constructor(trackView, $viewportContainer, genomicState, width) {

        super(trackView, $viewportContainer, genomicState, width)

        this.$canvas.on('click', e => this.handleClick(e, this.canvas));

    }

    setWidth(width) {
        this.$viewport.width(width);

        this.ctx.canvas.style.width = `${ width }px`;
        this.ctx.canvas.width = window.devicePixelRatio * width;

        this.ctx.canvas.style.height = `${ this.$viewport.height() }px`;
        this.ctx.canvas.height = window.devicePixelRatio * this.$viewport.height();

        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    }

    handleClick(e, canvas) {

        const { xNormalized, width } = DOMUtils.translateMouseCoordinates(e, canvas);
        //console.log(`bboxWidth ${ width }. canvas.width ${ canvas.width }`)
        let { referenceFrame } = this.genomicState;
        const { bpLength } = this.browser.genome.getChromosome(referenceFrame.chrName);
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

        referenceFrame.start = Math.round((xPercentage - (chrCoveragePercentage / 2.0)) * bpLength);
        referenceFrame.bpPerPixel = (ee - ss) / width;

        this.browser.updateLocusSearchWidget(this.genomicState);
        this.browser.updateViews()

    }

    checkZoomIn() {
        return true
    }

    setTop (contentTop) {

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
            referenceFrame: this.genomicState.referenceFrame,
            ideogramWidth: this.$content.width()
        }

        context.save();
        repaintContext(config)
        context.restore();
    }

    repaint() {

        let config =
            {
                ctx: this.ctx,
                width: this.$canvas.width(),
                height: this.$canvas.height(),
                genome: this.browser.genome,
                referenceFrame: this.genomicState.referenceFrame,
                ideogramWidth: this.$content.width()
            };

        repaintContext(config);

    }

}

function repaintContext({ ctx, width, height, genome, referenceFrame, ideogramWidth }) {

    if (!(width > 0 && height > 0)) {
        return;
    }

    if (!(genome && referenceFrame && genome.getChromosome(referenceFrame.chrName) && height > 0)) {
        return;
    }

    const stainColors = [];
    IGVGraphics.fillRect(ctx, 0, 0, width, height, {fillStyle: IGVColor.greyScale(255)});

    if (referenceFrame.chrName.toLowerCase() === "all") {
        return;
    }

    drawIdeogram({ctx, referenceFrame, genome, width, height, stainColors});

    const chromosome = genome.getChromosome(referenceFrame.chrName);

    const widthBP = Math.round(referenceFrame.bpPerPixel * ideogramWidth);
    const xBP = referenceFrame.start;

    // Total chromosome length can be > chromosome.bpLength for partial fastas.
    let chrLength = chromosome.bpLength;
    const cytobands = genome.getCytobands(referenceFrame.chrName);
    if (cytobands && cytobands.length > 0) {
        chrLength = Math.max(chrLength, cytobands[cytobands.length - 1].end)
    }


    if (widthBP < chrLength) {

        const percentWidth = widthBP / chrLength
        const percentX = xBP / chrLength

        let x = Math.floor(percentX * width)
        let ww = Math.floor(percentWidth * width)

        x = Math.max(0, x)
        x = Math.min(width - ww, x)

        // Push current context
        ctx.save()

        // Draw red box
        ctx.strokeStyle = "red"
        ctx.lineWidth = (ww < 2) ? 1 : 2

        const xx = x + (ctx.lineWidth) / 2
        ww = (ww < 2) ? 1 : ww - ctx.lineWidth

        const yy = ctx.lineWidth / 2
        const hh = height - ctx.lineWidth

        ctx.strokeRect(xx, yy, ww, hh)

        // Pop current context
        ctx.restore()
    }

}

function drawIdeogram({ctx, referenceFrame, genome, width, height, stainColors}) {

    var shim,
        shim2,
        ideogramTop,
        cytobands,
        cytoband,
        center,
        xC,
        yC,
        chrLength,
        scale,
        start,
        end,
        i;

    shim = 1;
    shim2 = 0.5 * shim;
    ideogramTop = 0;

    if (undefined === genome) {
        return;
    }

    IGVGraphics.fillRect(ctx, 0, 0, width, height, {fillStyle: IGVColor.greyScale(255)});

    cytobands = genome.getCytobands(referenceFrame.chrName);
    if (cytobands) {

        center = (ideogramTop + height / 2);

        xC = [];
        yC = [];

        if (0 === cytobands.length) {
            return;
        }

        chrLength = referenceFrame.genome.getChromosome(referenceFrame.chrName).bpLength;
        scale = width / chrLength;

        // round rect clipping path
        ctx.beginPath();
        IGVGraphics.roundRect(ctx, shim2, shim2 + ideogramTop, width - 2 * shim2, height - 2 * shim2, (height - 2 * shim2) / 2, 0, 1);
        ctx.clip();

        for (i = 0; i < cytobands.length; i++) {

            cytoband = cytobands[i];
            start = scale * cytoband.start;
            end = scale * cytoband.end;

            if (cytoband.type === 'c') {

                if (cytoband.name.charAt(0) === 'p') {
                    xC[0] = start;
                    yC[0] = height + ideogramTop;
                    xC[1] = start;
                    yC[1] = ideogramTop;
                    xC[2] = end;
                    yC[2] = center;
                } else {
                    xC[0] = end;
                    yC[0] = height + ideogramTop;
                    xC[1] = end;
                    yC[1] = ideogramTop;
                    xC[2] = start;
                    yC[2] = center;
                }

                ctx.fillStyle = "rgb(150, 0, 0)";
                ctx.strokeStyle = "rgb(150, 0, 0)";
                IGVGraphics.polygon(ctx, xC, yC, 1, 0);
            } else {

                ctx.fillStyle = getCytobandColor(stainColors, cytoband);
                IGVGraphics.fillRect(ctx, start, shim + ideogramTop, (end - start), height - 2 * shim);
            }
        }
    }

    // round rect border
    ctx.strokeStyle = IGVColor.greyScale(41);
    IGVGraphics.roundRect(ctx, shim2, shim2 + ideogramTop, width - 2 * shim2, height - 2 * shim2, (height - 2 * shim2) / 2, 0, 1);
}

function getCytobandColor(colors, data) {

    if (data.type === 'c') { // centermere: "acen"
        return "rgb(150, 10, 10)"
    } else {
        var stain = data.stain; // + 4;

        var shade = 230;
        if (data.type === 'p') {
            shade = Math.floor(230 - stain / 100.0 * 230);
        }
        var c = colors[shade];
        if (!c) {
            c = "rgb(" + shade + "," + shade + "," + shade + ")";
            colors[shade] = c;
        }
        return c;

    }
}

export default IdeogramViewport;
