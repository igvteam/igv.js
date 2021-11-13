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

import $ from "../vendor/jquery-3.3.1.slim.js";
import TrackBase from "../trackBase.js";
import IGVGraphics from "../igv-canvas.js";
import {IGVColor, StringUtils} from "../../node_modules/igv-utils/src/index.js";
import MenuUtils from "../ui/menuUtils.js";
import {createCheckbox} from "../igv-icons.js"
import {scoreShade} from "../util/ucscUtils.js"
import FeatureSource from "./featureSource.js"
import {makeBedPEChords} from "../jbrowse/circularViewUtils.js";



class InteractionTrack extends TrackBase {

    constructor(config, browser) {
        super(config, browser);
    }

    init(config) {

        super.init(config);
        this.theta = config.theta || Math.PI / 4;
        this.sinTheta = Math.sin(this.theta);
        this.cosTheta = Math.cos(this.theta);
        this.height = config.height || 250;
        this.arcType = config.arcType || "nested";   // nested | proportional
        this.arcOrientation = (config.arcOrientation === undefined ? true : config.arcOrientation); // true for up, false for down
        this.showBlocks = config.showBlocks === undefined ? true : config.showBlocks;
        this.blockHeight = config.blockHeight || 3;
        this.thickness = config.thickness || 1;
        this.color = config.color || "rgb(180,25,137)"
        this.alpha = config.alpha || 0.15;

        if (config.valueColumn) {
            this.valueColumn = config.valueColumn;
            this.hasValue = true;
        } else if (config.useScore) {
            this.hasValue = true;
            this.valueColumn = "score";
        }

        this.logScale = config.logScale !== false;   // i.e. defaul to true (undefined => true)
        if (config.max) {
            this.dataRange = {
                min: config.min || 0,
                max: config.max
            }
            this.autoscale = false;
        } else {
            this.autoscale = true;
        }

        // Create the FeatureSource and override the default whole genome method
        this.featureSource = FeatureSource(config, this.browser.genome);
        this.featureSource.getWGFeatures = getWGFeatures;
    }

    async postInit() {

        if (typeof this.featureSource.getHeader === "function") {
            this.header = await this.featureSource.getHeader();
        }

        // Set properties from track line
        if (this.header) {
            this.setTrackProperties(this.header)
        }

        if (this.visibilityWindow === undefined && typeof this.featureSource.defaultVisibilityWindow === 'function') {
            this.visibilityWindow = await this.featureSource.defaultVisibilityWindow();
            this.featureSource.visibilityWindow = this.visibilityWindow;  // <- this looks odd
        }

        return this;
    }

    supportsWholeGenome() {
        return true
    }

    async getFeatures(chr, start, end) {
        const visibilityWindow = this.visibilityWindow;
        const features = await this.featureSource.getFeatures({chr, start, end, visibilityWindow});

        // Check for score or value
        if (this.hasValue === undefined && features && features.length > 0) {
            this.hasValue = features[0].score !== undefined;
        }

        return features;
    }

    draw(options) {

        if (this.arcType === "proportional") {
            this.drawProportional(options);
        } else {
            this.drawNested(options);
        }
    }

