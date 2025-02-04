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

import IGVGraphics from "./igv-canvas.js"
import {IGVColor} from "../node_modules/igv-utils/src/index.js"

/**
 * Class represents an ideogram of a chromsome cytobands.  It is used for the header of a track panel.
 *
 */
class IdeogramTrack {
    constructor(browser) {
        this.browser = browser
        this.type = 'ideogram'
        this.id = 'ideogram'
        this.height = browser.config.showCytobandNames ? 20 : 16
        this.order = Number.MIN_SAFE_INTEGER
        this.disableButtons = true
        this.ignoreTrackMenu = true

        // Check whether we should show the cytoband names in the ideogram
        this.showCytobandNames = browser.config.showCytobandNames
    }

    computePixelHeight(ignore) {
        return this.height
    }

    draw({context, referenceFrame, pixelWidth, pixelHeight, features}) {

        const chr = referenceFrame.chr
        const chromosome = referenceFrame.genome.getChromosome(chr)

        if (undefined === chromosome || pixelWidth <= 0 || pixelHeight <= 0 || 'all' === chr.toLowerCase()) {
            return
        }

        const stainColors = []

        drawIdeogram({
            ctx: context,
            features,
            chr,
            referenceFrame,
            genome: referenceFrame.genome,
            width: pixelWidth,
            height: pixelHeight,
            stainColors,
            showCytobandNames: this.showCytobandNames
        })

        const widthBP = Math.round(referenceFrame.bpPerPixel * pixelWidth)
        const xBP = referenceFrame.start

        // Total chromosome length can be > chromosome.bpLength for partial fastas.
        let chrLength = chromosome.bpLength
        const cytobands = referenceFrame.genome.getCytobands(chr)
        if (cytobands && cytobands.length > 0 && cytobands[cytobands.length - 1].end) {
            chrLength = Math.max(chrLength, cytobands[cytobands.length - 1].end)
            chromosome.bpLength = chrLength   // Correct bp length, bit of a hack
        }

        if (widthBP < chrLength) {

            const percentWidth = widthBP / chrLength
            const percentX = xBP / chrLength

            let x = Math.floor(percentX * pixelWidth)
            let ww = Math.floor(percentWidth * pixelWidth)

            x = Math.max(0, x)
            x = Math.min(pixelWidth - ww, x)

            // Push current context
            context.save()

            // Draw red box
            context.strokeStyle = "red"
            context.lineWidth = (ww < 2) ? 1 : 2

            const xx = x + (context.lineWidth) / 2
            ww = (ww < 2) ? 1 : ww - context.lineWidth

            const yy = context.lineWidth / 2
            const hh = pixelHeight - context.lineWidth

            context.strokeRect(xx, yy, ww, hh)

            // Pop current context
            context.restore()
        }
    }

    dispose() {
        this.trackView = undefined
    }
}

