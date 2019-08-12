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

import FeatureCache from "../feature/featureCache";
import getDataWrapper from "../feature/dataWrapper";
import TrackBase from "../trackBase";
import IGVGraphics from "../igv-canvas";
import igvxhr from "../igvxhr";
import {extend, buildOptions} from "../util/igvUtils";

const RnaStructTrack = extend(TrackBase,

    function (config, browser) {

        TrackBase.call(this, config, browser);

        // Set defaults
        if (!config.height) {
            this.height = 300;
        }

        this.arcOrientation = false;

        this.theta = Math.PI / 2;

        if ("bp" === config.format) {
            this.featureSource = new RNAFeatureSource(config, browser.genome);
        } else {
            this.featureSource = new RNAFeatureSource(config, browser.genome);
        }
    });

RnaStructTrack.prototype.getFeatures = function (chr, start, end) {

    return this.featureSource.getFeatures(chr, start, end);

}

RnaStructTrack.prototype.draw = function (options) {

    const self = this;

    const theta = Math.PI / 2;

    const ctx = options.context;
    const pixelWidth = options.pixelWidth;
    const pixelHeight = options.pixelHeight;
    const viewportWidth = options.viewportWidth;
    const bpPerPixel = options.bpPerPixel;
    const bpStart = options.bpStart;
    const xScale = bpPerPixel;
    const orienation = self.arcOrientation;

    IGVGraphics.fillRect(ctx, 0, options.pixelTop, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

    const featureList = options.features;

    if (featureList) {

        // Sort by score -- draw lowest scored features first
        sortByScore(featureList, 1);

        featureList.forEach(function (feature) {

            if (feature.startLeft) {

                let sl = Math.round((feature.startLeft - bpStart) / xScale);
                let sr = Math.round((feature.startRight - bpStart) / xScale);
                let el = Math.round((feature.endLeft - bpStart) / xScale);
                let er = Math.round((feature.endRight - bpStart) / xScale);

                ctx.fillStyle = feature.color;
                ctx.strokeStyle = feature.color;
                ctx.beginPath();

                // First arc
                let x1 = (sl + er) / 2;
                let r1 = (er - sl) / 2;
                let y1 = self.height;
                let sa = Math.PI + (Math.PI / 2 - theta);
                let ea = 2 * Math.PI - (Math.PI / 2 - theta);

                if (orienation) {
                    y1 = 0
                    ctx.arc(x1, y1, r1, ea, sa);
                    ctx.lineTo(er, y1);
                } else {
                    ctx.arc(x1, y1, r1, sa, ea);
                    ctx.lineTo(el, y1);
                }

                // Second arc
                const x2 = (sr + el) / 2;
                const r2 = (el - sr) / 2;
                const y2 = y1;                        // Only for theta == pi/2

                if (orienation) {
                    ctx.arc(x2, y2, r2, sa, ea, true);
                    ctx.lineTo(el, y2);
                } else {
                    ctx.arc(x2, y2, r2, ea, sa, true);
                    ctx.lineTo(sl, y2);
                }

                ctx.stroke();
                ctx.fill();

                feature.drawState = {x1: x1, y1: y1, r1: r1, x2: x2, y2: y2, r2: r2, sa: sa, ea: ea};
            } else {
                let s = Math.round((feature.start - bpStart) / xScale);
                let e = Math.round((feature.end - bpStart) / xScale);

                ctx.strokeStyle = feature.color;

                ctx.beginPath();

                // First arc
                let x = (s + e) / 2;
                let r = (e - s) / 2;
                let y = self.height;
                let sa = Math.PI + (Math.PI / 2 - theta);
                let ea = 2 * Math.PI - (Math.PI / 2 - theta);

                if (orienation) {
                    y = 0
                    ctx.arc(x, y, r, ea, sa);
                } else {
                    ctx.arc(x, y, r, sa, ea);
                }

                ctx.stroke();

                feature.drawState = {x1: x, y1: y, r1: r, sa: sa, ea: ea};

            }

        })
    }
}

RnaStructTrack.prototype.clickedFeatures = function (clickState) {

    let features = TrackBase.prototype.clickedFeatures.call(this, clickState);

    const clicked = [];

    // Sort by score in descending order   (opposite order than drawn)
    sortByScore(features, -1);

    for (let f of features) {
        const ds = f.drawState;

        // Distance from arc radius, or outer arc for type ".bp"
        const dx1 = (clickState.canvasX - ds.x1);
        const dy1 = (clickState.canvasY - ds.y1);
        const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        const outerLim = ds.r1 + 3;


        let d2;
        let innerLim
        if (ds.x2 === undefined) {
            d2 = d1;
            innerLim = ds.r1 - 3;

        } else {
            const dx2 = (clickState.canvasX - ds.x2);
            const dy2 = (clickState.canvasY - ds.y2);
            d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
            innerLim = ds.r2 - 3;
        }


        // Between outer and inner arcs, with some tolerance
        if (d1 < outerLim && d2 > innerLim) {
            clicked.push(f);
            break;
        }
    }
    return clicked;
}

RnaStructTrack.prototype.popupData = function (clickState, features) {

    // We use the featureCache property rather than method to avoid async load.  If the
    // feature is not already loaded this won't work,  but the user wouldn't be mousing over it either.

    if (!features) features = this.clickedFeatures(clickState);

    if (features && features.length > 0) {

        return TrackBase.extractPopupData(features[0], this.getGenomeId());

    }
}

RnaStructTrack.prototype.menuItemList = function () {

    var self = this;

    return [
        {
            name: "Toggle arc direction",
            click: function () {
                self.arcOrientation = !self.arcOrientation;
                self.trackView.repaintViews();
            }
        }
    ];

};

/**
 * Return the current state of the track.  Used to create sessions and bookmarks.
 *
 * @returns {*|{}}
 */
RnaStructTrack.prototype.getState = function () {

    var config = this._super.getState.call(this)

    config.arcOrientation = this.arcOrientation;
    config.thickness = this.thickness;
    config.color = this.color;
    return config;

}


function sortByScore(featureList, direction) {

    featureList.sort(function (a, b) {

        const s1 = a.score === undefined ? -Number.MAX_VALUE : a.score;
        const s2 = b.score === undefined ? -Number.MAX_VALUE : b.score;
        const t = s1 - s2;
        const d = direction === undefined ? 1 : direction;

        return d * (s1 - s2);


    });

}


function RNAFeatureSource(config, genome) {

    this.config = config;
    this.genome = genome;
}

RNAFeatureSource.prototype.getFeatures = function (chr, start, end) {

    const self = this;
    const genome = this.genome;

    if (!this.featureCache) {

        const options = buildOptions(this.config);

        return igvxhr.loadString(self.config.url, options)

            .then(function (data) {

                self.featureCache = new FeatureCache(parseBP(data), genome);

                return self.featureCache.queryFeatures(chr, start, end);

            });

    } else {
        return Promise.resolve(self.featureCache.queryFeatures(chr, start, end));
    }


    function parseBP(data) {

        if (!data) return null;

        const dataWrapper = getDataWrapper(data);

        let header = true;
        let line;
        const colors = [];
        const descriptors = [];
        const features = [];

        while (line = dataWrapper.nextLine()) {

            const tokens = line.split('\t');

            if (header && line.startsWith("color:")) {
                const color = "rgb(" + tokens[1] + "," + tokens[2] + "," + tokens[3] + ")";
                colors.push(color);
                if (tokens.length > 4) {
                    descriptors.push(tokens[4]);
                }
                // TODO - use label
            } else {
                header = false;

                const chr = tokens[0];
                const startLeftNuc = Number.parseInt(tokens[1]) - 1;
                const startRightNuc = Number.parseInt(tokens[2]) - 1;
                const endLeftNuc = Number.parseInt(tokens[3]);
                const endRightNuc = Number.parseInt(tokens[4]);
                var colorIdx = Number.parseInt(tokens[5]);
                const color = colors[colorIdx];


                let feature;
                if (startLeftNuc <= endRightNuc) {
                    feature = {
                        chr: chr,
                        startLeft: Math.min(startLeftNuc, startRightNuc),
                        startRight: Math.max(startLeftNuc, startRightNuc),
                        endLeft: Math.min(endLeftNuc, endRightNuc),
                        endRight: Math.max(endLeftNuc, endRightNuc),
                        color: color,
                        score: colorIdx
                    }
                } else {
                    feature = {
                        chr: chr,
                        startLeft: Math.min(endLeftNuc, endRightNuc),
                        startRight: Math.max(endLeftNuc, endRightNuc),
                        endLeft: Math.min(startLeftNuc, startRightNuc),
                        endRight: Math.max(startLeftNuc, startRightNuc),
                        color: color,
                        score: colorIdx
                    }
                }

                feature.start = feature.startLeft;
                feature.end = feature.endRight;

                if (descriptors.length > colorIdx) {
                    feature.description = descriptors[colorIdx];
                }

                features.push(feature);
            }
        }

        return features;
    }
}

export default RnaStructTrack;