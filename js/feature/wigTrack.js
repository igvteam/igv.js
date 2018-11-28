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

"use strict";

var igv = (function (igv) {

    const type = "wig";

    let WigTrack;

    if (!igv.trackFactory) {
        igv.trackFactory = {};
    }

    igv.trackFactory[type] = function (config, browser) {

        if (!WigTrack) {
            defineClass();
        }

        return new WigTrack(config, browser);
    }


    function defineClass() {

        WigTrack = igv.extend(igv.TrackBase,

            function (config, browser) {

                this.type = "wig";

                this.featureType = 'numeric';

                if (config.color === undefined) {
                    config.color = "rgb(150,150,150)";
                }
                if (config.height === undefined) {
                    config.height = 50;
                }

                igv.TrackBase.call(this, config, browser);

                const format = config.format ? config.format.toLowerCase() : config.format;
                if ("bigwig" === format) {
                    this.featureSource = new igv.BWSource(config, browser.genome);
                } else if ("tdf" === format) {
                    this.featureSource = new igv.TDFSource(config, browser.genome);
                } else {
                    this.featureSource = new igv.FeatureSource(config, browser.genome);
                }

                this.autoscale = config.autoscale || config.max === undefined;
                if (!this.autoscale) {
                    this.dataRange = {
                        min: config.min || 0,
                        max: config.max
                    }
                }

                this.windowFunction = config.windowFunction || "mean";

                this.paintAxis = igv.paintAxis;

                this.graphType = config.graphType || "bar";

            });

        WigTrack.prototype.getFeatures = function (chr, bpStart, bpEnd, bpPerPixel) {

            var self = this;

            return this.getFileHeader()

                .then(function (header) {

                    return self.featureSource.getFeatures(chr, bpStart, bpEnd, bpPerPixel, self.windowFunction);

                });
        };

        WigTrack.prototype.menuItemList = function () {

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

                    self.config.autoscale = self.autoscale;
                    self.trackView.setDataRange(undefined, undefined, self.autoscale);
                }
            });

            return menuItems;

        };

        WigTrack.prototype.getFileHeader = function () {

            var self = this;

            if (typeof self.featureSource.getFileHeader === "function") {

                if (self.header) {
                    return Promise.resolve(self.header);
                }
                else {
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
                            self.header = header;

                            return header;

                        })
                }
            }
            else {
                return Promise.resolve(null);
            }

        };

        WigTrack.prototype.draw = function (options) {

            var self = this, features, ctx, bpPerPixel, bpStart, pixelWidth, pixelHeight, bpEnd,
                featureValueMinimum, featureValueMaximum, featureValueRange, baselineColor;

            features = options.features;
            ctx = options.context;
            bpPerPixel = options.bpPerPixel;
            bpStart = options.bpStart;
            pixelWidth = options.pixelWidth;
            pixelHeight = options.pixelHeight;
            bpEnd = bpStart + pixelWidth * bpPerPixel + 1;

            if (typeof self.color === "string" && self.color.startsWith("rgb(")) {
                baselineColor = igv.Color.addAlpha(self.color, 0.1);
            }

            if (features && features.length > 0) {

                if (self.dataRange.min === undefined) self.dataRange.min = 0;

                featureValueMinimum = self.dataRange.min;
                featureValueMaximum = self.dataRange.max;

                // Max can be less than min if config.min is set but max left to autoscale.   If that's the case there is
                // nothing to paint.
                if (featureValueMaximum > featureValueMinimum) {

                    featureValueRange = featureValueMaximum - featureValueMinimum;

                    if (renderFeature.end < bpStart) return;
                    if (renderFeature.start > bpEnd) return;

                    features.forEach(renderFeature);

                    // If the track includes negative values draw a baseline
                    if (featureValueMinimum < 0) {
                        const basepx = (featureValueMaximum / (featureValueMaximum - featureValueMinimum)) * options.pixelHeight;
                        igv.graphics.strokeLine(ctx, 0, basepx, options.pixelWidth, basepx, {strokeStyle: baselineColor});
                    }
                }
            }


            function renderFeature(feature) {

                const x = Math.floor((feature.start - bpStart) / bpPerPixel);
                const rectEnd = Math.ceil((feature.end - bpStart) / bpPerPixel);
                const width = Math.max(1, rectEnd - x);
                const y = (featureValueMaximum - feature.value) / (featureValueRange);

                let yb;
                if (featureValueMinimum > 0) {
                    yb = 1;
                } else if (featureValueMaximum < 0) {
                    yb = 0;
                } else {
                    yb = featureValueMaximum / featureValueRange;
                }

                const yUnitless = Math.min(y, yb);
                const y2 = Math.max(y, yb);
                const heightUnitLess = y2 - yUnitless;

                if (yUnitless >= 1 || y2 <= 0) return;      //  Value < minimum

                const color = (typeof self.color === "function") ? self.color(feature.value) : self.color;

                if (self.graphType === "points") {
                    const pointSize = self.config.pointSize || 3;
                    const py = feature.value < 0 ? (yUnitless + heightUnitLess) * pixelHeight : yUnitless * pixelHeight;
                    const px = x + width / 2;

                    if (isNaN(x)) {
                        console.log('isNaN(x). feature start ' + igv.numberFormatter(feature.start) + ' bp start ' + igv.numberFormatter(bpStart));
                    } else {
                        igv.graphics.fillCircle(ctx, px, py, pointSize / 2);
                    }

                } else {
                    igv.graphics.fillRect(ctx, x, yUnitless * pixelHeight, width, heightUnitLess * pixelHeight, {fillStyle: color});
                }

            }

        };

        WigTrack.prototype.popupData = function (clickState) {

            // We use the featureCache property rather than method to avoid async load.  If the
            // feature is not already loaded this won't work,  but the user wouldn't be mousing over it either.

            let features = this.clickedFeatures(clickState);

            if (features && features.length > 0) {

                let genomicLocation = clickState.genomicLocation;
                let referenceFrame = clickState.viewport.genomicState.referenceFrame;
                let popupData = [];

                // We need some tolerance around genomicLocation, start with +/- 2 pixels
                let tolerance = 2 * referenceFrame.bpPerPixel;
                let selectedFeature = binarySearch(features, genomicLocation, tolerance);

                if (selectedFeature) {
                    let posString = (selectedFeature.end - selectedFeature.start) === 1 ?
                        igv.numberFormatter(selectedFeature.start + 1)
                        : igv.numberFormatter(selectedFeature.start + 1) + "-" + igv.numberFormatter(selectedFeature.end);
                    popupData.push({name: "Position:", value: posString});
                    popupData.push({
                        name: "Value:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;",
                        value: igv.numberFormatter(selectedFeature.value)
                    });
                }

                return popupData;


            }
            else {
                return [];
            }
        }

        /**
         * Called when the track is removed.  Do any needed cleanup here
         */
        WigTrack.prototype.dispose = function () {
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

        WigTrack.prototype.getState = function () {

            let config = this.config;

            config.autoscale = this.autoscale;

            if (!this.autoscale && this.dataRange) {
                config.min = this.dataRange.min;
                config.max = this.dataRange.max;
            }
            return config;

        }

        WigTrack.prototype.supportsWholeGenome = function () {

            if (typeof this.featureSource.supportsWholeGenome === 'function') {
                return this.featureSource.supportsWholeGenome();
            }
            else {
                return false;
            }

        }

    }

    return igv;

})(igv || {});
