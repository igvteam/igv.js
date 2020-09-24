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
import {IGVColor} from "../node_modules/igv-utils/src/index.js";
import GenomeUtils from "./genome/genome.js";
import {createIcon} from "./igv-icons.js";
import {StringUtils} from "../node_modules/igv-utils/src/index.js";

const numberFormatter = StringUtils.numberFormatter;

const RulerTrack = function (browser) {

    this.browser = browser;
    this.height = 40;
    this.name = "";
    this.id = "ruler";
    this.disableButtons = true;
    this.ignoreTrackMenu = true;
    this.order = Number.MIN_SAFE_INTEGER * 1e-2;
    this.removable = false;
    this.type = 'ruler';

};

RulerTrack.prototype.updateLocusLabel = function () {

    for (let viewport of this.trackView.viewports) {
         viewport.updateLocusLabel()
    }

};

RulerTrack.prototype.getFeatures = function (chr, bpStart, bpEnd) {

    return Promise.resolve([]);

};

RulerTrack.prototype.computePixelHeight = function (ignore) {
    return this.height;
};

RulerTrack.prototype.draw = function (options) {

    if (GenomeUtils.isWholeGenomeView(options.genomicState.chromosome.name)) {

        options.viewport.rulerSweeper.disableMouseHandlers();

        drawWholeGenome.call(this, options);

    } else {

        options.viewport.rulerSweeper.addMouseHandlers();

        const tickHeight = 6;
        const shim = 2;
        const pixelWidthBP = 1 + Math.floor(options.referenceFrame.toBP(options.pixelWidth));
        const tick = new Tick(pixelWidthBP, options);

        tick.drawTicks(options, tickHeight, shim, this.height);
        IGVGraphics.strokeLine(options.context, 0, this.height - shim, options.pixelWidth, this.height - shim);

    }

};

function drawWholeGenome(options) {

    options.context.save();

    IGVGraphics.fillRect(options.context, 0, 0, options.pixelWidth, options.pixelHeight, {'fillStyle': 'white'});

    let y = 0;
    let h = options.pixelHeight;

    for (let name of this.browser.genome.wgChromosomeNames) {

        let xBP = this.browser.genome.getCumulativeOffset(name);
        let wBP = this.browser.genome.getChromosome(name).bpLength;

        let x = Math.round(xBP / options.bpPerPixel);
        let w = Math.round(wBP / options.bpPerPixel);

        renderChromosomeRect.call(this, options.context, x, y, w, h, name);
    }

    options.context.restore();

}

function renderChromosomeRect(ctx, x, y, w, h, name) {

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '12px sans-serif';

    // IGVGraphics.fillRect(ctx, x, y, w, h, { 'fillStyle' : toggleColor(this.browser.genome.wgChromosomeNames.indexOf(name)) });

    IGVGraphics.strokeLine(ctx, x + w, y, x + w, y + h, {strokeStyle: IGVColor.greyScale(191)});

    const shortName = (name.startsWith("chr")) ? name.substring(3) : name;

    if (w > ctx.measureText(shortName).width) {
        IGVGraphics.fillText(ctx, shortName, (x + (w / 2)), (y + (h / 2)), {fillStyle: IGVColor.greyScale(68)});
    }

}

function toggleColor(value) {
    return 0 === value % 2 ? 'rgb(250,250,250)' : 'rgb(255,255,255)';
}

RulerTrack.prototype.supportsWholeGenome = function () {
    return true;
};

RulerTrack.prototype.dispose = function () {
    // do stuff
};

const Tick = function (pixelWidthBP, options) {

    initialize.call(this, pixelWidthBP, options);

    function initialize(pixelWidthBP, options) {

        var numberOfZeroes,
            majorUnit,
            unitMultiplier,
            numberOfMajorTicks,
            str;

        const isSVGContext = options.context.isSVG || false;

        if (pixelWidthBP < 10) {
            set.call(this, 1, "bp", 1, isSVGContext);
        }

        numberOfZeroes = Math.floor(Math.log10(pixelWidthBP));

        if (numberOfZeroes > 9) {
            majorUnit = "gb";
            unitMultiplier = 1e9;
        } else if (numberOfZeroes > 6) {
            majorUnit = "mb";
            unitMultiplier = 1e6;
        } else if (numberOfZeroes > 3) {
            majorUnit = "kb";
            unitMultiplier = 1e3;
        } else {
            majorUnit = "bp";
            unitMultiplier = 1;
        }

        str = numberFormatter(Math.floor(pixelWidthBP / unitMultiplier)) + " " + majorUnit;
        this.labelWidthBP = Math.round(options.referenceFrame.toBP(options.context.measureText(str).width));

        numberOfMajorTicks = pixelWidthBP / Math.pow(10, numberOfZeroes - 1);

        if (numberOfMajorTicks < 25) {
            set.call(this, Math.pow(10, numberOfZeroes - 1), majorUnit, unitMultiplier, isSVGContext);
        } else {
            set.call(this, Math.pow(10, numberOfZeroes) / 2, majorUnit, unitMultiplier, isSVGContext);
        }

    }

    function set(majorTick, majorUnit, unitMultiplier, isSVGContext) {

        // reduce label frequency by half for SVG rendering
        this.majorTick = true === isSVGContext ? 2 * majorTick : majorTick;
        this.majorUnit = majorUnit;

        this.halfTick = majorTick / 2;

        this.unitMultiplier = unitMultiplier;
    }

};

Tick.prototype.drawTicks = function (options, tickHeight, shim, height) {

    var numberOfTicks,
        bp,
        pixel,
        label,
        labelWidth,
        labelX,
        numer,
        floored;


    numberOfTicks = Math.floor(options.bpStart / this.majorTick) - 1;
    labelWidth = 0;
    labelX = 0;
    pixel = 0;
    while (pixel < options.pixelWidth) {

        bp = Math.floor(numberOfTicks * this.majorTick);
        pixel = Math.round(options.referenceFrame.toPixels((bp - 1) - options.bpStart + 0.5));

        label = numberFormatter(Math.floor(bp / this.unitMultiplier)) + " " + this.majorUnit;
        labelWidth = options.context.measureText(label).width;

        labelX = Math.round(pixel - labelWidth / 2);

        IGVGraphics.fillText(options.context, label, labelX, height - (tickHeight / 0.75));
        IGVGraphics.strokeLine(options.context, pixel, height - tickHeight, pixel, height - shim);

        ++numberOfTicks;
    }

    numberOfTicks = Math.floor(options.bpStart / this.halfTick) - 1;
    pixel = 0;
    while (pixel < options.pixelWidth) {

        bp = Math.floor(numberOfTicks * this.halfTick);
        pixel = Math.round(options.referenceFrame.toPixels((bp - 1) - options.bpStart + 0.5));
        numer = bp / this.unitMultiplier;
        floored = Math.floor(numer);

        if (numer === floored && (this.majorTick / this.labelWidthBP) > 8) {
            label = numberFormatter(Math.floor(numer)) + " " + this.majorUnit;
            labelWidth = options.context.measureText(label).width;
            labelX = pixel - labelWidth / 2;
            IGVGraphics.fillText(options.context, label, labelX, height - (tickHeight / 0.75));
        }

        IGVGraphics.strokeLine(options.context, pixel, height - tickHeight, pixel, height - shim);

        ++numberOfTicks;
    }


};

Tick.prototype.description = function (blurb) {
    console.log((blurb || '') + ' tick ' + numberFormatter(this.majorTick) + ' label width ' + numberFormatter(this.labelWidthBP) + ' multiplier ' + this.unitMultiplier);
};

export default RulerTrack;
