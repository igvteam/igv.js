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

    igv.RulerTrack = function () {

        this.height = 40;
        this.name = "";
        this.id = "ruler";
        this.disableButtons = true;
        this.ignoreTrackMenu = true;
        this.order = -Number.MAX_VALUE;
        this.supportsWholeGenome = true;
        this.rulerSweepers = [];

    };

    igv.RulerTrack.prototype.updateLocusLabel = function () {
        var self = this;

        this.trackView.viewports.forEach(function (viewport) {
            var str;
            str = viewport.genomicState.referenceFrame.showLocus(viewport.$viewport.width());

            // console.log('ruler update label - viewport ' + viewport.id + ' ' + str);
            viewport.$rulerLabel.text( str );
        });

    };

    igv.RulerTrack.prototype.appendMultiPanelCloseButton = function ($viewport, genomicState) {

        var $close,
            $closeButton;

        $viewport.addClass('igv-viewport-ruler');

        $close = $('<div class="igv-viewport-fa-close">');
        $viewport.append($close);

        $closeButton = $('<div>');
        $closeButton.append(igv.createIcon("times-circle"));
        $close.append($closeButton);

        $close.click(function (e) {
            igv.browser.removeMultiLocusPanelWithGenomicState(genomicState, true);
        });

    };

    igv.RulerTrack.prototype.removeRulerSweeperWithLocusIndex = function (index) {
        this.rulerSweepers.splice(index, 1);
    };

    igv.RulerTrack.prototype.getFeatures = function (chr, bpStart, bpEnd) {

        return Promise.resolve([]);

    };

    igv.RulerTrack.prototype.draw = function (options) {
        var self = this,
            key,
            rulerSweeper,
            $viewportContent,
            range,
            tickSpacing,
            tickLabelText,
            n,
            shim,
            center,
            size,
            rect,
            tickHeight;

        key = igv.browser.genomicStateList.indexOf(options.genomicState).toString();
        rulerSweeper = this.rulerSweepers[ key ];

        $viewportContent = $(rulerSweeper.viewport.contentDiv);

        if ('all' === options.referenceFrame.chrName.toLowerCase()) {

            $viewportContent.find('canvas').hide();
            $viewportContent.find('.igv-whole-genome-container').show();
            rulerSweeper.disableMouseHandlers();
        } else {

            $viewportContent.find('.igv-whole-genome-container').hide();
            $viewportContent.find('canvas').show();
            rulerSweeper.addMouseHandlers();

            tickHeight = 6;
            shim = 2;

            range = 1 + Math.floor(options.referenceFrame.toBP(options.pixelWidth));
            tickSpacing = createTickSpacing(range, false);

            n = Math.floor(range/tickSpacing.unitMultiplier);
            tickLabelText = igv.numberFormatter(n) + " " + tickSpacing.majorUnit;

            center = { x: options.pixelWidth, y: this.height - (tickHeight / 0.75)};
            size = { width: options.context.measureText(tickLabelText).width, height: 2};
            rect = igv.Rect.makeWithCenterAndSize(center, size);

            igv.graphics.fillText(options.context, tickLabelText, Math.round(options.pixelWidth - rect.size.width / 2), self.height - (tickHeight / 0.75));

            drawTicks.call(this, options, tickHeight, shim, tickSpacing);

            igv.graphics.strokeLine(options.context, 0, this.height - shim, options.pixelWidth, this.height - shim);

        }

    };

    function drawTicks(options, tickHeight, shim, tickSpacing) {

        var numberOfTicks,
            bp,
            pixel,
            label,
            labelWidth,
            labelX;

        // Find starting point closest to the current origin
        numberOfTicks = Math.floor(options.bpStart/tickSpacing.majorTick) - 1;

        pixel = 0;
        while (pixel < options.pixelWidth) {

            bp = Math.floor(numberOfTicks * tickSpacing.majorTick);
            pixel = Math.round(options.referenceFrame.toPixels((bp - 1) - options.bpStart + 0.5));

            label = igv.numberFormatter(Math.floor(bp / tickSpacing.unitMultiplier)) + " " + tickSpacing.majorUnit;

            labelWidth = options.context.measureText(label).width;
            labelX = pixel - labelWidth / 2;

            if (0 === /*numberOfTicks % 2*/0) {
                igv.graphics.fillText(options.context, label, labelX, this.height - (tickHeight / 0.75));
            }

            igv.graphics.strokeLine(options.context, pixel, this.height - tickHeight, pixel, this.height - shim);

            ++numberOfTicks;
        }

    }

    function createTickSpacing(lengthBP, doUseKBScale) {
        var numberOfZeroes,
            majorUnit,
            unitMultiplier,
            nMajorTicks;

        if (lengthBP < 10) {
            return new igv.TickSpacing(1, "bp", 1);
        }

        // How many zeros
        numberOfZeroes = Math.floor(Math.log10(lengthBP));
        majorUnit = doUseKBScale ? "kb" : "bp";

        unitMultiplier = 1;
        if (numberOfZeroes > 9) {
            majorUnit = doUseKBScale ? "tb" : "gb";
            unitMultiplier = 1e9;
        }
        if (numberOfZeroes > 6) {
            majorUnit = doUseKBScale ? "gb" : "mb";
            unitMultiplier = 1e6;
        } else if (numberOfZeroes > 3) {
            majorUnit = doUseKBScale ? "mb" : "kb";
            unitMultiplier = 1e3;
        }

        nMajorTicks = lengthBP / Math.pow(10, numberOfZeroes - 1);

        if (nMajorTicks < 25) {
            return new igv.TickSpacing(Math.pow(10, numberOfZeroes - 1), majorUnit, unitMultiplier);
        } else {
            return new igv.TickSpacing(Math.pow(10, numberOfZeroes) / 2, majorUnit, unitMultiplier);
        }

    }

    igv.TickSpacing = function (majorTick, majorUnit, unitMultiplier) {
        this.majorTick = majorTick;
        this.minorTick = majorTick / 10.0;
        this.majorUnit = majorUnit;
        this.unitMultiplier = unitMultiplier;
    };

    return igv;
})(igv || {});
