/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of panel software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and panel permission notice shall be included in
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

//
// Chromosome ideogram
//

import $ from "./vendor/jquery-3.3.1.slim.js";
import IGVGraphics from "./igv-canvas.js";
import IGVColor from "./igv-color.js";
import {translateMouseCoordinates} from "./util/domUtils.js";

const IdeoPanel = function ($parent, panelWidth, browser) {
    this.browser = browser;
    this.$parent = $parent;
    this.buildPanels($parent, panelWidth);

};

IdeoPanel.prototype.renderSVGContext = function (context, offset) {

    let self = this;

    this.panels.forEach((panel, i) => {

        const bbox = panel.$ideogram.get(0).getBoundingClientRect();
        const dx = offset.deltaX + (i * (panel.$canvas.width() + context.multiLocusGap));
        const dy = offset.deltaY;
        context.addTrackGroupWithTranslationAndClipRect('ideogram', dx, dy, bbox.width, bbox.height, 0);

        context.save();
        let paintConfig =
            {
                ctx: context,
                width: panel.$canvas.width(),
                height: panel.$canvas.height(),
                genome: self.browser.genome,
                referenceFrame: panel.genomicState.referenceFrame,
                ideogramWidth: panel.$ideogram.width()
            };
        repaintContext(paintConfig);

        context.restore();
    });

};

IdeoPanel.prototype.buildPanels = function ($parent, width) {

    var self = this;

    $parent.append($('<div class="igv-ideogram-shim"></div>'));

    this.panels = this.browser.genomicStateList.map(function (genomicState) {
        return panelWithGenomicState.call(self, $parent, genomicState, width)
    });
};

IdeoPanel.prototype.setWidth = function (width, doRepaint) {

    this.panels.forEach(function (panel) {
        var canvas;

        panel.$ideogram.outerWidth(width);

        setupCanvasSize(panel);

        panel.ideograms = {};
    });

    if (true === doRepaint) {
        this.repaint();
    }

};

IdeoPanel.prototype.resize = function () {
    this.setWidth(this.browser.viewportContainerWidth() / this.browser.genomicStateList.length, true)
};

IdeoPanel.prototype.repaint = function () {
    let self = this;

    this.panels.forEach((panel) => {
        let config =
            {
                ctx: panel.ctx,
                width: panel.$canvas.width(),
                height: panel.$canvas.height(),
                genome: self.browser.genome,
                referenceFrame: panel.genomicState.referenceFrame,
                ideogramWidth: panel.$ideogram.width()
            };

        repaintContext(config);
    });

};

IdeoPanel.prototype.discardPanels = function () {

    this.panels.forEach(function (panel) {
        panel.$ideogram.remove();
    });

    this.panels = undefined;

};

IdeoPanel.prototype.addPanelWithGenomicStateAtIndex = function (genomicState, index, width) {
    var panel,
        $detached;

    panel = panelWithGenomicState.call(this, this.$parent, genomicState, width);

    if (index === this.panels.length) {
        this.panels.push(panel);
    } else {

        this.panels.splice(index, 0, panel);

        // The viewport constructor always appends. Reorder here.
        $detached = panel.$ideogram.detach();
        $detached.insertAfter(this.panels[index - 1].$ideogram);
    }

    assessBorders(this.panels);
};

IdeoPanel.prototype.removePanelWithLocusIndex = function (index) {

    this.panels[index].$ideogram.remove();
    this.panels.splice(index, 1);

    assessBorders(this.panels);

};

IdeoPanel.prototype.repaintPanelWithGenomicState = function (genomicState) {

    let panel = this.panels[this.browser.genomicStateList.indexOf(genomicState)];

    let config =
        {
            ctx: panel.ctx,
            width: panel.$canvas.width(),
            height: panel.$canvas.height(),
            genome: this.browser.genome,
            referenceFrame: panel.genomicState.referenceFrame,
            ideogramWidth: panel.$ideogram.width()
        };

    repaintContext(config);
};

function panelWithGenomicState($parent, genomicState, width) {

    var panel;

    const browser = this.browser;

    panel = {};

    panel.genomicState = genomicState;

    panel.$ideogram = $('<div class="igv-ideogram-content"></div>');

    $parent.append(panel.$ideogram);

    addBorder(panel.$ideogram, browser.genomicStateList.indexOf(genomicState), browser.genomicStateList.length);

    panel.$ideogram.outerWidth(width);

    panel.$canvas = $('<canvas>');
    panel.$ideogram.append(panel.$canvas);

    setupCanvasSize(panel);

    panel.ideograms = {};

    panel.$ideogram.on('click', function (e) {
        clickHandler(browser, panel, e);
    });

    return panel;
}

function addBorder($ideogram, index, length) {

    if (index < length && (1 + index !== length)) {
        $ideogram.addClass('igv-ideogram-content-border-right');
    } else {
        $ideogram.removeClass('igv-ideogram-content-border-right');
    }

}

function assessBorders(panels) {

    panels.forEach(function (panel, p) {

        if (1 === panels.length || (1 + p) === panels.length) {
            panel.$ideogram.removeClass('igv-ideogram-content-border-right');
        } else {
            panel.$ideogram.addClass('igv-ideogram-content-border-right');
        }

    });

}

function repaintContext({ctx, width, height, genome, referenceFrame, ideogramWidth}) {

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

        chrLength = cytobands[cytobands.length - 1].end;

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

function setupCanvasSize(panel) {
    var canvas = panel.$canvas.get(0);
    var w = +panel.$ideogram.width();
    var h = +panel.$ideogram.height();
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    canvas.width = window.devicePixelRatio * w;
    canvas.height = window.devicePixelRatio * h;
    panel.ctx = canvas.getContext("2d");
    panel.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}

function clickHandler(browser, panel, e) {

    const xy = translateMouseCoordinates(e, panel.$ideogram.get(0));

    let referenceFrame = panel.genomicState.referenceFrame;

    const locusLength = referenceFrame.bpPerPixel * panel.$ideogram.width();

    const chr = browser.genome.getChromosome(referenceFrame.chrName);

    const chrCoveragePercentage = locusLength / chr.bpLength;

    let xPercentage = xy.x / panel.$ideogram.width();
    if (xPercentage - (chrCoveragePercentage / 2.0) < 0) {
        xPercentage = chrCoveragePercentage / 2.0;
    }

    if (xPercentage + (chrCoveragePercentage / 2.0) > 1.0) {
        xPercentage = 1.0 - chrCoveragePercentage / 2.0;
    }

    const ss = Math.round((xPercentage - (chrCoveragePercentage / 2.0)) * chr.bpLength);
    const ee = Math.round((xPercentage + (chrCoveragePercentage / 2.0)) * chr.bpLength);

    referenceFrame.start = Math.round((xPercentage - (chrCoveragePercentage / 2.0)) * chr.bpLength);
    referenceFrame.bpPerPixel = (ee - ss) / panel.$ideogram.width();

    browser.updateLocusSearchWidget(panel.genomicState);

    browser.updateViews()

}

export default IdeoPanel;