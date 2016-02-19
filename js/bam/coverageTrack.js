/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016 University of California San Diego
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

    igv.CoverageTrack = function (config, featureSource) {

        igv.configTrack(this, config);

        this.visibilityWindow = config.visibilityWindow || 30000;     // 30kb default

        this.alignmentRowHeight = config.alignmentRowHeight || 14;

        this.height = config.coverageTrackHeight || 50;

        this.defaultColor = config.defaultColor || "rgb(185, 185, 185)";
        this.color = config.color || this.defaultColor;
        this.negStrandColor = config.negStrandColor || "rgba(150, 150, 230, 0.75)";
        this.posStrandColor = config.posStrandColor || "rgba(230, 150, 150, 0.75)";
        this.firstInfPairColor = "rgba(150, 150, 230, 0.75)";
        this.secondInPairColor = "rgba(230, 150, 150, 0.75)";
        this.insertionColor = config.insertionColor || "rgb(138, 94, 161)";

        this.deletionColor = config.deletionColor || "black";

        this.skippedColor = config.skippedColor || "rgb(150, 170, 170)";

        // alignment shading options
        this.alignmentShading = config.alignmentShading || "none";

        // sort alignment rows
        this.sortOption = config.sortOption || {sort: "NUCLEOTIDE"};

        // filter alignments
        this.filterOption = config.filterOption || {name: "mappingQuality", params: [30, undefined]};

        this.featureSource = featureSource;

        this.sortDirection = true;
    };


    igv.CoverageTrack.prototype.getFeatures = function (chr, bpStart, bpEnd) {

        var self = this;

        if (igv.browser.trackViewportWidthBP() > self.visibilityWindow) {
            // Don't try to draw alignments for windows > the visibility window
            return new Promise(function (fulfill, reject) {
                fulfill({exceedsVisibilityWindow: true});
            });
        }
        else {
            return self.featureSource.getAlignments(chr, bpStart, bpEnd);
        }
    }


    igv.CoverageTrack.prototype.draw = function (options) {

        var self = this,
            genomicInterval = options.features,
            ctx = options.context,
            bpPerPixel = options.bpPerPixel,
            bpStart = options.bpStart,
            pixelWidth = options.pixelWidth,
            bpEnd = bpStart + pixelWidth * bpPerPixel + 1,
            coverageMap = genomicInterval.coverageMap,
            bp,
            x,
            y,
            w,
            h,
            refBase,
            i,
            len,
            item,
            accumulatedHeight,
            sequence;


        if (coverageMap.refSeq) sequence = coverageMap.refSeq.toUpperCase();


        // paint backdrop color for all coverage buckets
        w = Math.max(1, Math.ceil(1.0 / bpPerPixel));
        for (i = 0, len = coverageMap.coverage.length; i < len; i++) {

            bp = (coverageMap.bpStart + i);
            if (bp < bpStart) continue;
            if (bp > bpEnd) break;

            item = coverageMap.coverage[i];
            if (!item) continue;

            h = (item.total / coverageMap.maximum) * self.height;
            y = self.height - h;
            x = Math.floor((bp - bpStart) / bpPerPixel);

            igv.graphics.setProperties(ctx, {fillStyle: self.color, strokeStyle: self.color});
            igv.graphics.fillRect(ctx, x, y, w, h);

            // coverage mismatch coloring
            if (sequence) {

                refBase = sequence[i];
                if (item.isMismatch(refBase)) {

                    igv.graphics.setProperties(ctx, {fillStyle: igv.nucleotideColors[refBase]});
                    igv.graphics.fillRect(ctx, x, y, w, h);

                    accumulatedHeight = 0.0;
                    ["A", "C", "T", "G"].forEach(function (nucleotide) {

                        var count,
                            hh;

                        count = item["pos" + nucleotide] + item["neg" + nucleotide];


                        // non-logoritmic
                        hh = (count / coverageMap.maximum) * self.height;

                        y = (self.height - hh) - accumulatedHeight;
                        accumulatedHeight += hh;

                        igv.graphics.setProperties(ctx, {fillStyle: igv.nucleotideColors[nucleotide]});
                        igv.graphics.fillRect(ctx, x, y, w, hh);

                    });
                }
            }
        }
    }

    igv.CoverageTrack.prototype.popupData = function (genomicLocation, xOffset, yOffset) {

        var coverageMap = this.featureSource.alignmentContainer.coverageMap,
            coverageMapIndex,
            coverage,
            nameValues = [];


        coverageMapIndex = genomicLocation - coverageMap.bpStart;
        coverage = coverageMap.coverage[coverageMapIndex];

        if (coverage) {


            nameValues.push(igv.browser.referenceFrame.chr + ":" + igv.numberFormatter(1 + genomicLocation));

            nameValues.push({name: 'Total Count', value: coverage.total});

            // A
            tmp = coverage.posA + coverage.negA;
            if (tmp > 0)  tmp = tmp.toString() + " (" + Math.floor(((coverage.posA + coverage.negA) / coverage.total) * 100.0) + "%)";
            nameValues.push({name: 'A', value: tmp});


            // C
            tmp = coverage.posC + coverage.negC;
            if (tmp > 0)  tmp = tmp.toString() + " (" + Math.floor((tmp / coverage.total) * 100.0) + "%)";
            nameValues.push({name: 'C', value: tmp});

            // G
            tmp = coverage.posG + coverage.negG;
            if (tmp > 0)  tmp = tmp.toString() + " (" + Math.floor((tmp / coverage.total) * 100.0) + "%)";
            nameValues.push({name: 'G', value: tmp});

            // T
            tmp = coverage.posT + coverage.negT;
            if (tmp > 0)  tmp = tmp.toString() + " (" + Math.floor((tmp / coverage.total) * 100.0) + "%)";
            nameValues.push({name: 'T', value: tmp});

            // N
            tmp = coverage.posN + coverage.negN;
            if (tmp > 0)  tmp = tmp.toString() + " (" + Math.floor((tmp / coverage.total) * 100.0) + "%)";
            nameValues.push({name: 'N', value: tmp});

        }


        return nameValues;

    };


    return igv;

})
(igv || {});
