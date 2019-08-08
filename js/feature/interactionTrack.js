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

/**
 * Created by jrobinso on 7/5/18.
 */
"use strict";

const InteractionTrack = igv.extend(igv.TrackBase,

    function (config, browser) {

        igv.TrackBase.call(this, config, browser);

        this.theta = config.theta || Math.PI / 4;
        this.sinTheta = Math.sin(this.theta);
        this.cosTheta = Math.cos(this.theta);


        this.height = config.height || 250;
        this.autoHeight = true;

        this.arcOrientation = (config.arcOrientation === undefined ? true : config.arcOrientation);       // true for up, false for down
        this.thickness = config.thickness || 2;
        this.color = config.color || "rgb(180,25,137)"

        this.visibilityWindow = -1;

        this.colorAlphaCache = {};

    });

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


InteractionTrack.prototype.getFeatures = function (chr, bpStart, bpEnd) {

    const self = this;
    const genome = this.browser.genome;

    if (self.featureCache) {
        return Promise.resolve(self.featureCache.queryFeatures(chr, bpStart, bpEnd));
    } else {

        const options = igv.buildOptions(self.config);    // Add oauth token, if any

        return igv.xhr.loadString(self.config.url, options)

            .then(function (data) {

                const parser = new igv.FeatureParser("bedpe");

                const header = parser.parseHeader(data);

                const features = parser.parseFeatures(data);

                self.featureCache = new igv.FeatureCache(features, genome);

                // TODO -- whole genome features here.

                return self.featureCache.queryFeatures(chr, bpStart, bpEnd);

            })
    }
};

InteractionTrack.prototype.draw = function (options) {

    const self = this;

    const ctx = options.context;
    const pixelWidth = options.pixelWidth;
    const pixelHeight = options.pixelHeight;
    const viewportWidth = options.viewportWidth;
    const bpPerPixel = options.bpPerPixel;
    const bpStart = options.bpStart;
    const xScale = bpPerPixel;

    igv.graphics.fillRect(ctx, 0, options.pixelTop, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

    const featureList = options.features;

    if (featureList) {

        // Autoscale theta
        autoscale();

        featureList.forEach(function (feature) {

            let pixelStart = Math.round((feature.m1 - bpStart) / xScale);
            let pixelEnd = Math.round((feature.m2 - bpStart) / xScale);
            let direction = self.arcOrientation;

            let w = (pixelEnd - pixelStart);
            if (w < 3) {
                w = 3;
                pixelStart--;
            }

            const a = w / 2;
            const r = a / self.sinTheta;
            const b = self.cosTheta * r;
            const xc = pixelStart + a;

            let yc, startAngle, endAngle;
            if (direction) {
                // UP
                var trackBaseLine = self.height;
                yc = trackBaseLine + b;
                startAngle = Math.PI + Math.PI / 2 - self.theta;
                endAngle = Math.PI + Math.PI / 2 + self.theta;

            } else {
                // DOWN
                yc = -b;
                startAngle = Math.PI / 2 - self.theta;
                endAngle = Math.PI / 2 + self.theta;
            }

            let color = feature.color || self.color;
            if (color && w > viewportWidth) {
                color = getAlphaColor.call(self, color, "0.1");
            }

            ctx.strokeStyle = color;
            ctx.lineWidth = feature.thickness || self.thicknewss || 1;

            ctx.beginPath();
            ctx.arc(xc, yc, r, startAngle, endAngle, false);
            ctx.stroke();


        })
    }


    function autoscale() {
        let max = 0;
        featureList.forEach(function (feature) {
            let pixelStart = (feature.start - bpStart) / xScale
            let pixelEnd = (feature.end - bpStart) / xScale;
            if (pixelEnd >= 0 && pixelStart <= pixelWidth) {
                max = Math.max(max, pixelEnd - pixelStart);
            }
        });
        let a = Math.min(viewportWidth, max) / 2;
        if (max > 0) {
            let coa = pixelHeight / a;
            self.theta = estimateTheta(coa);
            self.sinTheta = Math.sin(self.theta);
            self.cosTheta = Math.cos(self.theta);
        }
    }
};


InteractionTrack.prototype.menuItemList = function () {

    var self = this;

    return [
        {
            name: "Toggle arc direction",
            click: function () {
                self.arcOrientation = !self.arcOrientation;
                self.trackView.repaintViews();
            }
        },
        {
            name: "Set track color",
            click: function () {
                self.trackView.presentColorPicker();
            }
        }

    ];

};
//
//
//
// InteractionTrack.prototype.popupData = function (config) {
//
//     return null;
// };

// InteractionTrack.prototype.contextMenuItemList = function (config) {
//
//     var self = this,
//         clickHandler;
//
//
//
//     clickHandler = function () {
//
//         var genomicLocation = config.genomicLocation,
//             referenceFrame = config.viewport.genomicState.referenceFrame;
//
//         // Define a region 5 "pixels" wide in genomic coordinates
//         var bpWidth = referenceFrame.toBP(2.5);
//
//         self.sortSamples(referenceFrame.chrName, genomicLocation - bpWidth, genomicLocation + bpWidth, sortDirection);
//
//         sortDirection = (sortDirection === "ASC" ? "DESC" : "ASC");
//
//
//     };
//
//     return [{label: 'Sort by value',  click: clickHandler, init: undefined}];
//
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

    let left = idx == 0 ? 0 : coa[idx - 1];
    let right = idx < coa.length ? coa[idx] : 1;
    let r = (x - left) / (right - left);

    let thetaLeft = idx == 0 ? 0 : theta[idx - 1];
    let thetaRight = idx < theta.length ? theta[idx] : Math.PI / 2;

    return thetaLeft + r * (thetaRight - thetaLeft);

}

function getAlphaColor(color, alpha) {

    let c = this.colorAlphaCache[color];
    if (!c) {
        c = igv.Color.addAlpha(color, alpha);
        this.colorAlphaCache[color] = c;
    }
    return c;
}

export default InteractionTrack;
