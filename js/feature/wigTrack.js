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

        this.featureType = 'numeric';
        this.config = config;
        this.url = config.url;

        if (config.color === undefined) {
            config.color = "rgb(150,150,150)";
        }
        if (config.height === undefined) {
            config.height = 50;
        }

        igv.configTrack(this, config);

        if ("bigwig" === config.format) {
            this.featureSource = new igv.BWSource(config);
        } else if ("tdf" === config.format) {
            this.featureSource = new igv.TDFSource(config);
        } else {
            this.featureSource = new igv.FeatureSource(config);
        }

        //this.autoscale = config.autoscale;
        // Min and max values.  No defaults for these, if they aren't set track will autoscale.
        if (config.max !== undefined) {
            this.dataRange = {
                min: config.min || 0,
                max: config.max
            }
        } else {
            this.autoscale = true;
        }
        this.windowFunction = config.windowFunction || "mean";

        this.paintAxis = igv.paintAxis;

    };

    igv.WIGTrack.prototype.getFeatures = function (chr, bpStart, bpEnd, bpPerPixel) {
        return this.featureSource.getFeatures(chr, bpStart, bpEnd, bpPerPixel, this.windowFunction);
    };

    igv.WIGTrack.prototype.menuItemList = function () {

        var self = this,
            menuItems = [];

        menuItems.push(igv.dataRangeMenuItem(this.trackView));

        menuItems.push({
            object: igv.createCheckbox("Autoscale", self.autoscale),  
            click: function () {
                var $fa = $(this).find('i');

                self.autoscale = !self.autoscale;

                if (true === self.autoscale) {
                    $fa.removeClass('igv-fa-check-hidden');
                } else {
                    $fa.addClass('igv-fa-check-hidden');
                }

                self.trackView.setDataRange(undefined, undefined, self.autoscale);
            }
        });

        return menuItems;

    };

    igv.WIGTrack.prototype.getFileHeader = function () {

        var self = this;

        if (typeof self.featureSource.getFileHeader === "function") {

            return self.featureSource.getFileHeader()
                .then(function (header) {

                    if (header) {
                        // Header (from track line).  Set properties,unless set in the config (config takes precedence)
                        if (header.name && !self.config.name) {
                            self.name = header.name;
                        }
                        if (header.color && !self.config.color) {
                            self.color = "rgb(" + header.color + ")";
                        }
                    }
                    return header;

                })
        }
        else {
            return Promise.resolve(null);
        }

    };

    igv.WIGTrack.prototype.draw = function (options) {

        var self = this,
            features = options.features,
            ctx = options.context,
            bpPerPixel = options.bpPerPixel,
            bpStart = options.bpStart,
            pixelWidth = options.pixelWidth,
            pixelHeight = options.pixelHeight,
            bpEnd = bpStart + pixelWidth * bpPerPixel + 1,
            featureValueMinimum,
            featureValueMaximum,
            featureValueRange,
            defaultRange,
            baselineColor;


        this.currentFeatures = options.features;    // Cache for popup text

        // Temp hack
        if (typeof self.color === "string" && self.color.startsWith("rgb(")) {
            baselineColor = igv.Color.addAlpha(self.color, 0.1);
        }


        if (features && features.length > 0) {

           
                featureValueMinimum = self.dataRange.min === undefined ? 0 : self.dataRange.min;
                featureValueMaximum = self.dataRange.max;
       

            if (undefined === self.dataRange) {
                self.dataRange = {};
            }

            self.dataRange.min = featureValueMinimum;  // Record for disply, menu, etc
            self.dataRange.max = featureValueMaximum;

            // Max can be less than min if config.min is set but max left to autoscale.   If that's the case there is
            // nothing to paint.
            if (featureValueMaximum > featureValueMinimum) {
                featureValueRange = featureValueMaximum - featureValueMinimum;
                features.forEach(renderFeature);

                // If the track includes negative values draw a baseline
                if (featureValueMinimum < 0) {
                    var alpha = ctx.lineWidth;
                    ctx.lineWidth = 5;
                    var basepx = (featureValueMaximum / (featureValueMaximum - featureValueMinimum)) * options.pixelHeight;
                    ctx.lineWidth = alpha;
                }
                igv.graphics.strokeLine(ctx, 0, basepx, options.pixelWidth, basepx, {strokeStyle: baselineColor});

            }
        }


        function renderFeature(feature, index, featureList) {

            var yUnitless,
                heightUnitLess,
                x,
                y,
                width,
                color,
                rectEnd;

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
                    yUnitless = featureValueMaximum / featureValueRange;
                    heightUnitLess = -feature.value / featureValueRange;
                } else {
                    yUnitless = ((featureValueMaximum - feature.value) / featureValueRange);
                    heightUnitLess = feature.value / featureValueRange;
                }

            }
            else if (featureValueMinimum < 0) {
                yUnitless = 0;
                heightUnitLess = -feature.value / featureValueRange;
            }
            else {
                yUnitless = 1.0 - feature.value / featureValueRange;
                heightUnitLess = feature.value / featureValueRange;
            }

            //canvas.fillRect(x, yUnitless * pixelHeight, width, heightUnitLess * pixelHeight, { fillStyle: igv.randomRGB(64, 255) });

            color = (typeof self.color === "function") ? self.color(feature.value) : self.color;

            igv.graphics.fillRect(ctx, x, yUnitless * pixelHeight, width, heightUnitLess * pixelHeight, {fillStyle: color});

        }

    };

    igv.WIGTrack.prototype.popupData = function (config) {

        // We use the featureCache property rather than method to avoid async load.  If the
        // feature is not already loaded this won't work,  but the user wouldn't be mousing over it either.
        if (this.currentFeatures) {

            var genomicLocation = config.genomicLocation,

                referenceFrame = config.viewport.genomicState.referenceFrame,
                tolerance,
                featureList,
                popupData,
                selectedFeature;

            featureList = this.currentFeatures;

            if (featureList.length > 0) {

                popupData = [];

                // We need some tolerance around genomicLocation, start with +/- 2 pixels
                tolerance = 2 * referenceFrame.bpPerPixel;
                selectedFeature = binarySearch(featureList, genomicLocation, tolerance);

                if (selectedFeature) {
                    popupData.push({name: "Position:", value: igv.numberFormatter(selectedFeature.start + 1) + "-" + igv.numberFormatter(selectedFeature.end)});
                    popupData.push({name: "Value:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", value: igv.numberFormatter(selectedFeature.value)});
                }

                return popupData;
            }

        }
        else {
            return null;
        }
    }

    /**
     * Called when the track is removed.  Do any needed cleanup here
     */
    igv.WIGTrack.prototype.dispose = function () {
        this.trackView = undefined;
    }



    function signsDiffer(a, b) {
        return (a > 0 && b < 0 || a < 0 && b > 0);
    }

    /**
     * Return the closest feature to the genomic position +/- the specified tolerance.  Closest is defined
     * by the minimum of the distance between position and start or end of the feature.
     *
     * @param features
     * @param position
     * @returns {*}
     */
    function binarySearch(features, position, tolerance) {
        var startIndex = 0,
            stopIndex = features.length - 1,
            index = (startIndex + stopIndex) >> 1,
            candidateFeature,
            tmp, delta;


        // Use binary search to get the index of at least 1 feature in the click tolerance bounds
        while (!test(features[index], position, tolerance) && startIndex < stopIndex) {
            if (position < features[index].start) {
                stopIndex = index - 1;
            } else if (position > features[index].end) {
                startIndex = index + 1;
            }

            index = (startIndex + stopIndex) >> 1;
        }

        if (test(features[index], position, tolerance)) {

            candidateFeature = features[index];
            if (test(candidateFeature, position, 0)) return candidateFeature;

            // Else, find closest feature to click
            tmp = index;
            while (tmp-- >= 0) {
                if (!test(features[tmp]), position, tolerance) {
                    break;
                }
                if (test(features[tmp], position, 0)) {
                    return features[tmp];
                }
                if (delta(features[tmp], position) < delta(candidateFeature, position)) {
                    candidateFeature = features[tmp];
                }

                tmp = index;
                while (tmp++ < features.length) {
                    if (!test(features[tmp]), position, tolerance) {
                        break;
                    }
                    if (test(features[tmp], position, 0)) {
                        return features[tmp];
                    }
                    if (delta(features[tmp], position) < delta(candidateFeature, position)) {
                        candidateFeature = features[tmp];
                    }
                }
            }
            return candidateFeature;

        } else {
            console.log(position + ' not found!');
            return undefined;
        }

        function test(feature, position, tolerance) {
            return position >= (feature.start - tolerance) && position <= (feature.end + tolerance);
        }

        function delta(feature, position) {
            return Math.min(Math.abs(feature.start - position), Math.abs(feature.end - position));
        }
    }


    // Static function
    igv.WIGTrack.autoscale = function (features) {
        var min = 0,
            max = -Number.MAX_VALUE;

        features.forEach(function (f) {
            if (!Number.isNaN(f.value)) {
                min = Math.min(min, f.value);
                max = Math.max(max, f.value);
            }
        });

        return {min: min, max: max};
    }

    return igv;

})(igv || {});