    drawNested(options) {

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
            const direction = this.arcOrientation;

            ctx.font = "8px sans-serif";
            ctx.textAlign = "center";

            for (let feature of featureList) {

                let color = feature.color || this.color;
                if (color && this.config.useScore) {
                    color = getAlphaColor(color, scoreShade(feature.score));
                }
                ctx.lineWidth = feature.thickness || this.thickness || 1;

                if (feature.chr1 === feature.chr2 || feature.chr === 'all') {

                    const {m1, m2} = getMidpoints(feature, this.browser.genome);

                    let pixelStart = Math.round((m1 - bpStart) / xScale);
                    let pixelEnd = Math.round((m2 - bpStart) / xScale);
                    if (pixelEnd < 0 || pixelStart > pixelWidth) continue;

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
                    if (direction) { // UP
                        yc = this.height + b;
                        startAngle = Math.PI + Math.PI / 2 - this.theta;
                        endAngle = Math.PI + Math.PI / 2 + this.theta;
                    } else { // DOWN
                        yc = -b;
                        startAngle = Math.PI / 2 - this.theta;
                        endAngle = Math.PI / 2 + this.theta;
                    }

                    if (this.showBlocks && feature.chr !== 'all') {
                        const s1 = (feature.start1 - bpStart) / xScale;
                        const e1 = (feature.end1 - bpStart) / xScale;
                        const s2 = (feature.start2 - bpStart) / xScale;
                        const e2 = (feature.end2 - bpStart) / xScale;
                        const hb = this.arcOrientation ? -this.blockHeight : this.blockHeight;
                        ctx.fillRect(s1, y, e1 - s1, hb)
                        ctx.fillRect(s2, y, e2 - s2, hb);
                    }

                    // Alpha shade (de-emphasize) arcs that extend beyond viewport, unless alpha shading is used for score.
                    if (color && !this.config.useScore && w > viewportWidth) {
                        color = getAlphaColor(color, this.alpha);
                    }
                    ctx.strokeStyle = color;
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(xc, yc, r, startAngle, endAngle, false);
                    ctx.stroke();
                    feature.drawState = {xc, yc, r};
                } else {

                    let pixelStart = Math.round((feature.start - bpStart) / xScale);
                    let pixelEnd = Math.round((feature.end - bpStart) / xScale);
                    if (pixelEnd < 0 || pixelStart > pixelWidth) continue;

                    let w = (pixelEnd - pixelStart);
                    if (w < 3) {
                        w = 3;
                        pixelStart--;
                    }
                    const otherChr = feature.chr === feature.chr1 ? feature.chr2 : feature.chr1;
                    ctx.strokeStyle = color;
                    ctx.fillStyle = color;
                    if (direction) {
                        // UP
                        ctx.fillRect(pixelStart, this.height / 2, w, this.height / 2);
                        ctx.fillText(otherChr, pixelStart + w / 2, this.height / 2 - 5);
                        feature.drawState = {x: pixelStart, y: this.height / 2, w: w, h: this.height / 2};
                    } else {
                        ctx.fillRect(pixelStart, 0, w, this.height / 2);
                        ctx.fillText(otherChr, pixelStart + w / 2, this.height / 2 + 13);
                        feature.drawState = {x: pixelStart, y: 0, w: w, h: this.height / 2};
                    }
                }
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
                let coa = (pixelHeight - 10) / a;
                this.theta = estimateTheta(coa);
                this.sinTheta = Math.sin(this.theta);
                this.cosTheta = Math.cos(this.theta);
            }
        }
    }

    drawProportional(options) {

        const ctx = options.context;
        const pixelWidth = options.pixelWidth;
        const pixelHeight = options.pixelHeight;
        const bpPerPixel = options.bpPerPixel;
        const bpStart = options.bpStart;
        const xScale = bpPerPixel;

        // SVG output for proportional arcs are currently not supported because "ellipse" is not implemented
        // if(typeof ctx.ellipse !== 'function') {
        //     Alert.presentAlert("SVG output of proportional arcs is currently not supported.")
        //     return;
        // }

        IGVGraphics.fillRect(ctx, 0, options.pixelTop, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

        const featureList = options.features;

        if (featureList && featureList.length > 0) {

            const yScale = this.logScale ?
                options.pixelHeight / Math.log10(this.dataRange.max + 1) :
                options.pixelHeight / (this.dataRange.max - this.dataRange.min);

            const y = this.arcOrientation ? options.pixelHeight : 0;

            for (let feature of featureList) {

                const value = this.valueColumn ? feature[this.valueColumn] : feature.score;
                if (value === undefined || Number.isNaN(value)) continue;

                const radiusY = this.logScale ?
                    Math.log10(value + 1) * yScale :
                    value * yScale;

                if (feature.chr1 === feature.chr2 || feature.chr === 'all') {

                    const {m1, m2} = getMidpoints(feature, this.browser.genome);

                    let pixelStart = (m1 - bpStart) / xScale;
                    let pixelEnd = (m2 - bpStart) / xScale;
                    let w = (pixelEnd - pixelStart);
                    if (w < 3) {
                        w = 3;
                        pixelStart--;
                    }

                    if (pixelEnd < 0 || pixelStart > pixelWidth || value < this.dataRange.min) continue;

                    const radiusX = w / 2;
                    const xc = pixelStart + w / 2;
                    const counterClockwise = this.arcOrientation ? true : false;
                    const color = feature.color || this.color;
                    ctx.strokeStyle = color;
                    ctx.lineWidth = feature.thickness || this.thickness || 1;

                    if (true === ctx.isSVG) {
                        ctx.strokeEllipse(xc, y, radiusX, radiusY, 0, 0, Math.PI, counterClockwise)
                    } else {
                        ctx.beginPath()
                        ctx.ellipse(xc, y, radiusX, radiusY, 0, 0, Math.PI, counterClockwise)
                        ctx.stroke()
                    }

                    if (this.showBlocks && feature.chr !== 'all') {
                        ctx.fillStyle = color;
                        const s1 = (feature.start1 - bpStart) / xScale;
                        const e1 = (feature.end1 - bpStart) / xScale;
                        const s2 = (feature.start2 - bpStart) / xScale;
                        const e2 = (feature.end2 - bpStart) / xScale;
                        const hb = this.arcOrientation ? -this.blockHeight : this.blockHeight;
                        ctx.fillRect(s1, y, e1 - s1, hb)
                        ctx.fillRect(s2, y, e2 - s2, hb);
                    }

                    if (this.alpha) {
                        ctx.fillStyle = getAlphaColor(color, this.alpha)
                        if (true === ctx.isSVG) {
                            ctx.fillEllipse(xc, y, radiusX, radiusY, 0, 0, Math.PI, counterClockwise)
                        } else {
                            ctx.fill()
                        }

                    }

                    feature.drawState = {xc, yc: y, radiusX, radiusY};
                } else {
                    let pixelStart = Math.round((feature.start - bpStart) / xScale);
                    let pixelEnd = Math.round((feature.end - bpStart) / xScale);
                    if (pixelEnd < 0 || pixelStart > pixelWidth || value < this.dataRange.min) continue;

                    const h = Math.min(radiusY, this.height - 13);   // Leave room for text
                    let w = (pixelEnd - pixelStart);
                    if (w < 3) {
                        w = 3;
                        pixelStart--;
                    }
                    const otherChr = feature.chr === feature.chr1 ? feature.chr2 : feature.chr1;
                    ctx.font = "8px sans-serif";
                    ctx.textAlign = "center";
                    if (this.arcOrientation) {
                        // UP
                        const y = this.height - h;
                        ctx.fillRect(pixelStart, y, w, h);
                        ctx.fillText(otherChr, pixelStart + w / 2, y - 5);
                        feature.drawState = {x: pixelStart, y, w, h};
                    } else {
                        ctx.fillRect(pixelStart, 0, w, h);
                        ctx.fillText(otherChr, pixelStart + w / 2, h + 13);
                        feature.drawState = {x: pixelStart, y: 0, w, h};
                    }
                }
            }
        }
    }

    menuItemList() {

        let items = [

            {
                name: "Set track color",
                click: () => {
                    this.trackView.presentColorPicker();
                }
            },
            '<hr/>'
        ];

        if (this.hasValue) {
            const lut =
                {
                    "nested": "Nested Arcs",
                    "proportional": "Proportional Arcs"
                };
            for (let arcType of ["nested", "proportional"]) {
                items.push(
                    {
                        object: $(createCheckbox(lut[arcType], arcType === this.arcType)),
                        click: () => {
                            this.arcType = arcType;
                            this.trackView.repaintViews();
                        }
                    });
            }
        }

        items.push({
            object: $(createCheckbox("Show Blocks", this.showBlocks)),
            click: () => {
                this.showBlocks = !this.showBlocks;
                this.trackView.repaintViews();
            }
        })
        items.push({
            name: "Toggle arc direction",
            click: () => {
                this.arcOrientation = !this.arcOrientation;
                this.trackView.repaintViews();
            }
        });

        if (this.arcType === "proportional") {
            items.push("<HR>");
            items = items.concat(MenuUtils.numericDataMenuItems(this.trackView));
        }

        // Experimental JBrowse feature
        if (this.browser.circularView) {
            items.push('<hr/>');
            items.push({
                label: 'Show chords',
                click: () => {
                    this.browser.circularViewVisible = true;
                    const chords = makeBedPEChords(this.featureSource.getAllFeatures(), this.color)
                    this.browser.circularView.addChords(chords, true);
                }
            });
        }

        return items;
    };

    contextMenuItemList(clickState) {

        // Experimental JBrowse feature
        if (this.browser.circularView) {
            const viewport = clickState.viewport;
            const list = [];

            list.push({
                label: 'Show chords',
                click: () => {
                    const refFrame = viewport.referenceFrame;
                    const inView = "all" === refFrame.chr ?
                        this.featureSource.getAllFeatures() :
                        this.featureSource.featureCache.queryFeatures(refFrame.chr, refFrame.start, refFrame.end);
                    this.browser.circularViewVisible = true;
                    const chords = makeBedPEChords(inView, this.color)
                    this.browser.circularView.addChords(chords, true);
                }
            });

            list.push('<hr/>');
            return list;
        }

    }


    doAutoscale(features) {

        // if ("proportional" === this.arcType) {
        let max = 0;
        if (features) {
            for (let f of features) {
                const v = this.valueColumn ? f[this.valueColumn] : f.score;
                if (!Number.isNaN(v)) {
                    max = Math.max(max, v);
                }
            }
        }
        return {min: 0, max: max};
        // }
    }

    popupData(clickState, features) {

        features = this.clickedFeatures(clickState);

        const data = [];
        for (let feature of features) {

            const f = feature._ || feature;   // For "whole genome" features, which keeps a pointer to the original

            data.push({name: "Region 1", value: positionString(f.chr1, f.start1, f.end1, f.strand1)});
            data.push({name: "Region 2", value: positionString(f.chr2, f.start2, f.end2, f.strand2)});
            if (f.name) {
                data.push({name: "Name", value: f.name});
            }
            if (f.value !== undefined) {
                data.push({name: "Value", value: f.value})
            }
            if (f.score !== undefined) {
                data.push({name: "Score", value: f.score})
            }


            if (f.extras && this.header && this.header.columnNames) {
                const columnNames = this.header.columnNames;
                for (let i = 10; i < columnNames.length; i++) {
                    if (columnNames[i] === 'info') {
                        extractInfoColumn(data, f.extras[i - 10]);
                    } else {
                        data.push({name: columnNames[i], value: f.extras[i - 10]});
                    }
                }
            }
            // For now just return the top hit
            break;

            //if (data.length > 0) {
            //     data.push("<HR>");
            // }
        }
        return data;
    }

    clickedFeatures(clickState, features) {

        // We use the cached features rather than method to avoid async load.  If the
        // feature is not already loaded this won't work,  but the user wouldn't be mousing over it either.
        const featureList = features || clickState.viewport.getCachedFeatures();
        const candidates = [];
        if (featureList) {
            const proportional = this.arcType === "proportional";

            for (let feature of featureList) {
                if (!feature.drawState) continue;
                if (feature.chr1 === feature.chr2 || feature.chr === 'all') {
                    if (proportional) {
                        //(x-xc)^2/radiusX^2 + (y-yc)^2/radiusY^2 <= 1
                        const {xc, yc, radiusX, radiusY} = feature.drawState;
                        const dx = clickState.canvasX - xc;
                        const dy = clickState.canvasY - yc;
                        const score = (dx / radiusX) * (dx / radiusX) + (dy / radiusY) * (dy / radiusY);
                        if (score <= 1) {
                            candidates.push({score: 1 / score, feature});
                        }
                    } else {
                        const {xc, yc, r} = feature.drawState;
                        const dx = clickState.canvasX - xc;
                        const dy = clickState.canvasY - yc;
                        const score = Math.abs(Math.sqrt(dx * dx + dy * dy) - r);
                        if (score < 5) {
                            candidates.push({score, feature})
                        }
                    }
                } else {
                    const {x, y, w, h} = feature.drawState;
                    const tolerance = 5;
                    if (clickState.canvasX >= x - tolerance && clickState.canvasX <= x + w + tolerance &&
                        clickState.canvasY >= y && clickState.canvasY <= y + h) {
                        const score = -Math.abs(clickState.canvasX - (x + w / 2));
                        candidates.push({score, feature});
                        break;
                    }
                }
            }
        }

        if (candidates.length > 1) {
            candidates.sort((a, b) => a.score - b.score);
        }
        return candidates.map((c) => c.feature);
    }
}

