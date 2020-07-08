/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2018 The Regents of the University of California 
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

import FeatureParser from "./featureParsers.js";
import FeatureCache from "./featureCache.js";
import TrackBase from "../trackBase.js";
import IGVGraphics from "../igv-canvas.js";
import IGVColor from "../igv-color.js";
import igvxhr from "../igvxhr.js";
import {buildOptions, extend} from "../util/igvUtils.js";
import {createCheckbox} from "../igv-icons.js"
import {scoreShade} from "../util/ucscUtils.js"

const InteractionTrack = extend(TrackBase,

    function (config, browser) {

        TrackBase.call(this, config, browser);

        this.theta = config.theta || Math.PI / 4;
        this.sinTheta = Math.sin(this.theta);
        this.cosTheta = Math.cos(this.theta);
        this.height = config.height || 250;
        this.arcType = config.arcType || "nested";   // nested | proportional
        this.arcOrientation = (config.arcOrientation === undefined ? true : config.arcOrientation); // true for up, false for down
        this.showBlocks = config.showBlocks === undefined ? false : config.showBlocks;
        this.thickness = config.thickness || 1;
        this.color = config.color || "rgb(180,25,137)"
        this.alpha = config.alpha === undefined ? "0.05" :
            config.alpha === 0 ? undefined : config.alpha.toString();
        this.visibilityWindow = -1;
        this.colorAlphaCache = {};
        this.logScale = config.logScale !== false;   // i.e. defaul to true (undefined => true)
        if (config.max) {
            this.dataRange = {
                min: config.min || 0,
                max: config.max
            }
        } else {
            this.autoscale = true;
        }
    });

InteractionTrack.prototype.supportsWholeGenome = function () {
    return true
}

/**
 * Return the current state of the track.  Used to create sessions and bookmarks.
 *
 * @returns {*|{}}
 */
InteractionTrack.prototype.getState = function () {

    var config = this.config || {};
    config.arcOrientation = this.arcOrientation;
    config.thickness = this.thickness;
    config.color = this.color;
    return config;

}


InteractionTrack.prototype.getFeatures = async function (chr, bpStart, bpEnd) {

    const genome = this.browser.genome;
    if (!this.featureCache) {
        const options = buildOptions(this.config);    // Add oauth token, if any
        const data = await igvxhr.loadString(this.config.url, options);
        const parser = new FeatureParser(this.config.format || "bedpe");
        const header = parser.parseHeader(data);
        const features = parser.parseFeatures(data);
        this.wgFeatures = this.getWGFeatures(features);
        this.featureCache = new FeatureCache(features, genome);
    }
    return chr.toLowerCase() === "all" ? this.wgFeatures : this.featureCache.queryFeatures(chr, bpStart, bpEnd);
};

InteractionTrack.prototype.draw = function (options) {
    if (this.arcType === "proportional") {
        this.drawProportional(options);
    } else {
        this.drawNested(options);
    }
}

