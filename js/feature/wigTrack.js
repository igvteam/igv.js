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

import $ from "../vendor/jquery-3.3.1.slim.js";
import FeatureSource from './featureSource.js';
import TDFSource from "../tdf/tdfSource.js";
import TrackBase from "../trackBase.js";
import BWSource from "../bigwig/bwSource.js";
import IGVGraphics from "../igv-canvas.js";
import paintAxis from "../util/paintAxis.js";
import IGVColor from "../igv-color.js";
import MenuUtils from "../util/menuUtils.js";
import {createCheckbox} from "../igv-icons.js";
import {numberFormatter} from "../util/stringUtils.js";
import {extend} from "../util/igvUtils.js";

const dataRangeMenuItem = MenuUtils.dataRangeMenuItem;

const WigTrack = extend(TrackBase,

    function (config, browser) {

        this.type = "wig";

        this.featureType = 'numeric';

        // Default color, might be overridden by track line
        if (config.color === undefined) {
            config.color = "rgb(150,150,150)";
        }

        if (config.height === undefined) {
            config.height = 50;
        }

        TrackBase.call(this, config, browser);

        const format = config.format ? config.format.toLowerCase() : config.format;
        if ("bigwig" === format) {
            this.featureSource = new BWSource(config, browser.genome);
        } else if ("tdf" === format) {
            this.featureSource = new TDFSource(config, browser.genome);
        } else {
            this.featureSource = new FeatureSource(config, browser.genome);
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

    });

WigTrack.prototype.postInit = async function () {
    const header = await this.getFileHeader();
    if (header) this.setTrackProperties(header)
}

WigTrack.prototype.getFeatures = async function (chr, bpStart, bpEnd, bpPerPixel) {
    return this.featureSource.getFeatures(chr, bpStart, bpEnd, bpPerPixel, this.windowFunction);

}

WigTrack.prototype.menuItemList = function () {

    var self = this,
        menuItems = [];

    menuItems.push(dataRangeMenuItem(this.trackView));

    menuItems.push({
        object: createCheckbox("Autoscale", self.autoscale),
        click: function () {
            var $fa = $(this).find('i');

            self.autoscale = !self.autoscale;

            if (true === self.autoscale) {
                $fa.removeClass('igv-fa-check-hidden');
                $fa.addClass('igv-fa-check-visible');
            } else {
                $fa.removeClass('igv-fa-check-visible');
                $fa.addClass('igv-fa-check-hidden');
            }

            self.config.autoscale = self.autoscale;
            self.trackView.setDataRange(undefined, undefined, self.autoscale);
        }
    });

    return menuItems;

};

WigTrack.prototype.getFileHeader = async function () {

    if (typeof this.featureSource.getFileHeader === "function") {
        this.header = await this.featureSource.getFileHeader();
    }
    return this.header;
}

WigTrack.prototype.draw = function (options) {

    var self = this;

    const features = options.features;
    const ctx = options.context;
    const bpPerPixel = options.bpPerPixel;
    const bpStart = options.bpStart;
    const pixelWidth = options.pixelWidth;
    const pixelHeight = options.pixelHeight;
    const bpEnd = bpStart + pixelWidth * bpPerPixel + 1;
    let lastXPixel = -1;
    let lastValue = -1;
    let lastNegValue = 1;

    let baselineColor;
    if (typeof self.color === "string" && self.color.startsWith("rgb(")) {
        baselineColor = IGVColor.addAlpha(self.color, 0.1);
    }

    if (features && features.length > 0) {

        if (self.dataRange.min === undefined) self.dataRange.min = 0;

        const featureValueMinimum = self.dataRange.min;
        const featureValueMaximum = self.dataRange.max;

        // Max can be less than min if config.min is set but max left to autoscale.   If that's the case there is
        // nothing to paint.
        if (featureValueMaximum > featureValueMinimum) {

            if (renderFeature.end < bpStart) return;
            if (renderFeature.start > bpEnd) return;

            for (let f of features) {
                renderFeature(f, this.dataRange)
            }

            // If the track includes negative values draw a baseline
            if (featureValueMinimum < 0) {
                const basepx = (featureValueMaximum / (featureValueMaximum - featureValueMinimum)) * options.pixelHeight;
                IGVGraphics.strokeLine(ctx, 0, basepx, options.pixelWidth, basepx, {strokeStyle: baselineColor});
            }
        }
    }


    function renderFeature(feature, dataRange) {

        const featureValueMinimum = self.dataRange.min;
        const featureValueMaximum = self.dataRange.max;
        const featureValueRange = featureValueMaximum - featureValueMinimum;
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

        let c = (feature.value < 0 && self.altColor) ? self.altColor : self.color;
        const color = (typeof c === "function") ? c(feature.value) : c;

        if (self.graphType === "points") {
            const pointSize = self.config.pointSize || 3;
            const py = feature.value < 0 ? (yUnitless + heightUnitLess) * pixelHeight : yUnitless * pixelHeight;
            const px = x + width / 2;

            if (isNaN(x)) {
                console.log('isNaN(x). feature start ' + numberFormatter(feature.start) + ' bp start ' + numberFormatter(bpStart));
            } else {
                IGVGraphics.fillCircle(ctx, px, py, pointSize / 2);
            }

        } else {
            // Draw optimization important for many points -- don't draw if the peak will be occluded by previously drawn features
            if (x > lastXPixel || ((feature.value > 0 && feature.value > lastValue) || (feature.value < 0 && feature.value < lastNegValue))) {
                IGVGraphics.fillRect(ctx, x, yUnitless * pixelHeight, width, heightUnitLess * pixelHeight, {fillStyle: color});
                lastXPixel = x;
                if (feature.value > 0) {
                    lastValue = feature.value;
                } else if (feature.value < 0) {
                    lastNegValue = feature.value;
                }

            }


        }

    }

};

WigTrack.prototype.popupData = function (clickState, features) {

    // We use the featureCache property rather than method to avoid async load.  If the
    // feature is not already loaded this won't work,  but the user wouldn't be mousing over it either.

    if (!features) features = this.clickedFeatures(clickState);

    if (features && features.length > 0) {

        let genomicLocation = clickState.genomicLocation;
        let referenceFrame = clickState.viewport.genomicState.referenceFrame;
        let popupData = [];

        // We need some tolerance around genomicLocation, start with +/- 2 pixels
        let tolerance = 2 * referenceFrame.bpPerPixel;
        let selectedFeature = binarySearch(features, genomicLocation, tolerance);

        if (selectedFeature) {
            let posString = (selectedFeature.end - selectedFeature.start) === 1 ?
                numberFormatter(selectedFeature.start + 1)
                : numberFormatter(selectedFeature.start + 1) + "-" + numberFormatter(selectedFeature.end);
            popupData.push({name: "Position:", value: posString});
            popupData.push({
                name: "Value:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;",
                value: numberFormatter(selectedFeature.value)
            });
        }

        return popupData;


    } else {
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
    } else {
        return false;
    }

}


export default WigTrack;