function drawIdeogram({ctx, chr, referenceFrame, genome, width, height, stainColors, features, showCytobandNames}) {
    const shim = 1
    const shim2 = 0.5 * shim
    const ideogramTop = 0

    if (undefined === genome) {
        return
    }

    IGVGraphics.fillRect(ctx, 0, 0, width, height, {fillStyle: IGVColor.greyScale(255)})

    const cytobands = features
    if (cytobands) {

        const center = (ideogramTop + height / 2)

        const xC = []
        const yC = []

        if (0 === cytobands.length) {
            return
        }

        // Get chrLength from the cytobands -- chromsome.bpLength might not work for igv-reports fasta files, which
        // contain only a portion of the chromosome sequence
        // *DOESNT WORK* const chrLength = referenceFrame.genome.getChromosome(chr).bpLength;

        const chrLength = cytobands[cytobands.length - 1].end
        const scale = width / chrLength

        // round rect clipping path
        ctx.beginPath()
        IGVGraphics.roundRect(ctx, shim2, shim2 + ideogramTop, width - 2 * shim2, height - 2 * shim2, (height - 2 * shim2) / 2, 0, 1)
        ctx.clip()

        for (let i = 0; i < cytobands.length; i++) {

            const cytoband = cytobands[i]
            const start = scale * cytoband.start
            const end = scale * cytoband.end

            if (cytoband.type === 'c') {

                if (cytoband.name.charAt(0) === 'p') {
                    xC[0] = start
                    yC[0] = height + ideogramTop
                    xC[1] = start
                    yC[1] = ideogramTop
                    xC[2] = end
                    yC[2] = center
                } else {
                    xC[0] = end
                    yC[0] = height + ideogramTop
                    xC[1] = end
                    yC[1] = ideogramTop
                    xC[2] = start
                    yC[2] = center
                }

                ctx.fillStyle = "rgb(150, 0, 0)"
                ctx.strokeStyle = "rgb(150, 0, 0)"
                IGVGraphics.polygon(ctx, xC, yC, 1, 0)
            } 
            else {
                const backgroundColor = getCytobandColor(stainColors, cytoband);
                ctx.fillStyle = backgroundColor.color;
                IGVGraphics.fillRect(ctx, start, shim + ideogramTop, (end - start), height - 2 * shim)

                if (showCytobandNames) {
                   drawIdeogramCytobandName(ctx, cytoband.name, start, end, ideogramTop, height, backgroundColor.shade)
                }
            }
        }
    }

    // round rect border
    ctx.strokeStyle = IGVColor.greyScale(41)
    IGVGraphics.roundRect(ctx, shim2, shim2 + ideogramTop, width - 2 * shim2, height - 2 * shim2, (height - 2 * shim2) / 2, 0, 1)
}

function drawIdeogramCytobandName(ctx, name, start, end, ideogramTop, height, shade) {
    const padding = 2; // Padding between the rect and the sides of the ideogram

    // Calculate font size to fit the rectangle height and width
    const rectHeight = height - 2 * padding;
    const rectWidth = end - start;

    const maxFontSize = rectHeight - 2 * padding; // Leave some padding for text
    let fontSize = maxFontSize;
    do {
        ctx.font = `${fontSize}px sans-serif`;
        const textWidth = ctx.measureText(name).width;
        if (textWidth <= rectWidth) break;
        fontSize -= 1;
    } while (fontSize > 4); // Minimum font size to avoid infinite loop

    // For safety, we're going to clip the text to the rectangle bounds
    ctx.save(); // Save the current state of the context
    ctx.beginPath();
    ctx.rect(start, padding + ideogramTop, rectWidth, rectHeight);
    ctx.clip();

    // Draw the name of the cytoband, centered within the rectangle
    const centerX = start + rectWidth / 2.0;
    const centerY = padding + ideogramTop + rectHeight / 2.0 + 1;

    // Determine the luminance
    let luminance;
    if (shade !== null) {
        luminance = 0.2126 * shade + 0.7152 * shade + 0.0722 * shade; // Simplified since R=G=B=shade
    } else {
        luminance = 0.2126 * 150 + 0.7152 * 10 + 0.0722 * 10; // Hardcoded for "acen"
    }

    // Choose text color based on luminance
    const textColor = luminance < 128 ? "white" : "black";

    IGVGraphics.fillText(ctx, name, centerX, centerY, {
        fillStyle: textColor,
        textAlign: "center",
        textBaseline: "middle",
        font: `${fontSize}px sans-serif` // Ensure proper font size
    });

    ctx.restore(); // Restore the context to remove clipping
}

function getCytobandColor(colors, data) {
    if (data.type === 'c') { // centromere: "acen"
        return { color: "rgb(150, 10, 10)", shade: null }; // Shade is not relevant here
    } 
    else {
        let stain = data.stain; // Stain value
        let shade = 230; // Default shade for 'g'

        if (data.type === 'p') {
            shade = Math.floor(230 - stain / 100.0 * 230);
        }

        // Cache the color if not already stored
        var c = colors[shade]
        if (!c) {
            c = "rgb(" + shade + "," + shade + "," + shade + ")"
            colors[shade] = c
        }

        return { color: c, shade }; // Return both the color and shade
    }
}

export default IdeogramTrack
