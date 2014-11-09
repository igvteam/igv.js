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
 * Created by turner on 2/18/14.
 */
var igv = (function (igv) {

    igv.SEGTrack = function (url) {
        this.url = url;
        this.featureSource = new igv.SEGFeatureSource(this.url);

        this.label = "WIGLabel";
        this.id = "wig";
        this.height = 100;

    }

    /**
     *
     * @param canvas - an igv.Canvas
     * @param bpStart
     * @param bpEnd
     * @param width
     * @param height
     * @param continuation
     */
    igv.SEGTrack.prototype.draw = function (canvas, refFrame, bpStart, bpEnd, width, height, continuation) {

        var chr = refFrame.chr;
        this.featureSource.getFeatures(chr, bpStart, bpEnd, function (featureList) {

            if (featureList) {

                var pxStart,
                    pxEnd,
                    pxWidth,
                    featureListLength = featureList.features.length,
                    feature,
                    featureHeight,
                    baseline,
                    denom = featureList.maximum - featureList.minimum;

                for (var i = 0; i < featureListLength; i++) {

                    feature = featureList.features[i];

                    if (feature.end < bpStart) continue;
                    if (feature.start > bpEnd) break;

                    pxStart = refFrame.toPixels(feature.start - bpStart);
                    pxEnd = refFrame.toPixels(feature.end - bpStart);
                    pxWidth = Math.max(1, pxEnd - pxStart);

                    featureHeight = ((feature.value - featureList.minimum) / denom) * height;

                    baseline = height - featureHeight;

                    // Use random colors to disambiguate features during implementation of WIG renderer
                    canvas.fillRect(pxStart, baseline, pxWidth, featureHeight, {fillStyle: igv.randomRGB(0, 255)});

                }
            }

            continuation();

        });
    };

    igv.SEGTrack.prototype.drawLabel = function (ctx) {
        // draw label stuff
    };

    return igv;

})(igv || {});
