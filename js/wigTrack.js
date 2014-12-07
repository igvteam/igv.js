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
            this.featureSource = new igv.BWSource(config);
        }
        else {
            this.featureSource = new igv.BedFeatureSource(config);
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


    igv.WIGTrack.prototype.getFeatures = function (chr, bpStart, bpEnd, continuation, task) {

        this.featureSource.getFeatures(chr, bpStart, bpEnd, continuation, task)
    }


    igv.WIGTrack.prototype.draw = function (options) {

        var track = this,
            features = options.features,
            canvas = options.context,
            bpPerPixel = options.bpPerPixel,
            bpStart = options.bpStart,
            pixelWidth = options.pixelWidth,
            pixelHeight = options.pixelHeight,
            bpEnd = bpStart + pixelWidth * bpPerPixel + 1,
            featureMin, featureMax, denom;

        if (features && features.length > 0) {
            featureMin = track.min ? track.min : 0;
            featureMax = track.max;
            if (featureMax === undefined) {
                var s = autoscale(features);
                featureMin = s.min;
                featureMax = s.max;
            }
            denom = featureMax - featureMin;

            features.forEach(renderFeature);
        }


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

            rectOrigin = (feature.start - bpStart) / bpPerPixel;
            rectEnd = (feature.end - bpStart) / bpPerPixel;
            rectWidth = Math.max(1, rectEnd - rectOrigin);
            rectHeight = ((feature.value - featureMin) / denom) * pixelHeight;
            rectBaseline = pixelHeight - rectHeight;

            canvas.fillRect(rectOrigin, rectBaseline, rectWidth, rectHeight, {fillStyle: track.color});

        }

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