function getMidpoints(feature, genome) {
    let m1 = (feature.start1 + feature.end1) / 2;
    let m2 = (feature.start2 + feature.end2) / 2;
    if (feature.chr === 'all') {
        m1 = genome.getGenomeCoordinate(feature.chr1, m1);
        m2 = genome.getGenomeCoordinate(feature.chr2, m2);
    }
    if (m1 > m2) {
        const tmp = m1;
        m1 = m2;
        m2 = tmp;
    }
    return {m1, m2}
}

function positionString(chr, start, end, strand) {

    return strand && strand !== '.' ?
        `${chr}:${StringUtils.numberFormatter(start + 1)}-${StringUtils.numberFormatter(end)} (${strand})` :
        `${chr}:${StringUtils.numberFormatter(start + 1)}-${StringUtils.numberFormatter(end)}`
}

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

const colorAlphaCache = new Map();

function getAlphaColor(color, alpha) {
    const key = `${color}_${alpha}`;
    let c = colorAlphaCache.get(key);
    if (!c) {
        c = IGVColor.addAlpha(color, alpha);
        colorAlphaCache.set(key, c);
    }
    return c;
}


/**
 * Called in the context of FeatureSource
 * @param allFeatures
 * @returns {[]}
 */
function getWGFeatures(allFeatures) {

    const genome = this.genome;
    const wgFeatures = [];
    for (let c of genome.wgChromosomeNames) {
        const chrFeatures = allFeatures[c];
        if (chrFeatures) {
            for (let f of chrFeatures) {
                if (!f.dup) {
                    const wg = Object.assign({}, f);
                    wg.chr = "all";
                    wg.start = genome.getGenomeCoordinate(f.chr1, f.start1);
                    wg.end = genome.getGenomeCoordinate(f.chr2, f.end2);
                    wgFeatures.push(wg);
                }
            }
        }
    }

    return wgFeatures;
}

/**
 * Extract a gff style info column for popup text.  This convention used by 10X for bedpe files
 *     ALLELIC_FRAC=0.0375670840787;BLACK1=.;BLACK2=.;...
 * @param data
 * @param str
 */
function extractInfoColumn(data, str) {
    const kvs = str.split(';')
    for (let t of kvs) {
        const kv = t.split('=');
        if (kv.length === 2) {
            data.push({name: kv[0], value: kv[1]})
        }
    }

}

export default InteractionTrack;
