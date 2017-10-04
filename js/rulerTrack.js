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

    tickKeys = _.map(tickNumbers, function (number) { number.toString(); });
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
            ts,
            spacing,
            nTick,
            x,
            l,
            yShim,
            tickHeight,
            bpp,
            rulerSweeper,
            label,
            ticks,
            index,
            incrementPixel,
            tickValue;

        rulerSweeper = this.rulerSweepers[ options.genomicState.locusIndex.toString() ];

        if ('all' === options.referenceFrame.chrName.toLowerCase()) {
            drawWholeGenome.call(this, options, rulerSweeper);
        } else {

            // heckbert_labels(options.referenceFrame.start, options.referenceFrame.start + options.referenceFrame.toBP(options.viewportWidth), options.viewportWidth, options.context, options.referenceFrame.bpPerPixel);

            ticks = heckbert_labels(options.bpStart, options.bpStart + options.referenceFrame.toBP(options.pixelWidth), options.pixelWidth, options.context, options.referenceFrame.bpPerPixel);

            rulerSweeper.$viewportContent.find('.igv-whole-genome-container').hide();
            rulerSweeper.$viewportContent.find('canvas').show();

            rulerSweeper.addMouseHandlers();

            updateLocusLabelWithGenomicState(options.genomicState);

            index = 0;
            for (var i = 0; i < _.size(tickKeys); i++) {
                incrementPixel = options.referenceFrame.toPixels( tickValues[ tickKeys[ i ] ] );
                if (incrementPixel > TickSeparationThreshold) {
                    index = i;
                    break;
                }
            }


            yShim = 2;
            tickHeight = 6;
            _.each(ticks, function (tick) {
                igv.graphics.fillText(options.context, tick.pretty, tick.pixel, self.height - (tickHeight / 0.75));
                igv.graphics.strokeLine(options.context, tick.pretty, self.height - tickHeight, tick.pretty, self.height - yShim);
            });


            bpp = options.referenceFrame.bpPerPixel;
            ts = findSpacing( Math.floor(options.viewportWidth * bpp) );
            spacing = ts.majorTick;

            // Find starting point closest to the current origin
            nTick = Math.floor(options.bpStart / spacing) - 1;
            x = 0;

            // while (x < options.pixelWidth) {
            //
            //     l = Math.floor(nTick * spacing);
            //
            //     x = Math.round(((l - 1) - options.bpStart + 0.5) / bpp);
            //     label = formatNumber(l / ts.unitMultiplier, 0) + " " + ts.majorUnit;
            //
            //     if (nTick % 1 === 0) {
            //         igv.graphics.fillText(options.context, label, x, this.height - (tickHeight / 0.75));
            //     }
            //
            //     igv.graphics.strokeLine(options.context, x, this.height - tickHeight, x, this.height - yShim);
            //
            //     nTick++;
            // }

            igv.graphics.strokeLine(options.context, 0, this.height - yShim, options.pixelWidth, this.height - yShim);

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

    function createTickUnits () {
        var tickUnits = {};

        _.each(tickNumbers, function (number) {
            tickUnits[ number.toString() ] = number;
        });

        return tickUnits;
    }

    function createTickValues () {
        var tickValues = {};
        tickValues[ 1e8.toString() ] = 'mb';
        tickValues[ 5e7.toString() ] = 'mb';
        tickValues[ 1e7.toString() ] = 'mb';
        tickValues[ 5e6.toString() ] = 'mb';
        tickValues[ 1e6.toString() ] = 'mb';

        tickValues[ 5e5.toString() ] = 'kb';
        tickValues[ 1e5.toString() ] = 'kb';
        tickValues[ 5e4.toString() ] = 'kb';
        tickValues[ 1e4.toString() ] = 'kb';
        tickValues[ 5e3.toString() ] = 'kb';
        tickValues[ 1e3.toString() ] = 'kb';

        tickValues[ 5e2.toString() ] = 'b';
        tickValues[ 1e2.toString() ] = 'b';
        tickValues[ 5e1.toString() ] = 'b';
        tickValues[ 1e1.toString() ] = 'b';

        return tickValues;
    }















    // Implementation of Paul Heckbert's classing "Nice Numbers for Graph Labels"
    // Graphics Gems. Code: pp. 657-659. Discussion: p. 61
    function heckbert_labels(min, max, canvasWidth, context, bpp) {
        var range,
            increment,
            graphmin,
            graphmax,
            nfrac,
            tickCount,
            ticks,
            labelWidth;

        labelWidth = context.measureText(max.toString()).width;
        tickCount = Math.floor(canvasWidth / labelWidth);

        range = nicenum(max - min, false);
        increment = nicenum(range / (tickCount - 1), true);

        graphmin = increment * Math.floor(min / increment);
        graphmax = increment * Math.ceil(max / increment);

        nfrac = Math.max(0, -Math.floor( Math.log10(increment)));
        // console.log('ticks ' + tickCount + ' min ' + igv.numberFormatter(graphmin) + ' max ' + igv.numberFormatter(graphmax) + ' increment ' + igv.numberFormatter(increment));

        ticks = [];
        for (var x = graphmin, i = 0, w = 0; x < (graphmax + 0.5 * increment); x += increment, i++) {
            w += Math.round(context.measureText(x.toString()).width);
            console.log('index ' + i + ' label ' + igv.numberFormatter(x) + ' acc-width ' + w + ' canvas-width ' + canvasWidth);
            ticks.push({ bp:x, pretty:igv.numberFormatter(x), pixel: Math.round((x - graphmin)/bpp) });
        }

        function nicenum(x, doRound) {
            var exp,
                f,
                nf;

            exp = Math.floor( Math.log10(x));
            f = x / expt(10, exp);

            if (doRound) {

                if (f < 1.5) {
                    nf = 1;
                } else if (f < 3) {
                    nf = 2;
                } else if (f < 7) {
                    nf = 5;
                } else {
                    nf = 10;
                }

            } else {

                if (f <= 1.5) {
                    nf = 1;
                } else if (f <= 2) {
                    nf = 2;
                } else if (f <= 5) {
                    nf = 5;
                } else {
                    nf = 10;
                }

            }

            return nf * expt(10, exp);

            function expt(a, n) {
                return Math.pow(a, n);
            }
        }

        return ticks;
    }

    function TickSpacing(majorTick, majorUnit, unitMultiplier) {
        this.majorTick = majorTick;
        this.majorUnit = majorUnit;
        this.unitMultiplier = unitMultiplier;
    }

    function findSpacing(maxValue) {

        if (maxValue < 10) {
            return new TickSpacing(1, "", 1);
        }


        // How many zeroes?
        var nZeroes = Math.floor(log10(maxValue));
        var majorUnit = "";
        var unitMultiplier = 1;
        if (nZeroes > 9) {
            majorUnit = "gb";
            unitMultiplier = 1000000000;
        }
        if (nZeroes > 6) {
            majorUnit = "mb";
            unitMultiplier = 1000000;
        } else if (nZeroes > 3) {
            majorUnit = "kb";
            unitMultiplier = 1000;
        }

        var nMajorTicks = maxValue / Math.pow(10, nZeroes - 1);
        if (nMajorTicks < 25) {
            return new TickSpacing(Math.pow(10, nZeroes - 1), majorUnit, unitMultiplier);
        } else {
            return new TickSpacing(Math.pow(10, nZeroes) / 2, majorUnit, unitMultiplier);
        }

        function log10(x) {
            var dn = Math.log(10);
            return Math.log(x) / dn;
        }
    }

    return igv;
})(igv || {});
