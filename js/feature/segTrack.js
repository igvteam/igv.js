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

import FeatureSource from './featureSource.js';
import TrackBase from "../trackBase.js";
import IGVGraphics from "../igv-canvas.js";
import IGVMath from "../igv-math.js";
import {createCheckbox} from "../igv-icons.js";
import {GradientColorScale} from "../util/colorScale.js";
import {extend, isSimpleType} from "../util/igvUtils.js";

const SegTrack = extend(TrackBase,

    function (config, browser) {

        TrackBase.call(this, config, browser);

        this.isLog = config.isLog;
        this.displayMode = config.displayMode || "SQUISHED"; // EXPANDED | SQUISHED
        this.maxHeight = config.maxHeight || 500;
        this.squishedRowHeight = config.sampleSquishHeight || config.squishedRowHeight || 2;
        this.expandedRowHeight = config.sampleExpandHeight || config.expandedRowHeight || 12;


        this.posColorScale = config.posColorScale ||
            new GradientColorScale(
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
            new GradientColorScale(
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
        this.featureSource = new FeatureSource(this.config, browser.genome);

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

    menuItems.push("<hr/>");
    menuItems.push("Sample Height");

    ["SQUISHED", "EXPANDED", "FILL"].forEach(function (displayMode) {
        menuItems.push(
            {
                object: createCheckbox(lut[displayMode], displayMode === self.displayMode),
                click: function () {
                    self.displayMode = displayMode;
                    self.config.displayMode = displayMode;
                    self.trackView.checkContentHeight();
                    self.trackView.repaintViews();
                }
            });
    })

    return menuItems;

};


SegTrack.prototype.getFeatures = function (chr, bpStart, bpEnd) {
    return this.featureSource.getFeatures(chr, bpStart, bpEnd);
};


SegTrack.prototype.draw = function (options) {

    const self = this;

    const v2 = IGVMath.log2(2);

    const ctx = options.context;
    const pixelWidth = options.pixelWidth;
    const pixelHeight = options.pixelHeight;
    IGVGraphics.fillRect(ctx, 0, options.pixelTop, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

    const featureList = options.features;

    if (featureList && featureList.length > 0) {

        if (self.isLog === undefined) checkForLog(featureList);

        const bpPerPixel = options.bpPerPixel;
        const bpStart = options.bpStart;
        const bpEnd = bpStart + pixelWidth * bpPerPixel + 1;
        const xScale = bpPerPixel;

        this.updateSampleKeys(featureList);

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

            const sampleKey = segment.sampleKey || segment.sample
            segment.row = samples[sampleKey];
            const y = samples[sampleKey] * sampleHeight + border;

            let value = segment.value;
            if (!self.isLog) {
                value = IGVMath.log2(value / 2);
            }

            let color;
            if (value < -0.1) {
                color = self.negColorScale.getColor(value);
            } else if (value > 0.1) {
                color = self.posColorScale.getColor(value);
            } else {
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
            // console.log('start ' + sign + numberFormatter(Math.abs(px)) + ' width ' + numberFormatter(pw) + ' end ' + numberFormatter(px + pw));

            ctx.fillStyle = color;

            // Enhance the contrast of sub-pixel displays (FILL mode) by adjusting sample height.
            let sh = sampleHeight;
            if (sampleHeight < 0.25) {
                const f = 0.1 + 2 * Math.abs(value);
                sh = Math.min(1, f * sampleHeight);
            }

            segment.pixelRect = {x: px, y: y, w: pw, h: sh - 2 * border};
            ctx.fillRect(px, y, pw, sh - 2 * border);

            //IGVGraphics.fillRect(ctx, px, y, pw, sampleHeight - 2 * border, {fillStyle: color});

        }
    } else {
        console.log("No feature list");
    }


    function checkForLog(featureList) {

        if (self.isLog === undefined) {
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
    this.updateSampleKeys(features);
    return this.sampleKeys.length * sampleHeight;
};

/**
 * Sort samples by the average value over the genomic range in the direction indicated (1 = ascending, -1 descending)
 */
SegTrack.prototype.sortSamples = async function (chr, bpStart, bpEnd, direction) {

    const featureList = await this.featureSource.getFeatures(chr, bpStart, bpEnd);
    this.updateSampleKeys(featureList);

    const scores = {};
    const bpLength = bpEnd - bpStart + 1;

    // Compute weighted average score for each sample
    for (let segment of featureList) {

        if (segment.end < bpStart) continue;
        if (segment.start > bpEnd) break;

        const min = Math.max(bpStart, segment.start);
        const max = Math.min(bpEnd, segment.end);
        const f = (max - min) / bpLength;

        const sampleKey = segment.sampleKey || segment.sample
        const s = scores[sampleKey] || 0;
        scores[sampleKey] = s + f * segment.value;
    }

    // Now sort sample names by score
    const d2 = (direction === "ASC" ? 1 : -1);
    this.sampleKeys.sort(function (a, b) {
        let s1 = scores[a];
        let s2 = scores[b];
        if (!s1) s1 = d2 * Number.MAX_VALUE;
        if (!s2) s2 = d2 * Number.MAX_VALUE;
        if (s1 === s2) return 0;
        else if (s1 > s2) return d2;
        else return d2 * -1;
    });

    this.trackView.repaintViews();
    // self.trackView.$viewport.scrollTop(0);
};

SegTrack.prototype.clickedFeatures = function (clickState) {

    const allFeatures = TrackBase.prototype.clickedFeatures.call(this, clickState);
    return filterByRow(allFeatures, clickState.y);

    function filterByRow(features, y) {

        return features.filter(function (feature) {
            const rect = feature.pixelRect;
            return rect && y >= rect.y && y <= (rect.y + rect.h);
        });

    }
}

SegTrack.prototype.popupData = function (clickState, featureList) {

    const self = this;

    if (!featureList) featureList = this.clickedFeatures(clickState);

    const items = [];

    for (let f of featureList) {
    }
    featureList.forEach(function (f) {
        extractPopupData(f, items);

    });

    return items;

    function extractPopupData(feature, data) {

        const filteredProperties = new Set(['row', 'color', 'sampleKey', 'uniqueSampleKey', 'uniquePatientKey']);

        // hack for whole genome properties
        let f
        if (feature.hasOwnProperty('realChr')) {
            f = Object.assign({}, feature);
            f.chr = feature.realChr;
            f.start = feature.realStart;
            f.end = feature.realEnd;
            delete f.realChr;
            delete f.realStart;
            delete f.realEnd;
        } else {
            f = feature;
        }


        for (let property of Object.keys(f)) {

            if (!filteredProperties.has(property) && isSimpleType(f[property])) {
                data.push({name: property, value: f[property]});
            }
        }
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
    return this.featureSource.supportsWholeGenome();
}


SegTrack.prototype.updateSampleKeys = function (featureList) {

    const samples = new Set(this.sampleKeys);

    for (let feature of featureList) {

        const sampleKey = feature.sampleKey || feature.sample;
        if (!samples.has(sampleKey)) {
            samples.add(sampleKey);
            this.sampleKeys.push(sampleKey);
        }
    }
}

export default SegTrack;
