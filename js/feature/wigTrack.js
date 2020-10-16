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
import TDFSource from "../tdf/tdfSource.js";
import TrackBase from "../trackBase.js";
import BWSource from "../bigwig/bwSource.js";
import IGVGraphics from "../igv-canvas.js";
import paintAxis from "../util/paintAxis.js";
import {IGVColor, StringUtils} from "../../node_modules/igv-utils/src/index.js";
import MenuUtils from "../ui/menuUtils.js";
import deepCopy from "../util/deepCopy.js";


class WigTrack extends TrackBase {

    constructor(config, browser) {


        // Default color, might be overridden by track line
        if (config.color === undefined) {
            config.color = "rgb(150,150,150)";
        }

        if (config.height === undefined) {
            config.height = 50;
        }

        super(config, browser);
        this.type = "wig";

        this.featureType = 'numeric';


        const format = config.format ? config.format.toLowerCase() : config.format;
        if ("bigwig" === format) {
            this.featureSource = new BWSource(config, browser.genome);
        } else if ("tdf" === format) {
            this.featureSource = new TDFSource(config, browser.genome);
        } else {
            this.featureSource = FeatureSource(config, browser.genome);
        }

        this.autoscale = config.autoscale || config.max === undefined;
        if (!this.autoscale) {
            this.dataRange = {
                min: config.min || 0,
                max: config.max
            }
        }

        this.windowFunction = config.windowFunction || "mean";
        this.paintAxis = paintAxis;
        this.graphType = config.graphType || "bar";

    }

    async postInit() {
        const header = await this.getHeader();
        if (header) this.setTrackProperties(header)
    }

    async getFeatures(chr, start, end, bpPerPixel) {
        return this.featureSource.getFeatures({chr, start, end, bpPerPixel, windowFunction: this.windowFunction});
    }

    menuItemList() {
        return MenuUtils.numericDataMenuItems(this.trackView)
    }

    async getHeader() {

        if (typeof this.featureSource.getHeader === "function") {
            this.header = await this.featureSource.getHeader();
        }
        return this.header;
    }

    draw(options) {

        let self = this;

        const features = options.features;
        const ctx = options.context;
        const bpPerPixel = options.bpPerPixel;
        const bpStart = options.bpStart;
        const pixelWidth = options.pixelWidth;
        const pixelHeight = options.pixelHeight;
        const bpEnd = bpStart + pixelWidth * bpPerPixel + 1;
        let lastPixelEnd = -1;
        let lastValue = -1;
        let lastNegValue = 1;

        let baselineColor;
        if (typeof self.color === "string" && self.color.startsWith("rgb(")) {
            baselineColor = IGVColor.addAlpha(self.color, 0.1);
        }

        const yScale = (yValue) => {
            return ((self.dataRange.max - yValue) / (self.dataRange.max - self.dataRange.min)) * pixelHeight
        };

        if (features && features.length > 0) {

            if (self.dataRange.min === undefined) self.dataRange.min = 0;

            // Max can be less than min if config.min is set but max left to autoscale.   If that's the case there is
            // nothing to paint.
            if (self.dataRange.max > self.dataRange.min) {


                const y0 = self.dataRange.min == 0 ? pixelHeight : yScale(0);
                for (let f of features) {

                    if (f.end < bpStart) continue;
                    if (f.start > bpEnd) break;

                    const x = Math.floor((f.start - bpStart) / bpPerPixel)
                    if (isNaN(x)) continue;

                    let y = yScale(f.value);

                    const rectEnd = Math.ceil((f.end - bpStart) / bpPerPixel);
                    const width = Math.max(1, rectEnd - x);

                    let c = (f.value < 0 && self.altColor) ? self.altColor : self.color;
                    const color = (typeof c === "function") ? c(f.value) : c;

                    if (self.graphType === "points") {
                        const pointSize = self.config.pointSize || 3;
                        const px = x + width / 2;
                        IGVGraphics.fillCircle(ctx, px, y, pointSize / 2, {"fillStyle": color, "strokeStyle": color});

                    } else {
                        let height = y - y0;
                        if ((Math.abs(height)) < 1) {
                            height = height < 0 ? -1 : 1
                        }
                        const pixelEnd = x + width;
                        if (pixelEnd > lastPixelEnd || (f.value >= 0 && f.value > lastValue) || (f.value < 0 && f.value < lastNegValue)) {
                            IGVGraphics.fillRect(ctx, x, y0, width, height, {fillStyle: color});
                        }
                        lastValue = f.value;
                        lastPixelEnd = pixelEnd;
                    }
                }

                // If the track includes negative values draw a baseline
                if (self.dataRange.min < 0) {
                    const basepx = (self.dataRange.max / (self.dataRange.max - self.dataRange.min)) * options.pixelHeight;
                    IGVGraphics.strokeLine(ctx, 0, basepx, options.pixelWidth, basepx, {strokeStyle: baselineColor});
                }


            }
        }

        // Draw guidelines
        if (self.config.hasOwnProperty('guideLines')) {
            for (let line of self.config.guideLines) {
                if (line.hasOwnProperty('color') && line.hasOwnProperty('y') && line.hasOwnProperty('dotted')) {
                    let y = yScale(line.y);
                    let props = {
                        'strokeStyle': line['color'],
                        'strokeWidth': 2
                    };
                    if (line['dotted']) IGVGraphics.dashedLine(options.context, 0, y, options.pixelWidth, y, 5, props);
                    else IGVGraphics.strokeLine(options.context, 0, y, options.pixelWidth, y, props);
                }
            }
        }
    }

    popupData(clickState, features) {

        // We use the featureCache property rather than method to avoid async load.  If the
        // feature is not already loaded this won't work,  but the user wouldn't be mousing over it either.

        if (!features) features = this.clickedFeatures(clickState);

        if (features && features.length > 0) {

            let genomicLocation = clickState.genomicLocation;
            let referenceFrame = clickState.viewport.referenceFrame;
            let popupData = [];

            // We need some tolerance around genomicLocation, start with +/- 2 pixels
            let tolerance = 2 * referenceFrame.bpPerPixel;
            let selectedFeature = binarySearch(features, genomicLocation, tolerance);

            if (selectedFeature) {
                let posString = (selectedFeature.end - selectedFeature.start) === 1 ?
                    StringUtils.numberFormatter(selectedFeature.start + 1)
                    : StringUtils.numberFormatter(selectedFeature.start + 1) + "-" + StringUtils.numberFormatter(selectedFeature.end);
                popupData.push({name: "Position:", value: posString});
                popupData.push({
                    name: "Value:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;",
                    value: StringUtils.numberFormatter(selectedFeature.value)
                });
            }

            return popupData;


        } else {
            return [];
        }
    }

    getState  () {
        const state = deepCopy(this.config);
        state.autoscale = this.autoscale;
        if (!this.autoscale && this.dataRange) {
            state.min = this.dataRange.min;
            state.max = this.dataRange.max;
        }
        return state;
    }

    supportsWholeGenome  () {
        if (typeof this.featureSource.supportsWholeGenome === 'function') {
            return this.featureSource.supportsWholeGenome();
        } else {
            return false;
        }
    }

    /**
     * Called when the track is removed.  Do any needed cleanup here
     */
    dispose() {
        this.trackView = undefined;
    }
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
        tmp;


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



export default WigTrack;
