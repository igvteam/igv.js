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

/**
 * Created by turner on 10/17/14.
 */
var igv = (function (igv) {

    var TickSeparationThreshold = 50;

    igv.RulerNextGenTrack = function () {
        this.height = 50;
        this.label = "";
        this.id = "ruler";
        this.disableButtons =  true;

        this.ticks = getTicks();

        this.tickValues = getTickValues();

        function getTicks () {

            var divisors = [],
                mb = { units : "mb", divisor: 1e6 },
                kb = { units : "kb", divisor: 1e3 },
                 b = { units :  "b", divisor:   1 };

            divisors.push(mb); // 1e8
            divisors.push(mb); // 5e7
            divisors.push(mb); // 1e7
            divisors.push(mb); // 5e6
            divisors.push(mb); // 1e6

            divisors.push(kb); // 5e5
            divisors.push(kb); // 1e5
            divisors.push(kb); // 5e4
            divisors.push(kb); // 1e4
            divisors.push(kb); // 5e3
            divisors.push(kb); // 1e3

            divisors.push(b); // 5e2
            divisors.push(b); // 1e2
            divisors.push(b); // 5e1
            divisors.push(b); // 1e1

            return divisors;
        }

        function getTickValues () {

            var values = [];

            values.push(1e8); // 1e8
            values.push(5e7); // 5e7
            values.push(1e7); // 1e7
            values.push(5e6); // 5e6
            values.push(1e6); // 1e6


            values.push(5e5); // 5e5
            values.push(1e5); // 1e5
            values.push(5e4); // 5e4
            values.push(1e4); // 1e4
            values.push(5e3); // 5e3
            values.push(1e3); // 1e3

            values.push(5e2); // 5e2
            values.push(1e2); // 1e2
            values.push(5e1); // 5e1
            values.push(1e1); // 1e1

            return values;
        }

    };

    igv.RulerNextGenTrack.prototype.draw = function (options) {

        var myself = this,
            increment,
            index,
            done,
            tickValue,
            tickLabelNumber,
            tickLabel;

        index = 0;
        increment = 0; // pixels
        done = false;
        this.tickValues.forEach(function (tv, i, tvs) {

            increment = Math.floor(tv / options.bpPerPixel);
            if (false === done && increment > TickSeparationThreshold) {
                index = i;
                done = true;
            }

        });

        tickValue = this.tickValues[ index ];
        tickLabelNumber = options.bpStart;
        tickLabel = this.tickLabelStringWithTickLabelNumber(tickLabelNumber, index, options.pixelWidth);




    };

    gv.RulerNextGenTrack.prototype.tickLabelStringWithTickLabelNumber = function(tickLabelNumber, tickIndex, pixelWidth) {

        var tickUnit,
            tickDivisor;


        if (pixelWidth > 1e3) {
            tickUnit = "kb";
            tickDivisor = 1e3;
        }
        else if (pixelWidth > 4e7) {
            tickUnit = "mb";
            tickDivisor = 1e6;
        }
        else {
            tickUnit = this.ticks[ tickIndex].units;
            tickDivisor = this.ticks[ tickIndex].divisor;
        }

        //NSString *tickLabelNumberString = [[IGVHelpful sharedIGVHelpful].basesNumberFormatter stringFromNumber:[NSNumber numberWithLongLong:tickLabelNumber / tickDivisor]];
        //
        //return [NSString stringWithFormat:@"%@ %@", tickLabelNumberString, tickUnit];
    };

    return igv;
})(igv || {});