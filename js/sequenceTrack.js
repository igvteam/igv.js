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
        this.minHeight = this.height;
        this.maxHeight = this.height;
        this.disableButtons =  true;
        this.order = config.order || 9999;
        this.ignoreTrackMenu = true;
    };


    igv.SequenceTrack.prototype.draw = function (canvas, refFrame, tileStart, tileEnd, width, height, continuation) {

        var chr = refFrame.chr;

        if (refFrame.bpPerPixel > 1) {
            continuation();
        }
        else {

            igv.sequenceSource.getSequence(chr, tileStart, tileEnd, function (sequence) {

//                console.log("squenceTrack - igv.sequenceSource.getSequence", chr, igv.numberFormatter(tileStart), igv.numberFormatter(tileEnd));

                if (sequence) {


                    var len = sequence.length;
                    var w = 1 / refFrame.bpPerPixel;

                    var y = height / 2;
                    for (var pos = tileStart; pos <= tileEnd; pos++) {

                        var offset = pos - tileStart;
                        if (offset < len) {
//                            var b = sequence.charAt(offset);
                            var b = sequence[ offset ];
                            var p0 = Math.floor(offset * w);
                            var p1 = Math.floor((offset + 1) * w);
                            var pc = Math.round((p0 + p1) / 2);
                            var c = igv.nucleotideColors[ b ];

                            if (!c) c = "gray";

                            if (refFrame.bpPerPixel > 1 / 10) {

                                canvas.fillRect(p0, 0, p1 - p0, 10, {fillStyle: c});
                            }
                            else {

                                canvas.strokeText(b, pc, y, {strokeStyle: c, font: 'normal 10px Arial', textAlign: 'center'});
                            }
                        }
                    }
                }

                continuation();
            });

        }
    }

    return igv;
})
    (igv || {});



