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

        if (!config.format) {
            igv.inferTypes(config);
        }

        if ("bigwig" === config.format) {
            this.featureSource = new igv.BWSource(config);
        }
        else {
            this.featureSource = new igv.FeatureSource(config);
        }


        this.name = config.name;
        this.id = config.id || this.name;
        this.color = config.color || "rgb(150,150,150)";
        this.height = 100;
        this.order = config.order;

        // Min and max values.  No defaults for these, if they aren't set track will autoscale.
        this.min = config.min;
        this.max = config.max;

    };

    igv.WIGTrack.prototype.getFeatures = function (chr, bpStart, bpEnd, continuation, task) {

        this.featureSource.getFeatures(chr, bpStart, bpEnd, continuation, task)
    };

    igv.WIGTrack.prototype.popupMenuItems = function (popover) {

        var menuItems = [];
        menuItems.push(igv.colorPickerMenuItem(popover, this.trackView));
        menuItems.push(igv.dataRangeMenuItem(popover, this.trackView));

        return menuItems;

    };

    igv.WIGTrack.prototype.draw = function (options) {

        var track = this,
            features = options.features,
            ctx = options.context,
            bpPerPixel = options.bpPerPixel,
            bpStart = options.bpStart,
            pixelWidth = options.pixelWidth,
            pixelHeight = options.pixelHeight,
            bpEnd = bpStart + pixelWidth * bpPerPixel + 1,
            featureValueMinimum,
            featureValueMaximum,
            featureValueRange;

        if (features && features.length > 0) {
            if(track.max === undefined)  {
                var s = autoscale(features);
                featureValueMinimum = s.min;
                featureValueMaximum = s.max;
            }
            else {
                featureValueMinimum = track.min === undefined ? 0 : track.min;
                featureValueMaximum = track.max;
            }

            featureValueRange = featureValueMaximum - featureValueMinimum;

            track.dataRange = {min: featureValueMinimum, max: featureValueMaximum};  // Record for disply, menu, etc

            features.forEach(renderFeature);
        }


        function renderFeature(feature, index, featureList) {

            var yUnitless,
                heightUnitLess,
                x,
                y,
                width,
                height,
                rectEnd,
                rectBaseline;

            if (feature.end < bpStart) return;
            if (feature.start > bpEnd) return;

            x = Math.floor((feature.start - bpStart) / bpPerPixel);
            rectEnd = Math.ceil((feature.end - bpStart) / bpPerPixel);
            width = Math.max(1, rectEnd - x);

            //height = ((feature.value - featureValueMinimum) / featureValueRange) * pixelHeight;
            //rectBaseline = pixelHeight - height;
            //canvas.fillRect(rectOrigin, rectBaseline, rectWidth, rectHeight, {fillStyle: track.color});

            if (signsDiffer(featureValueMinimum, featureValueMaximum)) {

                if (feature.value < 0) {
                    yUnitless = featureValueMaximum/featureValueRange;
                    heightUnitLess = -feature.value/featureValueRange;
                } else {
                    yUnitless = ((featureValueMaximum - feature.value)/featureValueRange);
                    heightUnitLess = feature.value/featureValueRange;
                }

            }
            else if (featureValueMinimum < 0) {
                yUnitless = 0;
                heightUnitLess = -feature.value/featureValueRange;
            }
            else {
                yUnitless = 1.0 - feature.value/featureValueRange ;
                heightUnitLess = feature.value/featureValueRange;
            }

            //canvas.fillRect(x, yUnitless * pixelHeight, width, heightUnitLess * pixelHeight, { fillStyle: igv.randomRGB(64, 255) });
            igv.graphics.fillRect(ctx, x,  yUnitless * pixelHeight, width, heightUnitLess * pixelHeight, { fillStyle: track.color });

        }

    };

    function autoscale(features) {
        var min = 0,
            max = -Number.MAX_VALUE;

        features.forEach(function (f) {
            min = Math.min(min, f.value);
            max = Math.max(max, f.value);
        });

        return {min: min, max: max};

    }

    function signsDiffer(a, b) {
        return (a > 0 && b < 0 || a < 0 && b > 0);
    }

    return igv;

})(igv || {});
