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

var igv = (function (igv) {

    "use strict";

    igv.RulerTrack = function (browser) {

        this.browser = browser;
        this.height = 40;
        this.name = "";
        this.id = "ruler";
        this.disableButtons = true;
        this.ignoreTrackMenu = true;
        this.order = -Number.MAX_VALUE;
        this.removable = false;
        this.type = 'ruler';

    };

    igv.RulerTrack.prototype.updateLocusLabel = function () {
        var self = this;

        this.trackView.viewports.forEach(function (viewport) {
            var str;
            str = viewport.genomicState.referenceFrame.showLocus(viewport.$viewport.width());

            // console.log('ruler update label - viewport ' + viewport.id + ' ' + str);
            viewport.$rulerLabel.text(str);
        });

    };

    igv.RulerTrack.prototype.appendMultiPanelCloseButton = function ($viewport, genomicState) {

        const browser = this.browser;

        var $close,
            $closeButton;

        $viewport.addClass('igv-viewport-ruler');

        $close = $('<div class="igv-viewport-fa-close">');
        $viewport.append($close);

        $closeButton = $('<div>');
        $closeButton.append(igv.createIcon("times-circle"));
        $close.append($closeButton);

        $close.click(function (e) {
            browser.removeMultiLocusPanelWithGenomicState(genomicState, true);
        });

    };

    igv.RulerTrack.prototype.getFeatures = function (chr, bpStart, bpEnd) {

        return Promise.resolve([]);

    };

    igv.RulerTrack.prototype.computePixelHeight = function (ignore) {
        return this.height;
    };

    igv.RulerTrack.prototype.draw = function (options) {

        if (igv.isWholeGenomeView(options.referenceFrame)) {

            options.viewport.rulerSweeper.disableMouseHandlers();

            drawWholeGenome.call(this, options);

        } else {

            options.viewport.rulerSweeper.addMouseHandlers();

            const tickHeight = 6;
            const shim = 2;
            const pixelWidthBP = 1 + Math.floor(options.referenceFrame.toBP(options.pixelWidth));
            const tick = new Tick(pixelWidthBP, options);

            tick.drawTicks(options, tickHeight, shim, this.height);
            igv.graphics.strokeLine(options.context, 0, this.height - shim, options.pixelWidth, this.height - shim);

        }

    };

    function drawWholeGenome(options) {

        options.context.save();

        igv.graphics.fillRect(options.context, 0, 0, options.pixelWidth, options.pixelHeight, { 'fillStyle' : 'white' });

        const browser = this.browser;

        options.context.textAlign = 'center';
        options.context.textBaseline = 'middle';
        options.context.font = '9px sans-serif';

        let y = 0;
        let h = options.pixelHeight;

        for (let name of browser.genome.wgChromosomeNames) {

            let xBP = browser.genome.getCumulativeOffset(name);
            let wBP = browser.genome.getChromosome(name).bpLength;

            let x = Math.round(xBP / options.bpPerPixel);
            let w = Math.round(wBP / options.bpPerPixel);

            igv.graphics.fillRect(options.context, x, y, w, h, { 'fillStyle' : toggleColor(browser.genome.wgChromosomeNames.indexOf(name)) });

            const shortName = (name.startsWith("chr")) ? name.substring(3) : name;
            if (w > options.context.measureText(shortName).width) {
                options.fillStyle = 'rgb(128,128,128)';
                options.context.fillText(shortName, (x + (w/2)), (y + (h/2)));
            }

        }

        options.context.restore();

    }

    function toggleColor (value) {
        return 0 === value % 2 ? 'rgb(250,250,250)' : 'rgb(255,255,255)';
    }

    igv.RulerTrack.prototype.supportsWholeGenome = function () {
        return true;
    };

    igv.RulerTrack.prototype.dispose = function () {
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

            str = igv.numberFormatter(Math.floor(pixelWidthBP / unitMultiplier)) + " " + majorUnit;
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

            label = igv.numberFormatter(Math.floor(bp / this.unitMultiplier)) + " " + this.majorUnit;
            labelWidth = options.context.measureText(label).width;

            labelX = Math.round(pixel - labelWidth / 2);

            igv.graphics.fillText(options.context, label, labelX, height - (tickHeight / 0.75));
            igv.graphics.strokeLine(options.context, pixel, height - tickHeight, pixel, height - shim);

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
                label = igv.numberFormatter(Math.floor(numer)) + " " + this.majorUnit;
                labelWidth = options.context.measureText(label).width;
                labelX = pixel - labelWidth / 2;
                igv.graphics.fillText(options.context, label, labelX, height - (tickHeight / 0.75));
            }

            igv.graphics.strokeLine(options.context, pixel, height - tickHeight, pixel, height - shim);

            ++numberOfTicks;
        }


    };

    Tick.prototype.description = function (blurb) {
        console.log((blurb || '') + ' tick ' + igv.numberFormatter(this.majorTick) + ' label width ' + igv.numberFormatter(this.labelWidthBP) + ' multiplier ' + this.unitMultiplier);
    };

    return igv;
})(igv || {});
