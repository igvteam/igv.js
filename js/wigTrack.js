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
 * Created by turner on 2/11/14.
 */
var igv = (function (igv) {


    igv.WIGTrack = function (config) {

        this.config = config;
        this.url = config.url;

        // Set the track type, if not explicitly specified
        if (!config.type) {
            config.type = igv.inferFileType(config.url || config.localFile.name);
        }

        if (config.type === "bigwig") {
            this.featureSource = new igv.BWSource(config.url);
        }
        else {
            this.featureSource = new igv.BedFeatureSource(config.url);
        }


        this.label = config.label;
        this.id = config.id || this.label;
        this.color = config.color || "rgb(150,150,150)";
        this.height = 100;
        this.order = config.order;

        // Min and max values.  No defaults for these, if they aren't set track will autoscale.
        this.min = config.min;
        this.max = config.max;

    };

    /**
     *
     * @param canvas -- a "fabric canvas",  fabricjs.com  (not a Canvas2D)
     * @param refFrame
     * @param bpStart
     * @param bpEnd
     * @param width
     * @param height
     * @param continuation
     */

        //  this.track.draw(igvCanvas, refFrame, tileStart, tileEnd, buffer.width, buffer.height, function () {

    igv.WIGTrack.prototype.draw = function (canvas, refFrame, bpStart, bpEnd, width, height, continuation) {

        var track = this,
            chr = refFrame.chr;

        this.featureSource.getFeatures(chr, bpStart, bpEnd, function (features) {

            var featureMin, featureMax, denom;

            if (features && features.length > 0) {
                featureMin = this.min;
                featureMax = this.max;
                if (!featureMin || !featureMax) {
                    var s = autoscale(features);
                    featureMin = s.min;
                    featureMax = s.max;
                }
                denom = featureMax - featureMin;

                features.forEach(renderFeature);
            }

            continuation();

            function renderFeature(feature, index, featureList) {

                var centroid = 128,
                    delta = 32,
                    rectOrigin,
                    rectEnd,
                    rectWidth,
                    rectHeight,
                    rectBaseline,
                    rect;

                if (feature.end < bpStart) return;
                if (feature.start > bpEnd) return;

                rectOrigin = refFrame.toPixels(feature.start - bpStart);
                rectEnd = refFrame.toPixels(feature.end - bpStart);
                rectWidth = Math.max(1, rectEnd - rectOrigin);
                rectHeight = ((feature.value - featureMin) / denom) * height;
                rectBaseline = height - rectHeight;

                canvas.fillRect(rectOrigin, rectBaseline, rectWidth, rectHeight, {fillStyle: track.color});

            }
        });
    };


    igv.WIGTrack.prototype.drawLabel = function (ctx) {
        // draw label stuff
    };

    function autoscale(features) {
        var min = Number.MAX_VALUE,
            max = -Number.MAX_VALUE;

        features.forEach(function (f) {
            min = Math.min(min, f.value);
            max = Math.max(max, f.value);
        });

        return {min: min, max: max};

    }

    return igv;

})(igv || {});
