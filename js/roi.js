/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 The Regents of the University of California
 * Author: Jim Robinson
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

    igv.ROI = function (config) {

        this.isLoaded = false;
        this.config = config;
        this.roiSource = new igv.ROISource(config);
    };

    igv.ROI.prototype.getRegions = function () {

        var self = this;

        this.roiSource
            .getRegions('all')
            .then(function (regions) {
                console.log('roi - features ' + _.size(regions));
                self.regions = regions;
                self.isLoaded = true;
            })
            .catch(function (error) {
                igv.presentAlert(error);
            });
    };

    igv.ROI.prototype.draw = function (options) {

        var self = this,
            regions,
            bpEnd,
            coord,
            color,
            region;

        igv.graphics.fillRect(options.context, 0, 0, options.pixelWidth, options.pixelHeight, { fillStyle:'rgb(255, 255, 255)' });

        if (options.features) {

            regions = options.features;
            bpEnd = options.bpStart + (options.pixelWidth * options.bpPerPixel + 1);
            for (var i = 0, len = regions.length; i < len; i++) {

                region = regions[ i ];
                if (region.end < options.bpStart) {
                    continue;
                }

                if (region.start > bpEnd) {
                    break;
                }

                color = this.color;

                if (feature.color) {
                    color = region.color;
                }

                options.context.fillStyle = color;
                options.context.strokeStyle = color;

                coord = coordinates(region, options.bpStart, options.bpPerPixel);
                options.context.fillRect(coord.x, 0, coord.width, this.featureHeight);

            }

        }

    };

    function coordinates(region, startBP, bpp) {

        var ss,
            ee,
            width;

        ss = Math.round((region.start - startBP) / bpp);
        ee = Math.round((region.end - startBP) / bpp);
        width = ee - ss;

        if (width < 3) {
            width = 3;
            ss -= 1;
        }

        return { x: ss, width: width };
    }

    return igv;

})
(igv || {});
