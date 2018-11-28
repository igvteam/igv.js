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

    let SegTrack;

    if (!igv.trackFactory) {
        igv.trackFactory = {};
    }

    igv.trackFactory["seg"] = function (config, browser) {

        if (!SegTrack) {
            defineClass();
        }

        return new SegTrack(config, browser);
    }


    function defineClass() {

        SegTrack = igv.extend(igv.TrackBase,

            function (config, browser) {

                igv.TrackBase.call(this, config, browser);

                this.isLog = config.isLog;

                this.supportHiDPI = (config.supportHiDPI !== undefined) ? config.supportHiDPI : false;

                this.displayMode = config.displayMode || "SQUISHED"; // EXPANDED | SQUISHED
                this.maxHeight = config.maxHeight || 500;
                this.squishedRowHeight = config.sampleSquishHeight || config.squishedRowHeight || 2;
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

                if (config.sort) {
                    const sort = config.sort;
                    this.sortSamples(sort.chr, sort.start, sort.end, sort.direction);
                }

            });

        SegTrack.prototype.menuItemList = function () {

            const self = this;

            const menuItems = [];
            const lut =
                {
                    "SQUISHED": "Squish",
                    "EXPANDED": "Expand",
                    "FILL": "Fill",
                };

            ["SQUISHED", "EXPANDED", "FILL"].forEach(function (displayMode) {
                menuItems.push(
                    {
                        object: igv.createCheckbox(lut[displayMode], displayMode === self.displayMode),
                        click: function () {
                            self.browser.popover.hide();
                            self.displayMode = displayMode;
                            self.config.displayMode = displayMode;
                            self.trackView.resetScroll();
                            self.trackView.checkContentHeight();
                            self.trackView.repaintViews();
                        }
                    });
            })

            return menuItems;
            //
            // {
            //     name: ("SQUISHED" === this.displayMode) ? "Expand sample hgt" : "Squish sample hgt",
            //     click: function () {
            //         self.toggleSampleHeight();
            //     }
            // }


        };
        //
        // SegTrack.prototype.toggleSampleHeight = function () {
        //
        //     this.displayMode = ("SQUISHED" === this.displayMode) ? "EXPANDED" : "SQUISHED";
        //     this.trackView.checkContentHeight();
        //     this.trackView.repaintViews();
        // };

        SegTrack.prototype.getFeatures = function (chr, bpStart, bpEnd) {

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


        SegTrack.prototype.draw = function (options) {

            const self = this;

            const v2 = igv.Math.log2(2);

            const ctx = options.context;
            const pixelWidth = options.pixelWidth;
            const pixelHeight = options.pixelHeight;
            igv.graphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

            const featureList = options.features;

            if (featureList && featureList.length > 0) {

                if (self.isLog === undefined) checkForLog(featureList);

                const bpPerPixel = options.bpPerPixel;
                const bpStart = options.bpStart;
                const bpEnd = bpStart + pixelWidth * bpPerPixel + 1;
                const xScale = bpPerPixel;

                updateSampleKeys.call(this, featureList);

                // Create a map for fast id -> row lookup
                const samples = {};
                this.sampleKeys.forEach(function (id, index) {
                    samples[id] = index;
                })


                let sampleHeight;
                let border;
                switch (this.displayMode) {

                    case "FILL":
                        sampleHeight = options.pixelHeight / this.sampleKeys.length;
                        border = 0
                        break;

                    case "SQUISHED":
                        sampleHeight = this.squishedRowHeight;
                        border = 0;
                        break;

                    default:   // EXPANDED
                        sampleHeight = this.expandedRowHeight;
                        border = 1;

                }

                for (let segment of featureList) {

                    if (segment.end < bpStart) continue;
                    if (segment.start > bpEnd) break;

                    segment.row = samples[segment.sampleKey];
                    const y = samples[segment.sampleKey] * sampleHeight + border;

                    let value = segment.value;
                    if (!self.isLog) {
                        value = igv.Math.log2(value / 2);
                    }

                    let color;
                    if (value < -0.1) {
                        color = self.negColorScale.getColor(value);
                    }
                    else if (value > 0.1) {
                        color = self.posColorScale.getColor(value);
                    }
                    else {
                        color = "white";
                    }

                    const segmentStart = Math.max(segment.start, bpStart);
                    // const segmentStart = segment.start;
                    const px = Math.round((segmentStart - bpStart) / xScale);

                    const segmentEnd = Math.min(segment.end, bpEnd);
                    // const segmentEnd = segment.end;
                    const px1 = Math.round((segmentEnd - bpStart) / xScale);

                    const pw = Math.max(1, px1 - px);

                    // const sign = px < 0 ? '-' : '+';
                    // console.log('start ' + sign + igv.numberFormatter(Math.abs(px)) + ' width ' + igv.numberFormatter(pw) + ' end ' + igv.numberFormatter(px + pw));

                    ctx.fillStyle = color;

                    // Enhance the contrast of sub-pixel displays (FILL mode) by adjusting sample height.
                    let sh = sampleHeight;
                    if (sampleHeight < 0.25) {
                        const f = 0.1 + 2 * Math.abs(value);
                        sh = Math.min(1, f * sampleHeight);
                    }

                    segment.pixelRect = {x: px, y: y, w: pw, h: sh - 2 * border};
                    ctx.fillRect(px, y, pw, sh - 2 * border);

                    //igv.graphics.fillRect(ctx, px, y, pw, sampleHeight - 2 * border, {fillStyle: color});

                }
            }
            else {
                console.log("No feature list");
            }


            function checkForLog(featureList) {

                if (self.isLog === undefined && featureList.length > 10) {
                    self.isLog = false;
                    for (let feature of featureList) {
                        if (feature.value < 0) {
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
        SegTrack.prototype.computePixelHeight = function (features) {

            if (!features) return 0;

            const sampleHeight = ("SQUISHED" === this.displayMode) ? this.squishedRowHeight : this.expandedRowHeight;

            updateSampleKeys.call(this, features);

            return this.sampleKeys.length * sampleHeight;
        };

        /**
         * Sort samples by the average value over the genomic range in the direction indicated (1 = ascending, -1 descending)
         */
        SegTrack.prototype.sortSamples = function (chr, bpStart, bpEnd, direction) {

            const self = this;


            this.featureSource.getFeatures(chr, bpStart, bpEnd)

                .then(function (featureList) {

                    updateSampleKeys.call(self, featureList);

                    const scores = {};
                    const bpLength = bpEnd - bpStart + 1;

                    // Compute weighted average score for each sample
                    for (let segment of featureList) {

                        if (segment.end < bpStart) continue;
                        if (segment.start > bpEnd) break;

                        const min = Math.max(bpStart, segment.start);
                        const max = Math.min(bpEnd, segment.end);
                        const f = (max - min) / bpLength;

                        const s = scores[segment.sampleKey] || 0;
                        scores[segment.sampleKey] = s + f * segment.value;

                    }


                    // Now sort sample names by score

                    const d2 = (direction === "ASC" ? 1 : -1);
                    self.sampleKeys.sort(function (a, b) {

                        var s1 = scores[a];
                        var s2 = scores[b];
                        if (!s1) s1 = d2 * Number.MAX_VALUE;
                        if (!s2) s2 = d2 * Number.MAX_VALUE;

                        if (s1 == s2) return 0;
                        else if (s1 > s2) return d2;
                        else return d2 * -1;

                    });


                    self.trackView.repaintViews();
                    // self.trackView.$viewport.scrollTop(0);


                })
        };

        SegTrack.prototype.popupData = function (clickState) {

            const self = this;

            const featureList = filterByRow(this.clickedFeatures(clickState), clickState.y);

            const items = [];

            for (let f of featureList) {
            }
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

                    return features.filter(function (feature) {
                        const rect = feature.pixelRect;
                        return rect && y >= rect.y && y <= (rect.y + rect.h);
                    });

            }
        }

        SegTrack.prototype.contextMenuItemList = function (clickState) {

            const self = this;
            const referenceFrame = clickState.viewport.genomicState.referenceFrame;
            const genomicLocation = clickState.genomicLocation;

            // Define a region 5 "pixels" wide in genomic coordinates
            const sortDirection = this.config.sort ?
                (this.config.sort.direction === "ASC" ? "DESC" : "ASC") :      // Toggle from previous sort
                "DESC";
            const bpWidth = referenceFrame.toBP(2.5);

            function sortHandler(sort) {
                self.sortSamples(sort.chr, sort.start, sort.end, sort.direction);
            }

            return [
                {
                    label: 'Sort by value', click: function (e) {


                        const sort = {
                            direction: sortDirection,
                            chr: referenceFrame.chrName,
                            start: genomicLocation - bpWidth,
                            end: genomicLocation + bpWidth

                        };

                        sortHandler(sort);

                        self.config.sort = sort;

                    }
                }];

        };


        SegTrack.prototype.supportsWholeGenome = function () {
            return true;
        }


        function updateSampleKeys(featureList) {

            const samples = new Set(this.sampleKeys);

            for (let feature of featureList) {

                const sampleKey = feature.sampleKey;
                if (!samples.has(sampleKey)) {
                    samples.add(sampleKey);
                    this.sampleKeys.push(sampleKey);
                }
            }
        }
    }


    return igv;

})(igv || {});
