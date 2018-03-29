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

    var TickSeparationThreshold,
        tickNumbers,
        tickKeys,
        tickDivisors,
        tickUnits,
        tickValues;

    TickSeparationThreshold = 50;

    tickNumbers =
        [
            1e8,

            5e7,
            1e7,

            5e6,
            1e6,

            5e5,
            1e5,

            5e4,
            1e4,

            5e3,
            1e3,

            5e2,
            1e2,

            5e1,
            1e1
        ].reverse();

    tickKeys = _.map(tickNumbers, function (number) {
        return number.toString()
    });
    tickDivisors = createTickDivisiors();
    tickUnits = createTickUnits();
    tickValues = createTickValues();

    //
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
            pixel,
            shim,
            tickHeight,
            rulerSweeper,
            $viewportContent,
            index,
            tickSeparationPixel,
            tickLabelNumber,
            tickLabelText,
            toggle,
            rect,
            center,
            size,
            maximumLabelWidthPixel,
            key,
            bp;

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

            index = 0;
            for (var i = 0; i < tickKeys.length; i++) {
                tickSeparationPixel = options.referenceFrame.toPixels(tickValues[tickKeys[i]]);
                if (tickSeparationPixel > TickSeparationThreshold) {
                    index = i;
                    break;
                }
            }

            shim = 2;
            tickHeight = 6;
            bp = options.bpStart + options.referenceFrame.toBP(options.pixelWidth);
            bp = Math.min(options.genomicState.chromosome.bpLength, bp);
            maximumLabelWidthPixel = options.context.measureText(tickLabelString(bp, index)).width;

            for (pixel = 0, toggle = 0, tickLabelNumber = options.bpStart; pixel < options.pixelWidth; pixel += tickSeparationPixel, toggle++, tickLabelNumber += tickValues[tickKeys[index]]) {

                if (0 === toggle % 2 || maximumLabelWidthPixel < tickSeparationPixel) {

                    tickLabelText = tickLabelString(tickLabelNumber, index);

                    center = {x: Math.round(pixel), y: self.height - (tickHeight / 0.75)};
                    size = {width: options.context.measureText(tickLabelText).width, height: 2};

                    rect = igv.Rect.makeWithCenterAndSize(center, size);

                    igv.graphics.fillText(options.context, tickLabelText, Math.round(pixel - rect.size.width / 2), self.height - (tickHeight / 0.75));
                }

                igv.graphics.strokeLine(options.context, Math.round(pixel), this.height - tickHeight, Math.round(pixel), this.height - shim);
            }

            igv.graphics.strokeLine(options.context, 0, this.height - shim, options.pixelWidth, this.height - shim);

        }

    };

    function tickLabelString(tickLabelNumber, index) {
        var tickUnit,
            tickDivisor,
            string,
            number;

        tickUnit = tickUnits[tickKeys[index]];
        tickDivisor = tickDivisors[tickKeys[index]];

        number = Math.round(tickLabelNumber / tickDivisor);
        string = igv.numberFormatter(number) + ' ' + tickUnit;

        return string;
    }

    function createTickDivisiors() {
        var tickDivisiors = {};
        tickDivisiors[1e8.toString()] = 1e6;
        tickDivisiors[5e7.toString()] = 1e6;
        tickDivisiors[1e7.toString()] = 1e6;
        tickDivisiors[5e6.toString()] = 1e6;
        tickDivisiors[1e6.toString()] = 1e6;

        tickDivisiors[5e5.toString()] = 1e3;
        tickDivisiors[1e5.toString()] = 1e3;
        tickDivisiors[5e4.toString()] = 1e3;
        tickDivisiors[1e4.toString()] = 1e3;
        tickDivisiors[5e3.toString()] = 1e3;
        tickDivisiors[1e3.toString()] = 1e3;

        tickDivisiors[5e2.toString()] = 1;
        tickDivisiors[1e2.toString()] = 1;
        tickDivisiors[5e1.toString()] = 1;
        tickDivisiors[1e1.toString()] = 1;

        return tickDivisiors;
    }

    function createTickValues() {
        var tickValues = {};

        _.each(tickNumbers, function (number) {
            tickValues[number.toString()] = number;
        });

        return tickValues;
    }

    function createTickUnits() {
        var tickUnits = {};
        tickUnits[1e8.toString()] = 'mb';
        tickUnits[5e7.toString()] = 'mb';
        tickUnits[1e7.toString()] = 'mb';
        tickUnits[5e6.toString()] = 'mb';
        tickUnits[1e6.toString()] = 'mb';

        tickUnits[5e5.toString()] = 'kb';
        tickUnits[1e5.toString()] = 'kb';
        tickUnits[5e4.toString()] = 'kb';
        tickUnits[1e4.toString()] = 'kb';
        tickUnits[5e3.toString()] = 'kb';
        tickUnits[1e3.toString()] = 'kb';

        tickUnits[5e2.toString()] = '';
        tickUnits[1e2.toString()] = '';
        tickUnits[5e1.toString()] = '';
        tickUnits[1e1.toString()] = '';

        return tickUnits;
    }

    return igv;
})(igv || {});
