/*
 * The MIT License (MIT)
 *
 * Copyright (c) $year. Broad Institute
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
    };

    function getTicks () {

        var mb = { units : "mb", value: 1e6 },
            kb = { units : "kb", value: 1e3 },
            b = { units :  "b", value:   1 },
            divisors = [];

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


        values.push(5e5);  // 5e5
        values.push(1e5);  // 1e5
        values.push(5e4);  // 5e4
        values.push(1e4); // 1e4
        values.push(5e3); // 5e3
        values.push(1e3); // 1e3

        values.push(5e2); // 5e2
        values.push(1e2); // 1e2
        values.push(5e1); // 5e1
        values.push(1e1); // 1e1

        return values;
    }


    igv.RulerNextGenTrack.prototype.draw = function (canvas, refFrame, tileStart, tileEnd, width, height, continuation) {

        var myself = this,
            incrementPoints = 0,
            index = 0,
            brake = false,
            tickValue,
            tickLabelNumber;

        this.tickValues.forEach(function(tv, tvindex, tvs){

            var tickUnit,
                tickDivisor;

            incrementPoints = Math.floor(tv / refFrame.bpPerPixel);
            if (false === brake && incrementPoints > TickSeparationThreshold) {

                index = tvindex;

                tickUnit = myself.ticks[ index ].units;
                tickDivisor = igv.numberFormatter( myself.ticks[ index ].value );
                brake = true;
            }

        });

        tickValue = this.tickValues[ index ];
        tickLabelNumber = tileStart;

//        self.tickLabel.text = [self tickLabelStringWithTickLabelNumber:tickLabelNumber tickIndex:index igvContextLength:[igvContext length]];
//
//        NSUInteger toggle;
//        long long int x;
//        for (x = 0, toggle = 0; x < igvContextLengthPoints; x += incrementPoints, toggle++) {
//
//            CGSize tickLabelSize = [self.tickLabel.text sizeWithAttributes:[NSDictionary dictionaryWithObject:self.tickLabel.font forKey:NSFontAttributeName]];
//
//            if (/*incrementPoints > tickLabelSize.width ||*/ toggle % 2) {
//
//                [self.tickLabel.text drawInRect:[IGVMath rectWithCenter:CGPointMake(x, CGRectGetHeight(rect) - (tickLabelSize.height / 2.0)) size:tickLabelSize]
//                withAttributes:[NSDictionary dictionaryWithObject:self.tickLabel.font forKey:NSFontAttributeName]];
//
//            }
//
//            UIRectFill(CGRectMake(x, CGRectGetMinY(rect), 1, CGRectGetHeight(rect) - tickLabelSize.height));
//
//            tickLabelNumber += [tickValue longLongValue];
//
//            self.tickLabel.text = [self tickLabelStringWithTickLabelNumber:tickLabelNumber tickIndex:index igvContextLength:[igvContext length]];
//
//        }


    };

    igv.RulerNextGenTrack.prototype.drawLabel = function (ctx) {

    };

    return igv;
})(igv || {});