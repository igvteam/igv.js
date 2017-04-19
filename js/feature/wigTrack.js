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

        if (config.color === undefined) config.color = "rgb(150,150,150)";   // Hack -- should set a default color per track type

        igv.configTrack(this, config);

        if ("bigwig" === config.format) {
            this.featureSource = new igv.BWSource(config);
        } else if ("tdf" === config.format) {
            this.featureSource = new igv.TDFSource(config);
        } else {
            this.featureSource = new igv.FeatureSource(config);
        }

        // Min and max values.  No defaults for these, if they aren't set track will autoscale.
        this.autoScale = (config.max === undefined);
        this.dataRange = {
            min: config.min,
            max: config.max
        };

        this.paintAxis = igv.paintAxis;

    };

    igv.WIGTrack.prototype.getFeatures = function (chr, bpStart, bpEnd, bpPerPixel) {

        var self = this;
        return new Promise(function (fulfill, reject) {
            self.featureSource.getFeatures(chr, bpStart, bpEnd, bpPerPixel).then(fulfill).catch(reject);
        });
    };

    igv.WIGTrack.prototype.menuItemList = function (popover) {

        var self = this,
            menuItems = [];

        menuItems.push(igv.colorPickerMenuItem(popover, this.trackView));

        menuItems.push(igv.dataRangeMenuItem(popover, this.trackView));

        menuItems.push({
            object: $(htmlStringified(self.autoScale)),
            click: function () {
                var $fa = $(this).find('i');

                popover.hide();

                self.autoScale = !self.autoScale;

                if (true === self.autoScale) {
                    $fa.removeClass('fa-check-hidden');
                } else {
                    $fa.addClass('fa-check-hidden');
                }

                self.trackView.update();
            }
        });

        function htmlStringified(autoScale) {
            var html = [];

            html.push('<div>');
            html.push(true === autoScale ? '<i class="fa fa-check">' : '<i class="fa fa-check fa-check-hidden">');
            html.push('</i>');
            html.push('Autoscale');
            html.push('</div>');

            return html.join('');
        }

        return menuItems;

    };

    igv.WIGTrack.prototype.getFileHeader = function () {

        var self = this;
        return new Promise(function (fulfill, reject) {
            if (typeof self.featureSource.getFileHeader === "function") {

                self.featureSource.getFileHeader().then(function (header) {

                    if (header) {
                        // Header (from track line).  Set properties,unless set in the config (config takes precedence)
                        if (header.name && !self.config.name) {
                            self.name = header.name;
                        }
                        if (header.color && !self.config.color) {
                            self.color = "rgb(" + header.color + ")";
                        }
                    }
                    fulfill(header);

                }).catch(reject);
            }
            else {
                fulfill(null);
            }
        });
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
            $dataRangeTrackLabel,
            str,
            min,
            max;


        if (features && features.length > 0) {
            if (self.autoScale || self.dataRange.max === undefined) {
                var s = autoscale(features);
                featureValueMinimum = s.min;
                featureValueMaximum = s.max;
            }
            else {
                featureValueMinimum = self.dataRange.min === undefined ? 0 : self.dataRange.min;
                featureValueMaximum = self.dataRange.max;
            }
            self.dataRange.min = featureValueMinimum;  // Record for disply, menu, etc
            self.dataRange.max = featureValueMaximum;

            featureValueRange = featureValueMaximum - featureValueMinimum;

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
            igv.graphics.fillRect(ctx, x, yUnitless * pixelHeight, width, heightUnitLess * pixelHeight, {fillStyle: self.color});

        }

    };

    function autoscale(features) {
        var min = 0,
            max = -Number.MAX_VALUE;

        features.forEach(function (f) {
            if(!Number.isNaN(f.value)) {
                min = Math.min(min, f.value);
                max = Math.max(max, f.value);
            }
        });

        return {min: min, max: max};

    }

    function signsDiffer(a, b) {
        return (a > 0 && b < 0 || a < 0 && b > 0);
    }


    return igv;

})(igv || {});
