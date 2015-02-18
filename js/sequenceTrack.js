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

    igv.SequenceTrack = function (config) {
        this.label = "";
        this.id = "sequence";
        this.type = config.type;
        this.height = 15;
        this.disableButtons = true;
        this.order = config.order || 9999;
        this.ignoreTrackMenu = true;
    };

    igv.SequenceTrack.prototype.getFeatures = function (chr, bpStart, bpEnd, continuation, task) {

        if (igv.browser.referenceFrame.bpPerPixel > 1) {
            continuation(null);
        }
        else {
            igv.sequenceSource.getSequence(chr, bpStart, bpEnd, continuation, task)
        }
    };

    igv.SequenceTrack.prototype.draw = function (options) {

        var sequence = options.features,
            canvas = options.context,
            bpPerPixel = options.bpPerPixel,
            bpStart = options.bpStart,
            pixelWidth = options.pixelWidth,
            bpEnd = bpStart + pixelWidth * bpPerPixel + 1;

        if (sequence) {

            var len = sequence.length;
            var w = 1 / bpPerPixel;

            var y = this.height / 2;
            for (var pos = bpStart; pos <= bpEnd; pos++) {

                var offset = pos - bpStart;
                if (offset < len) {
//                            var b = sequence.charAt(offset);
                    var b = sequence[ offset ];
                    var p0 = Math.floor(offset * w);
                    var p1 = Math.floor((offset + 1) * w);
                    var pc = Math.round((p0 + p1) / 2);
                    var c = igv.nucleotideColors[ b ];

                    if (!c) c = "gray";

                    if (bpPerPixel > 1 / 10) {

                        canvas.fillRect(p0, 0, p1 - p0, 10, {fillStyle: c});
                    }
                    else {

                        canvas.strokeText(b, pc, y, {strokeStyle: c, font: 'normal 10px Arial', textAlign: 'center'});
                    }
                }
            }
        }

    };

    return igv;
})
(igv || {});