InteractionTrack.prototype.drawNested = function (options) {

    const ctx = options.context;
    const pixelWidth = options.pixelWidth;
    const pixelHeight = options.pixelHeight;
    const viewportWidth = options.viewportWidth;
    const bpPerPixel = options.bpPerPixel;
    const bpStart = options.bpStart;
    const xScale = bpPerPixel;

    IGVGraphics.fillRect(ctx, 0, options.pixelTop, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

    const featureList = options.features;

    if (featureList) {

        // Autoscale theta
        autoscaleNested.call(this);
        const y = this.arcOrientation ? options.pixelHeight : 0;
        for (let feature of featureList) {

            if(feature.interchr) continue;

            let pixelStart = Math.round((feature.m1 - bpStart) / xScale);
            let pixelEnd = Math.round((feature.m2 - bpStart) / xScale);
            let direction = this.arcOrientation;

            let w = (pixelEnd - pixelStart);
            if (w < 3) {
                w = 3;
                pixelStart--;
            }

            const a = w / 2;
            const r = a / this.sinTheta;
            const b = this.cosTheta * r;
            const xc = pixelStart + a;

            let yc, startAngle, endAngle;
            if (direction) {
                // UP
                var trackBaseLine = this.height;
                yc = trackBaseLine + b;
                startAngle = Math.PI + Math.PI / 2 - this.theta;
                endAngle = Math.PI + Math.PI / 2 + this.theta;

            } else {
                // DOWN
                yc = -b;
                startAngle = Math.PI / 2 - this.theta;
                endAngle = Math.PI / 2 + this.theta;
            }

            let color = feature.color || this.color;
            if(color && this.config.useScore) {
                color = getAlphaColor.call(this, color, scoreShade(feature.score));
            } else if (color && w > viewportWidth) {
                color = getAlphaColor.call(this, color, "0.1");
            }

            ctx.strokeStyle = color;
            ctx.lineWidth = feature.thickness || this.thickness || 1;

            if (this.showBlocks) {
                ctx.fillStyle = color;
                const s1 = (feature.start1 - bpStart) / xScale;
                const e1 = (feature.end1 - bpStart) / xScale;
                const s2 = (feature.start2 - bpStart) / xScale;
                const e2 = (feature.end2 - bpStart) / xScale;
                const hb = this.arcOrientation ? -5 : 5;
                ctx.fillRect(s1, y, e1 - s1, hb)
                ctx.fillRect(s2, y, e2 - s2, hb);
            }

            ctx.beginPath();
            ctx.arc(xc, yc, r, startAngle, endAngle, false);
            ctx.stroke();
        }
    }


    function autoscaleNested() {
        let max = 0;
        for (let feature of featureList) {
            let pixelStart = (feature.start - bpStart) / xScale
            let pixelEnd = (feature.end - bpStart) / xScale;
            if (pixelEnd >= 0 && pixelStart <= pixelWidth) {
                max = Math.max(max, pixelEnd - pixelStart);
            }
        }
        let a = Math.min(viewportWidth, max) / 2;
        if (max > 0) {
            let coa = pixelHeight / a;
            this.theta = estimateTheta(coa);
            this.sinTheta = Math.sin(this.theta);
            this.cosTheta = Math.cos(this.theta);
        }
    }
}

InteractionTrack.prototype.drawProportional = function (options) {

    const ctx = options.context;
    const pixelWidth = options.pixelWidth;
    const pixelHeight = options.pixelHeight;
    const bpPerPixel = options.bpPerPixel;
    const bpStart = options.bpStart;
    const xScale = bpPerPixel;

    IGVGraphics.fillRect(ctx, 0, options.pixelTop, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

    const featureList = options.features;

    if (featureList && featureList.length > 0) {

        const yScale = this.logScale ?
            options.pixelHeight / Math.log10(this.dataRange.max + 1) :
            options.pixelHeight / (this.dataRange.max - this.dataRange.min);

        const y = this.arcOrientation ? options.pixelHeight : 0;

        for (let feature of featureList) {


            if (feature.value === undefined || Number.isNaN(feature.value)|| feature.interchr) continue;


            const value = this.config.useScore ? feature.score : feature.value;

            let pixelStart = (feature.m1 - bpStart) / xScale;
            let pixelEnd = (feature.m2 - bpStart) / xScale;
            let w = (pixelEnd - pixelStart);
            if (w < 3) {
                w = 3;
                pixelStart--;
            }

            if (pixelEnd < 0 || pixelStart > pixelWidth || feature.value < this.dataRange.min) continue;

            const radiusY = this.logScale ?
                Math.log10(value + 1) * yScale :
                value * yScale;
            const counterClockwise = this.arcOrientation ? true : false;
            const color = feature.color || this.color;
            ctx.strokeStyle = color;
            ctx.lineWidth = feature.thickness || this.thickness || 1;
            ctx.beginPath();
            ctx.ellipse(pixelStart + w / 2, y, w / 2, radiusY, 0, 0, Math.PI, counterClockwise);
            ctx.stroke();

            if (this.showBlocks) {
                ctx.fillStyle = color;
                const s1 = (feature.start1 - bpStart) / xScale;
                const e1 = (feature.end1 - bpStart) / xScale;
                const s2 = (feature.start2 - bpStart) / xScale;
                const e2 = (feature.end2 - bpStart) / xScale;
                const hb = this.arcOrientation ? -5 : 5;
                ctx.fillRect(s1, y, e1 - s1, hb)
                ctx.fillRect(s2, y, e2 - s2, hb);
            }

            if (this.alpha) {
                const alphaColor = getAlphaColor.call(this, color, this.alpha);
                ctx.fillStyle = alphaColor;
                ctx.fill();
            }
        }
    }

}

InteractionTrack.prototype.menuItemList = function () {

    var self = this;
    const items = [

        {
            name: "Set track color",
            click: function () {
                self.trackView.presentColorPicker();
            }
        },
        '<HR/>'
    ];

    const lut =
        {
            "nested": "Nested Arcs",
            "proportional": "Proportional Arcs"
        };
    for (let arcType of ["nested", "proportional"]) {
        items.push(
            {
                object: createCheckbox(lut[arcType], arcType === this.arcType),
                click: function () {
                    self.arcType = arcType;
                    self.trackView.repaintViews();
                }
            });
    }
    items.push({
        object: createCheckbox("Show Blocks", this.showBlocks),
        click: function () {
            self.showBlocks = !self.showBlocks;
            self.trackView.repaintViews();
        }
    })
    items.push({
        name: "Toggle arc direction",
        click: function () {
            self.arcOrientation = !self.arcOrientation;
            self.trackView.repaintViews();
        }
    });

    return items;
};

InteractionTrack.prototype.getWGFeatures = function (allFeatures) {

    const genome = this.browser.genome;
    const wgChromosomeNames = new Set(genome.wgChromosomeNames);
    const wgFeatures = [];
    const genomeLength = genome.getGenomeLength();
    const smallestFeatureVisible = genomeLength / 1000;

    for (let c of genome.wgChromosomeNames) {

        for (let f of allFeatures) {
            let queryChr = genome.getChromosomeName(f.chr);

            if (wgChromosomeNames.has(queryChr)) {

                const m1 = genome.getGenomeCoordinate(f.chr1, f.m1);
                const m2 = genome.getGenomeCoordinate(f.chr2, f.m2);
                if (Math.abs(m2 - m1) < smallestFeatureVisible) continue;

                const wg = Object.create(Object.getPrototypeOf(f));
                Object.assign(wg, f);
                wg.chr = "all";
                wg.m1 = m1;
                wg.m2 = m2;
                // wg.realChr = f.chr;
                // wg.realStart = f.start;
                // wg.realEnd = f.end;

                //wg.start = genome.getGenomeCoordinate(f.chr, f.start);
                // wg.end = genome.getGenomeCoordinate(f.chr, f.end);
                //wg.originalFeature = f;
                wgFeatures.push(wg);
            }

        }
    }
    wgFeatures.sort(function (a, b) {
        return a.m1 - b.m2;
    });
    return wgFeatures;
}

InteractionTrack.prototype.doAutoscale = function (features) {

    if ("proportional" === this.arcType) {
        let max = 0;
        if (features) {
            for(let f of features) {
                const v = this.config.useScore ? f.score : f.value;
                if (!Number.isNaN(v)) {
                    max = Math.max(max, v);
                }
            }
        }
        return {min: 0, max: max};
    }
}


//
// InteractionTrack.prototype.popupData = function (config) {
//
//     return null;
// };


/**
 * Estimate theta given the ratio of track height to 1/2 the feature width (coa).  This relationship is approximately linear.
 */
function estimateTheta(x) {
    let coa = [0.01570925532366355, 0.15838444032453644, 0.3249196962329063, 0.5095254494944288, 0.7265425280053609, 0.9999999999999999];
    let theta = [0.031415926535897934, 0.3141592653589793, 0.6283185307179586, 0.9424777960769379, 1.2566370614359172, 1.5707963267948966];
    let idx;

    for (idx = 0; idx < coa.length; idx++) {
        if (coa[idx] > x) {
            break;
        }
    }

    let left = idx === 0 ? 0 : coa[idx - 1];
    let right = idx < coa.length ? coa[idx] : 1;
    let r = (x - left) / (right - left);

    let thetaLeft = idx === 0 ? 0 : theta[idx - 1];
    let thetaRight = idx < theta.length ? theta[idx] : Math.PI / 2;

    return thetaLeft + r * (thetaRight - thetaLeft);

}

function getAlphaColor(color, alpha) {

    let c = this.colorAlphaCache[color];
    if (!c) {
        c = IGVColor.addAlpha(color, alpha);
        this.colorAlphaCache[color] = c;
    }
    return c;
}

export default InteractionTrack;
