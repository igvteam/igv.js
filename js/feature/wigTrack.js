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
            featureValueMinimum,
            featureValueMaximum,
            featureValueRange,
            canvasHeight,
            survivors,
            mapped;

        igv.graphics.fillRect(options.context, 0, 0, options.pixelWidth, options.pixelHeight, { fillStyle: igv.rgbColor(255, 255, 255) });

        renderRamp(options.context, options.pixelWidth, options.pixelHeight, igv.randomRGB(100, 255));
        return;

        if (options.features && _.size(options.features) > 0) {
            if (self.autoScale || self.dataRange.max === undefined) {
                var s = autoscale(options.features);
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

            survivors = _.filter(options.features, function(f){
                return !(f.end < options.bpStart) || !(f.start > options.bpEnd);
            });

            mapped = _.map(survivors, function(s) {
                var rectEnd,
                    obj = {};

                obj.x = Math.floor((s.start - options.bpStart) / options.bpPerPixel);

                rectEnd = Math.ceil((s.end - options.bpStart) / options.bpPerPixel);
                obj.width = Math.max(1, rectEnd - obj.x);
                obj.value = s.value;
                return obj;
            });

            canvasHeight = options[ ('x' === this.config.axis ? 'pixelHeight' : 'pixelWidth') ];

            _.each(mapped, function(m) {
                render(options.context, m, /*igv.randomRGB(120, 240)*/self.color, canvasHeight);
            });
        }

        function render(ctx, feature, fillStyle, height) {

            var yPercentage,
                heightPercentage;

            if (signsDiffer(featureValueMinimum, featureValueMaximum)) {

                if (feature.value < 0) {
                    yPercentage = featureValueMaximum / featureValueRange;
                    heightPercentage = -feature.value / featureValueRange;
                } else {
                    yPercentage = ((featureValueMaximum - feature.value) / featureValueRange);
                    heightPercentage = feature.value / featureValueRange;
                }

            } else if (featureValueMinimum < 0) {
                yPercentage = 0;
                heightPercentage = -feature.value / featureValueRange;
            } else {
                yPercentage = 1.0 - feature.value / featureValueRange;
                heightPercentage = feature.value / featureValueRange;
            }

            igv.graphics.fillRect(ctx, feature.x, yPercentage * height, feature.width, heightPercentage * height, { fillStyle: fillStyle });

            // igv.graphics.fillRect(options.context, x, 0, w, h, { fillStyle: igv.randomRGB(100, 255) });

        }

        function renderRamp(ctx, width, height, fillStyle) {
            _.each(_.range(width), function(x){
                var percent = x/width,
                    a,
                    b;
                // igv.graphics.fillRect(ctx, x, 0, 1, Math.round(percent * height), { fillStyle: igv.randomRGB(100, 255) });

                a = (1.0 - percent) * height;
                b = percent * height;
                igv.graphics.fillRect(ctx, x, a, 1, b, { fillStyle: fillStyle });
            });

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
