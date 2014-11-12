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

    igv.SegTrack = function (config) {
        this.config = config;
        this.url = config.url;
        this.featureSource = new igv.BedFeatureSource(this.config);
        this.label = config.label;
        this.id = config.id || config.label;
        this.height = 100;
        this.minHeight = this.height;
        this.maxHeight = this.height;
        this.order = config.order;

        this.sampleCount = 0;
        this.samples = {};

    };

    /**
     *
     * @param canvas   an igv.Canvas
     * @param refFrame
     * @param bpStart
     * @param bpEnd
     * @param pixelWidth
     * @param pixelHeight
     * @param continuation  -  Optional.   called on completion, no arguments.
     */
    igv.SegTrack.prototype.draw = function (canvas, refFrame, bpStart, bpEnd, pixelWidth, pixelHeight, continuation, task) {

//        console.log("geneTrack.draw " + refFrame.chr);

        var chr = refFrame.chr,
            track = this;

        canvas.fillRect(0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});


        this.featureSource.getFeatures(chr, bpStart, bpEnd, function (featureList) {

                var segment, len, sample, i, y, color;

                if (featureList) {

                    for (i = 0, len = featureList.length; i < len; i++) {
                        sample = featureList[i].sample;
                        if (!track.samples.hasOwnProperty(sample)) {
                            track.samples[sample] = track.sampleCount;
                            track.sampleCount++;
                        }
                    }

                    for (i = 0, len = featureList.length; i < len; i++) {

                        segment = featureList[i];

                        if (segment.end < bpStart) continue;
                        if (segment.start > bpEnd) break;

                         y = track.samples[segment.sample] * 10;

                         if(segment.value < 0) {
                             color = "rgb(0, 0, 255)";
                         }
                        else {
                             color = "rgb(255, 0, 0)"
                         }


                        // TODO -- draw it!!
                    }
                }
                else {
                    console.log("No feature list");
                }

                if (continuation) continuation();
            },
            task);
    };

    igv.SegTrack.prototype.drawLabel = function (ctx) {
//        ctx.save();
//        ctx.textAlign = 'right';
//        ctx.verticalAlign = 'center';
//        ctx.strokeStyle = "black";
//        ctx.fillText(this.label, 90, this.height / 2);
//        ctx.restore();

    }

    return igv;

})(igv || {});