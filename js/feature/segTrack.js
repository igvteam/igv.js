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

    var sortDirection = "DESC";

    igv.SegTrack = function (config, browser) {

        igv.configTrack(this, config);

        this.isLog = config.isLog;

        this.displayMode = config.displayMode || "SQUISHED"; // EXPANDED | SQUISHED
        this.maxHeight = config.maxHeight || 500;
        this.squishedRowHeight = config.sampleSquishHeight ||  config.squishedRowHeight || 2;
        this.expandedRowHeight = config.sampleExpandHeight || config.expandedRowHeight || 12;

        this.posColorScale = config.posColorScale ||
            new igv.GradientColorScale(
                {
                    low: 0.1,
                    lowR: 255,
                    lowG: 255,
                    lowB: 255,
                    high: 1.5,
                    highR: 255,
                    highG: 0,
                    highB: 0
                }
            );
        this.negColorScale = config.negColorScale ||
            new igv.GradientColorScale(
                {
                    low: -1.5,
                    lowR: 0,
                    lowG: 0,
                    lowB: 255,
                    high: -0.1,
                    highR: 255,
                    highG: 255,
                    highB: 255
                }
            );

        this.sampleKeys = [];

        //   this.featureSource = config.sourceType === "bigquery" ?
        //       new igv.BigQueryFeatureSource(this.config) :
        this.featureSource = new igv.FeatureSource(this.config, browser.genome);

    };

    igv.SegTrack.prototype.menuItemList = function () {

        var self = this;

        return [
            {
                name: ("SQUISHED" === this.displayMode) ? "Expand sample hgt" : "Squish sample hgt",
                click: function () {
                    self.toggleSampleHeight();
                }
            }
        ];

    };

    igv.SegTrack.prototype.toggleSampleHeight = function () {

        this.displayMode = ("SQUISHED" === this.displayMode) ? "EXPANDED" : "SQUISHED";
        this.trackView.checkContentHeight();
        this.trackView.repaintViews();
    };

    igv.SegTrack.prototype.getFeatures = function (chr, bpStart, bpEnd) {

        var self = this;


        // If no samples are defined, optionally query feature source.  This step was added to support the TCGA BigQuery
        // if (self.sampleCount === 0 && (typeof self.featureSource.reader.allSamples == "function")) {
        //
        //     return self.featureSource.reader.allSamples()
        //
        //         .then(function (samples) {
        //
        //             samples.forEach(function (sampleKey) {
        //                 self.samples[sampleKey] = self.sampleCount;
        //                 self.sampleKeys.push(sampleKey);
        //                 self.sampleCount++;
        //             })
        //
        //             return self.featureSource.getFeatures(chr, bpStart, bpEnd);
        //         });
        // }
        // else {
        return self.featureSource.getFeatures(chr, bpStart, bpEnd);
        // }

    };


    igv.SegTrack.prototype.draw = function (options) {

        var self = this, featureList, ctx, bpPerPixel, bpStart, pixelWidth, pixelHeight, bpEnd, segment, len, sampleKey,
            i, y, color, value, px, px1, pw, xScale, sampleHeight, border;

        sampleHeight = ("SQUISHED" === this.displayMode) ? this.squishedRowHeight : this.expandedRowHeight;
        border = ("SQUISHED" === this.displayMode) ? 0 : 1;

        ctx = options.context;
        pixelWidth = options.pixelWidth;
        pixelHeight = options.pixelHeight;
        igv.graphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

        featureList = options.features;

        // Create a map for fast id -> row lookup
        let samples = {};
        this.sampleKeys.forEach(function (id, index) {
            samples[id] = index;
        })


        if (featureList) {

            if (self.isLog === undefined) checkForLog(featureList);

            bpPerPixel = options.bpPerPixel;
            bpStart = options.bpStart;
            bpEnd = bpStart + pixelWidth * bpPerPixel + 1;
            xScale = bpPerPixel;

            for (i = 0, len = featureList.length; i < len; i++) {
                sampleKey = featureList[i].sampleKey;
                if (!samples.hasOwnProperty(sampleKey)) {
                    this.sampleKeys.push(sampleKey);
                    samples[sampleKey] = this.sampleKeys.length;
                }
            }

            for (i = 0, len = featureList.length; i < len; i++) {

                segment = featureList[i];

                if (segment.end < bpStart) continue;
                if (segment.start > bpEnd) break;

                segment.row = samples[segment.sampleKey];
                y = samples[segment.sampleKey] * sampleHeight + border;

                value = segment.value;
                if (!self.isLog) {
                    value = igv.Math.log2(value / 2);
                }

                if (value < -0.1) {
                    color = self.negColorScale.getColor(value);
                }
                else if (value > 0.1) {
                    color = self.posColorScale.getColor(value);
                }
                else {
                    color = "white";
                }

                px = Math.round((segment.start - bpStart) / xScale);
                px1 = Math.round((segment.end - bpStart) / xScale);
                pw = Math.max(1, px1 - px);

                igv.graphics.fillRect(ctx, px, y, pw, sampleHeight - 2 * border, {fillStyle: color});

            }
        }
        else {
            console.log("No feature list");
        }


        function checkForLog(featureList) {
            var i;
            if (self.isLog === undefined) {
                self.isLog = false;
                for (i = 0; i < featureList.length; i++) {
                    if (featureList[i].value < 0) {
                        self.isLog = true;
                        return;
                    }
                }
            }
        }

    };

    /**
     * Optional method to compute pixel height to accomodate the list of features.  The implementation below
     * has side effects (modifiying the samples hash).  This is unfortunate, but harmless.
     *
     * @param features
     * @returns {number}
     */
    igv.SegTrack.prototype.computePixelHeight = function (features) {

        var sampleHeight, i, len, sampleKey;

        if (!features) return 0;

        sampleHeight = ("SQUISHED" === this.displayMode) ? this.squishedRowHeight : this.expandedRowHeight;

        // Create a map for fast id -> row lookup
        let samples = new Set(this.sampleKeys);

        for (i = 0, len = features.length; i < len; i++) {
            sampleKey = features[i].sampleKey;
            if (!samples.has(sampleKey)) {
                samples.add(sampleKey);
                this.sampleKeys.push(sampleKey);
            }
        }

        return this.sampleKeys.length * sampleHeight;
    };

    /**
     * Sort samples by the average value over the genomic range in the direction indicated (1 = ascending, -1 descending)
     */
    igv.SegTrack.prototype.sortSamples = function (chr, bpStart, bpEnd, direction) {

        var self = this,
            d2 = (direction === "ASC" ? 1 : -1);

        this.featureSource.getFeatures(chr, bpStart, bpEnd)
            .then(function (featureList) {

                var segment,
                    min,
                    max,
                    f,
                    i,
                    s,
                    sampleKeys,
                    scores = {},
                    bpLength = bpEnd - bpStart + 1;

                // Compute weighted average score for each sample
                for (i = 0; i < featureList.length; i++) {

                    segment = featureList[i];

                    if (segment.end < bpStart) continue;
                    if (segment.start > bpEnd) break;

                    min = Math.max(bpStart, segment.start);
                    max = Math.min(bpEnd, segment.end);
                    f = (max - min) / bpLength;

                    s = scores[segment.sampleKey];
                    if (!s) s = 0;
                    scores[segment.sampleKey] = s + f * segment.value;

                }

                // Now sort sample names by score
                self.sampleKeys.sort(function (a, b) {

                    var s1 = scores[a];
                    var s2 = scores[b];
                    if (!s1) s1 = Number.MAX_VALUE;
                    if (!s2) s2 = Number.MAX_VALUE;

                    if (s1 == s2) return 0;
                    else if (s1 > s2) return d2;
                    else return d2 * -1;

                });


                self.trackView.repaintViews();
                // self.trackView.$viewport.scrollTop(0);


            })
    };

    igv.SegTrack.prototype.popupData = function (clickState) {

        const self = this;

        const featureList = filterByRow(this.clickedFeatures(clickState), clickState.y);

        const items = [];

        featureList.forEach(function (f) {
            extractPopupData(f, items);

        });

        return items;

        function extractPopupData(feature, data) {

            const filteredProperties = new Set(['row', 'color', 'sampleKey', 'uniqueSampleKey', 'uniquePatientKey']);

            Object.keys(feature).forEach(function (property) {
                if (!filteredProperties.has(property) &&
                    igv.isSimpleType(feature[property])) {
                    data.push({name: property, value: feature[property]});
                }
            });
        }

        function filterByRow(features, y) {
            if (!features || 'COLLAPSED' === self.displayMode) {
                return features;
            }
            else {
                let row = 'SQUISHED' === self.displayMode ? Math.floor(y / self.squishedRowHeight) : Math.floor(y / self.expandedRowHeight);

                return features.filter(function (feature) {
                    return   feature.row === undefined || row === feature.row;
                })
            }
        }
    }

    igv.SegTrack.prototype.contextMenuItemList = function (config) {

        var self = this,
            clickHandler;


        clickHandler = function () {

            var genomicLocation = config.genomicLocation,
                referenceFrame = config.viewport.genomicState.referenceFrame;

            // Define a region 5 "pixels" wide in genomic coordinates
            var bpWidth = referenceFrame.toBP(2.5);

            self.sortSamples(referenceFrame.chrName, genomicLocation - bpWidth, genomicLocation + bpWidth, sortDirection);

            sortDirection = (sortDirection === "ASC" ? "DESC" : "ASC");


        };

        return [{label: 'Sort by value', click: clickHandler, init: undefined}];

    };
    
    igv.SegTrack.prototype.supportsWholeGenome = function () {
        return true;
    }
    

    return igv;

})(igv || {});
