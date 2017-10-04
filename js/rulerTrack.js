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

    tickKeys = _.map(tickNumbers, function (number) { return number.toString() });
    tickDivisors = createTickDivisiors();
    tickUnits = createTickUnits();
    tickValues = createTickValues();

    //
    igv.RulerTrack = function () {

        this.height = 40;
        // this.height = 50;
        // this.height = 24;

        this.name = "";
        this.id = "ruler";
        this.disableButtons = true;
        this.ignoreTrackMenu = true;
        this.order = -Number.MAX_VALUE;
        this.supportsWholeGenome = true;

    };

    igv.RulerTrack.prototype.createRulerSweeper = function (viewport, $viewport, $viewportContent, genomicState) {

        if (undefined === this.rulerSweepers) {
            this.rulerSweepers = {};
        }

        this.rulerSweepers[ genomicState.locusIndex.toString() ] = new igv.RulerSweeper(viewport, $viewport, $viewportContent, genomicState);
    };

    igv.RulerTrack.prototype.locusLabelWithViewport = function (viewport) {

        var locusLabel = $('<div class = "igv-viewport-content-ruler-div">');

        locusLabel.text(viewport.genomicState.locusSearchString);

        locusLabel.click(function (e) {

            var genomicState = viewport.genomicState,
                initialReferenceFrame = genomicState.initialReferenceFrame;

            genomicState.referenceFrame = new igv.ReferenceFrame(initialReferenceFrame.chrName, initialReferenceFrame.start, initialReferenceFrame.bpPerPixel);

            // igv.browser.updateWithLocusIndex(genomicState.locusIndex);
            igv.browser.selectMultiLocusPanelWithGenomicState(genomicState);
        });

        return locusLabel;
    };

    igv.RulerTrack.prototype.getFeatures = function (chr, bpStart, bpEnd) {

        return new Promise(function (fulfill, reject) {
            fulfill([]);
        });
    };

    igv.RulerTrack.prototype.draw = function (options) {

        var self = this,
            pixel,
            shim,
            tickHeight,
            rulerSweeper,
            index,
            incrementPixel,
            tickValue,
            tickLabelNumber,
            tickLabelText,
            toggle;

        rulerSweeper = this.rulerSweepers[ options.genomicState.locusIndex.toString() ];

        if ('all' === options.referenceFrame.chrName.toLowerCase()) {
            drawWholeGenome.call(this, options, rulerSweeper);
        } else {

            rulerSweeper.$viewportContent.find('.igv-whole-genome-container').hide();
            rulerSweeper.$viewportContent.find('canvas').show();

            rulerSweeper.addMouseHandlers();

            updateLocusLabelWithGenomicState(options.genomicState);

            shim = 2;
            tickHeight = 6;

            // port of iOS ruler scheme
            index = 0;
            for (var i = 0; i < _.size(tickKeys); i++) {
                incrementPixel = options.referenceFrame.toPixels( tickValues[ tickKeys[ i ] ] );
                if (incrementPixel > TickSeparationThreshold) {
                    index = i;
                    break;
                }
            }

            tickValue = tickValues[ tickKeys[ index ] ];
            tickLabelNumber = options.bpStart;
            tickLabelText = tickLabelString(tickLabelNumber, index, options.referenceFrame.toBP(options.pixelWidth));
            for (pixel = 0, toggle = 0; pixel < options.pixelWidth; pixel += incrementPixel, toggle++) {

                console.log('label ' + tickLabelText);

                igv.graphics.fillText(options.context, tickLabelText, Math.round(pixel), self.height - (tickHeight / 0.75));
                igv.graphics.strokeLine(options.context, Math.round(pixel), this.height - tickHeight, Math.round(pixel), this.height - shim);

                tickLabelNumber += tickValue;
                tickLabelText = tickLabelString(tickLabelNumber, index, options.referenceFrame.toBP(options.pixelWidth));
            }

            igv.graphics.strokeLine(options.context, 0, this.height - shim, options.pixelWidth, this.height - shim);

        }

        function updateLocusLabelWithGenomicState(genomicState) {
            var $e;
            $e = options.viewport.$viewport.find('.igv-viewport-content-ruler-div');
            $e.text(genomicState.locusSearchString);
        }

        function formatNumber(anynum, decimal) {
            //decimal  - the number of decimals after the digit from 0 to 3
            //-- Returns the passed number as a string in the xxx,xxx.xx format.
            //anynum = eval(obj.value);
            var divider = 10;
            switch (decimal) {
                case 0:
                    divider = 1;
                    break;
                case 1:
                    divider = 10;
                    break;
                case 2:
                    divider = 100;
                    break;
                default:       //for 3 decimal places
                    divider = 1000;
            }

            var workNum = Math.abs((Math.round(anynum * divider) / divider));

            var workStr = "" + workNum;

            if (workStr.indexOf(".") === -1) {
                workStr += "."
            }

            var dStr = workStr.substr(0, workStr.indexOf("."));
            var dNum = dStr - 0;
            var pStr = workStr.substr(workStr.indexOf("."));

            while (pStr.length - 1 < decimal) {
                pStr += "0"
            }

            if (pStr === '.') pStr = '';

            //--- Adds a comma in the thousands place.
            if (dNum >= 1000) {
                var dLen = dStr.length;
                dStr = parseInt("" + (dNum / 1000)) + "," + dStr.substring(dLen - 3, dLen)
            }

            //-- Adds a comma in the millions place.
            if (dNum >= 1000000) {
                dLen = dStr.length;
                dStr = parseInt("" + (dNum / 1000000)) + "," + dStr.substring(dLen - 7, dLen)
            }
            var retval = dStr + pStr;
            //-- Put numbers in parentheses if negative.
            if (anynum < 0) {
                retval = "(" + retval + ")";
            }

            //You could include a dollar sign in the return value.
            //retval =  "$"+retval
            return retval;
        }

        function drawWholeGenome(options, rulerSweeper) {
            rulerSweeper.$viewportContent.find('canvas').hide();
            rulerSweeper.$viewportContent.find('.igv-whole-genome-container').show();
            rulerSweeper.disableMouseHandlers();
        }

    };

    function tickLabelString (tickLabelNumber, index, lengthBP) {
        var tickUnit,
            tickDivisor,
            string,
            number;


        // if (lengthBP > 1e3) {
        //     tickUnit = 'kb';
        //     tickDivisor = 1e3;
        // } else if (lengthBP > 4e7) {
        //     tickUnit = 'mb';
        //     tickDivisor = 1e6;
        // } else {
            tickUnit = tickUnits[ tickKeys[ index ] ];
            tickDivisor = tickDivisors[ tickKeys[ index ] ];
        // }

        number = Math.round(tickLabelNumber / tickDivisor);
        string = number + tickUnit;

        return string;
    }

    function createTickDivisiors () {
        var tickDivisiors = {};
        tickDivisiors[ 1e8.toString() ] = 1e6;
        tickDivisiors[ 5e7.toString() ] = 1e6;
        tickDivisiors[ 1e7.toString() ] = 1e6;
        tickDivisiors[ 5e6.toString() ] = 1e6;
        tickDivisiors[ 1e6.toString() ] = 1e6;

        tickDivisiors[ 5e5.toString() ] = 1e3;
        tickDivisiors[ 1e5.toString() ] = 1e3;
        tickDivisiors[ 5e4.toString() ] = 1e3;
        tickDivisiors[ 1e4.toString() ] = 1e3;
        tickDivisiors[ 5e3.toString() ] = 1e3;
        tickDivisiors[ 1e3.toString() ] = 1e3;

        tickDivisiors[ 5e2.toString() ] = 1;
        tickDivisiors[ 1e2.toString() ] = 1;
        tickDivisiors[ 5e1.toString() ] = 1;
        tickDivisiors[ 1e1.toString() ] = 1;

        return tickDivisiors;
    }

    function createTickValues  () {
        var tickValues = {};

        _.each(tickNumbers, function (number) {
            tickValues[ number.toString() ] = number;
        });

        return tickValues;
    }

    function createTickUnits () {
        var tickUnits = {};
        tickUnits[ 1e8.toString() ] = 'mb';
        tickUnits[ 5e7.toString() ] = 'mb';
        tickUnits[ 1e7.toString() ] = 'mb';
        tickUnits[ 5e6.toString() ] = 'mb';
        tickUnits[ 1e6.toString() ] = 'mb';

        tickUnits[ 5e5.toString() ] = 'kb';
        tickUnits[ 1e5.toString() ] = 'kb';
        tickUnits[ 5e4.toString() ] = 'kb';
        tickUnits[ 1e4.toString() ] = 'kb';
        tickUnits[ 5e3.toString() ] = 'kb';
        tickUnits[ 1e3.toString() ] = 'kb';

        tickUnits[ 5e2.toString() ] = 'b';
        tickUnits[ 1e2.toString() ] = 'b';
        tickUnits[ 5e1.toString() ] = 'b';
        tickUnits[ 1e1.toString() ] = 'b';

        return tickUnits;
    }

    return igv;
})(igv || {});
