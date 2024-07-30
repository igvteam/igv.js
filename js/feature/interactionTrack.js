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

import TrackBase from "../trackBase.js";
import IGVGraphics from "../igv-canvas.js";
import paintAxis from "../util/paintAxis.js";
import { IGVColor, StringUtils } from "../../node_modules/igv-utils/src/index.js";
import { createCheckbox } from "../igv-icons.js";
import { scoreShade } from "../util/ucscUtils.js";
import FeatureSource from "./featureSource.js";
import { makeBedPEChords, sendChords } from "../jbrowse/circularViewUtils.js";
import { getChrColor } from "../util/getChrColor.js";

function getArcType(config) {
    if (!config.arcType) {
        return "nested";
    }
    switch (config.arcType) {
        case "chiapet":
            return "inView";
        case "chiapetoutbound":
            return "partialInView";
        default:
            return config.arcType;
    }
}

const DEFAULT_ARC_COLOR = "rgb(180,25,137)";

class InteractionTrack extends TrackBase {

    static defaults = {
        height: 250,
        theta: Math.PI / 4,
        arcOrientation: "UP",
        showBlocks: true,
        blockHeight: 3,
        thickness: 1,
        color: "rgb(180,25,137)",
        alpha: 0.02,
        logScale: true,
    };

    constructor(config, browser) {
        super(config, browser);
    }

    init(config) {

        super.init(config);

        if (config.arcOrientation === false) {
            this.arcOrientation = "DOWN";
        } else if (config.arcOrientation === true) {
            this.arcOrientation = "UP";
        } else if (config.arcOrientation) {
            this.arcOrientation = config.arcOrientation.toUpperCase();
        } else {
            this.arcOrientation = "UP";
        }

        this.sinTheta = Math.sin(this.theta);
        this.cosTheta = Math.cos(this.theta);
        this.arcType = getArcType(config);
        this.painter = { flipAxis: "DOWN" === this.arcOrientation, dataRange: this.dataRange, paintAxis: paintAxis };

        if (config.valueColumn) {
            this.valueColumn = config.valueColumn;
            this.hasValue = true;
        } else if (config.useScore) {
            this.hasValue = true;
            this.valueColumn = "score";
        }

        if (config.max) {
            this.dataRange = {
                min: config.min || 0,
                max: config.max
            };
            this.autoscale = false;
        } else {
            this.autoscale = true;
        }

        if (config.featureSource) {
            this.featureSource = config.featureSource;
            delete config._featureSource;
        } else {
            this.featureSource = FeatureSource(config, this.browser.genome);
            this.featureSource.getWGFeatures = getWGFeatures;
        }
    }

    async postInit() {

        if (typeof this.featureSource.getHeader === "function") {
            this.header = await this.featureSource.getHeader();
            if (this.disposed) return;
        }

        if (this.header) {
            this.setTrackProperties(this.header);
        }

        if (this.visibilityWindow === undefined && typeof this.featureSource.defaultVisibilityWindow === 'function') {
            this.visibilityWindow = await this.featureSource.defaultVisibilityWindow();
            this.featureSource.visibilityWindow = this.visibilityWindow;
        }

        return this;
    }

    get supportsWholeGenome() {
        return true;
    }

    async getFeatures(chr, start, end) {
        const visibilityWindow = this.visibilityWindow;
        const features = await this.featureSource.getFeatures({ chr, start, end, visibilityWindow });

        if (this.hasValue === undefined && features && features.length > 0) {
            this.hasValue = features[0].score !== undefined;
        }

        return features;
    }

    draw(options) {
        if (this.arcType === "proportional") {
            this.drawProportional(options);
        } else if (this.arcType === "inView" || this.arcType === "partialInView") {
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

        IGVGraphics.fillRect(ctx, 0, options.pixelTop, pixelWidth, pixelHeight, { 'fillStyle': "rgb(255, 255, 255)" });

        const featureList = options.features;

        if (featureList) {

            autoscaleNested.call(this);
            const direction = "UP" === this.arcOrientation;
            const y = direction ? options.pixelHeight : 0;

            ctx.font = "8px sans-serif";
            ctx.textAlign = "center";

            for (let feature of featureList) {

                feature.drawState = undefined;

                let color;
                if (typeof this.color === 'function') {
                    color = this.color(feature);
                } else {
                    color = this.color || feature.color || DEFAULT_ARC_COLOR;
                    if (color && this.config.useScore) {
                        color = getAlphaColor(color, scoreShade(feature.score));
                    }
                }

                ctx.lineWidth = feature.thickness || this.thickness || 1;

                if (feature.chr1 === feature.chr2 || feature.chr === 'all') {

                    const { m1, m2 } = getMidpoints(feature, this.browser.genome);

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
                    if (direction) {
                        yc = this.height + b;
                        startAngle = Math.PI + Math.PI / 2 - this.theta;
                        endAngle = Math.PI + Math.PI / 2 + this.theta;
                    } else {
                        yc = -b;
                        startAngle = Math.PI / 2 - this.theta;
                        endAngle = Math.PI / 2 + this.theta;
                    }

                    if (this.showBlocks && feature.chr !== 'all') {
                        const s1 = (feature.start1 - bpStart) / xScale;
                        const e1 = (feature.end1 - bpStart) / xScale;
                        const s2 = (feature.start2 - bpStart) / xScale;
                        const e2 = (feature.end2 - bpStart) / xScale;
                        const hb = direction ? -this.blockHeight : this.blockHeight;
                        ctx.fillRect(s1, y, e1 - s1, hb);
                        ctx.fillRect(s2, y, e2 - s2, hb);
                    }

                    if (color && !this.config.useScore && w > viewportWidth) {
                        color = getAlphaColor(color, this.alpha);
                    }
                    ctx.strokeStyle = color;
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(xc, yc, r, startAngle, endAngle, false);
                    ctx.stroke();
                    feature.drawState = { xc, yc, r };
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
                    ctx.fillStyle = getAlphaColor(getChrColor(otherChr), 0.5);

                    if (direction) {
                        ctx.fillRect(pixelStart, this.height / 2, w, this.height / 2);
                        ctx.fillText(otherChr, pixelStart + w / 2, this.height / 2 - 5);
                        feature.drawState = { x: pixelStart, y: this.height / 2, w: w, h: this.height / 2 };
                    } else {
                        ctx.fillRect(pixelStart, 0, w, this.height / 2);
                        ctx.fillText(otherChr, pixelStart + w / 2, this.height / 2 + 13);
                        feature.drawState = { x: pixelStart, y: 0, w: w, h: this.height / 2 };
                    }
                }
            }
        }

        function autoscaleNested() {
            let max = 0;
            for (let feature of featureList) {
                let pixelStart = (feature.start - bpStart) / xScale;
                let pixelEnd = (feature.end - bpStart) / xScale;
                if (pixelStart >= 0 && pixelEnd <= pixelWidth) {
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

    getScaleFactor(min, max, height, logScale) {
        const scale = logScale ? height / (Math.log10(max + 1) - (min <= 0 ? 0 : Math.log10(min + 1))) : height / (max - min);
        return scale;
    }

    drawProportional(options) {

        const ctx = options.context;
        const pixelWidth = options.pixelWidth;
        const pixelHeight = options.pixelHeight;
        const bpPerPixel = options.bpPerPixel;
        const bpStart = options.bpStart;
        const xScale = bpPerPixel;
        const refStart = options.referenceFrame.start;
        const refEnd = options.referenceFrame.end;
        const direction = "UP" === this.arcOrientation;

        IGVGraphics.fillRect(ctx, 0, options.pixelTop, pixelWidth, pixelHeight, { 'fillStyle': "rgb(255, 255, 255)" });

        const featureList = options.features;

        if (featureList && featureList.length > 0) {

            const arcCaches = new Map();

            const effectiveMin = 0;
            const yScale = this.getScaleFactor(effectiveMin, this.dataRange.max, options.pixelHeight - 1, this.logScale);
            const y = direction ? options.pixelHeight : 0;

            for (let feature of featureList) {

                feature.drawState = undefined;

                const value = this.valueColumn ? feature[this.valueColumn] : feature.score;
                if (value === undefined || Number.isNaN(value)) continue;

                const radiusY = Math.round((this.logScale ? Math.log10(value + 1) : value) * yScale);

                if (feature.chr1 === feature.chr2 || feature.chr === 'all') {

                    const { m1, m2 } = getMidpoints(feature, this.browser.genome);

                    let pixelStart = Math.round((m1 - bpStart) / xScale);
                    let pixelEnd = Math.round((m2 - bpStart) / xScale);
                    let w = (pixelEnd - pixelStart);
                    if (w < 3) {
                        w = 3;
                        pixelStart--;
                    }

                    if (value < this.dataRange.min || value > this.dataRange.max) continue;
                    if ("proportional" !== this.arcType) {
                        const showOutbound = (this.arcType === "partialInView");
                        const within = (m1 >= refStart && m2 <= refEnd);
                        let outBound = false;
                        let inBound = false;
                        if (!within && showOutbound) {
                            outBound = (refStart <= m1 && m1 <= refEnd);
                            if (!outBound) inBound = (refStart <= m2 && m2 <= refEnd);
                        }
                        if (!(within || outBound || inBound)) continue;
                    }

                    const radiusX = w / 2;
                    const xc = pixelStart + w / 2;
                    feature.drawState = { xc, yc: y, radiusX, radiusY };

                    const counterClockwise = direction;
                    const color = feature.color || this.color;
                    ctx.strokeStyle = color;
                    ctx.lineWidth = feature.thickness || this.thickness || 1;

                    if (true === ctx.isSVG) {
                        ctx.strokeEllipse(xc, y, radiusX, radiusY, 0, 0, Math.PI, counterClockwise);
                    } else {
                        ctx.beginPath();
                        ctx.ellipse(xc, y, radiusX, radiusY, 0, 0, Math.PI, counterClockwise);
                        ctx.stroke();
                    }

                    if (this.alpha) {
                        ctx.fillStyle = getAlphaColor(color, this.alpha);
                        if (true === ctx.isSVG) {
                            ctx.fillEllipse(xc, y, radiusX, radiusY, 0, 0, Math.PI, counterClockwise);
                        } else {
                            ctx.fill();
                        }
                    }

                    if (this.showBlocks && feature.chr !== 'all') {
                        ctx.fillStyle = color;
                        const s1 = (feature.start1 - bpStart) / xScale;
                        const e1 = (feature.end1 - bpStart) / xScale;
                        const s2 = (feature.start2 - bpStart) / xScale;
                        const e2 = (feature.end2 - bpStart) / xScale;
                        const hb = direction ? -this.blockHeight : this.blockHeight;
                        ctx.fillRect(s1, y, e1 - s1, hb);
                        ctx.fillRect(s2, y, e2 - s2, hb);
                    }

                } else {
                    let pixelStart = Math.round((feature.start - bpStart) / xScale);
                    let pixelEnd = Math.round((feature.end - bpStart) / xScale);
                    if (pixelEnd < 0 || pixelStart > pixelWidth || value < this.dataRange.min || value > this.dataRange.max) continue;

                    const h = Math.min(radiusY, this.height - 13);
                    let w = (pixelEnd - pixelStart);
                    if (w < 3) {
                        w = 3;
                        pixelStart--;
                    }
                    const otherChr = feature.chr === feature.chr1 ? feature.chr2 : feature.chr1;
                    ctx.font = "8px sans-serif";
                    ctx.textAlign = "center";
                    ctx.fillStyle = getAlphaColor(getChrColor(otherChr), 0.5);
                    if (direction) {
                        const y = this.height - h;
                        ctx.fillRect(pixelStart, y, w, h);
                        ctx.fillText(otherChr, pixelStart + w / 2, y - 5);
                        feature.drawState = { x: pixelStart, y, w, h };
                    } else {
                        ctx.fillRect(pixelStart, 0, w, h);
                        ctx.fillText(otherChr, pixelStart + w / 2, h + 13);
                        feature.drawState = { x: pixelStart, y: 0, w, h };
                    }
                }
            }
        }
    }

    clearAxis(ctx, pixelWidth, pixelHeight) {
        IGVGraphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, { 'fillStyle': "rgb(255, 255, 255)" });
    }

    paintAxis(ctx, pixelWidth, pixelHeight) {
        const axisRange = { min: 0, max: this.dataRange.max };
        if (this.arcType === "proportional") {
            this.painter.flipAxis = "DOWN" === this.arcOrientation;
            this.painter.dataRange = axisRange;
            this.painter.paintAxis(ctx, pixelWidth, pixelHeight);
        } else if (this.arcType === "inView" || this.arcType === "partialInView") {
            this.painter.flipAxis = "DOWN" === this.arcOrientation;
            this.painter.dataRange = axisRange;
            this.painter.paintAxis(ctx, pixelWidth, pixelHeight);
        } else {
            this.clearAxis(ctx, pixelWidth, pixelHeight);
        }
    }

    menuItemList() {

        let items = [];

        if (this.hasValue) {
            items.push("<hr/>");
            const lut = {
                "nested": "Nested",
                "proportional": "Proportional - All",
                "inView": "Proportional - Both Ends in View",
                "partialInView": "Proportional - One End in View"
            };
            items.push("<b>Arc Type</b>");
            for (let arcType of ["nested", "proportional", "inView", "partialInView"]) {
                const object = createCheckbox(lut[arcType], arcType === this.arcType);

                function arcTypeHandler() {
                    this.arcType = arcType;
                    this.trackView.repaintViews();
                }

                items.push({ object, click: arcTypeHandler.bind(this) });
            }
        }
        items.push("<hr/>");

        items.push({
            name: "Toggle arc direction",
            click: function toggleArcDirectionHandler() {
                this.arcOrientation = "UP" === this.arcOrientation ? "DOWN" : "UP";
                this.trackView.repaintViews();
            }.bind(this)
        });
        items.push({
            name: this.showBlocks ? "Hide Blocks" : "Show Blocks",
            click: function blockVisibiltyHandler() {
                this.showBlocks = !this.showBlocks;
                this.trackView.repaintViews();
            }.bind(this)
        });

        if (this.arcType === "proportional" || this.arcType === "inView" || this.arcType === "partialInView") {
            items = items.concat(this.numericDataMenuItems());
        }

        if (this.browser.circularView) {
            items.push('<hr/>');
            items.push({
                label: 'Add interactions to circular view',
                click: function addInteractionsHandler() {
                    for (let viewport of this.trackView.viewports) {
                        this.addChordsForViewport(viewport.referenceFrame);
                    }
                }.bind(this)
            });
        }

        return items;
    }

    contextMenuItemList(clickState) {

        if (this.browser.circularView) {
            const viewport = clickState.viewport;
            const list = [];

            list.push({
                label: 'Add interactions to circular view',
                click: () => {
                    const refFrame = viewport.referenceFrame;
                    this.addChordsForViewport(refFrame);
                }
            });

            list.push('<hr/>');
            return list;
        }
    }

    addChordsForViewport(refFrame) {

        let inView;
        if ("all" === refFrame.chr) {
            inView = Object.values(this.featureSource.getAllFeatures()).flat();
        } else {
            const cachedFeatures =
                this.featureSource.featureCache.queryFeatures(refFrame.chr, refFrame.start, refFrame.end);
            inView = cachedFeatures.filter(f => f.drawState);
        }

        if (inView.length === 0) return;

        const chords = makeBedPEChords(inView);
        sendChords(chords, this, refFrame, 0.5);
    }

    doAutoscale(features) {

        let max = 0;
        if (features) {
            for (let f of features) {
                const v = this.valueColumn ? f[this.valueColumn] : f.score;
                if (!Number.isNaN(v)) {
                    max = Math.max(max, v);
                }
            }
        }
        return { min: 0, max: max };
    }

    popupData(clickState, features) {

        if (features === undefined) features = this.clickedFeatures(clickState);

        const data = [];
        for (let feature of features) {

            const f = feature._ || feature;

            data.push({ name: "Region 1", value: positionString(f.chr1, f.start1, f.end1, f.strand1) });
            data.push({ name: "Region 2", value: positionString(f.chr2, f.start2, f.end2, f.strand2) });
            if (f.name) {
                data.push({ name: "Name", value: f.name });
            }
            if (f.value !== undefined) {
                data.push({ name: "Value", value: f.value });
            }
            if (f.score !== undefined) {
                data.push({ name: "Score", value: f.score });
            }

            if (f.extras && this.header && this.header.columnNames) {
                const columnNames = this.header.columnNames;
                const stdColumns = this.header.hiccups ? 6 : 10;
                for (let i = stdColumns; i < columnNames.length; i++) {
                    if (this.header.colorColumn === i) continue;
                    if (columnNames[i] === 'info') {
                        extractInfoColumn(data, f.extras[i - stdColumns]);
                    } else {
                        data.push({ name: columnNames[i], value: f.extras[i - stdColumns] });
                    }
                }
            }
            break;
        }
        return data;
    }

    clickedFeatures(clickState) {

        const featureList = clickState.viewport.cachedFeatures;
        const candidates = [];
        if (featureList) {
            const proportional = (this.arcType === "proportional" || this.arcType === "inView" || this.arcType === "partialInView");

            for (let feature of featureList) {

                if (!feature.drawState) continue;

                if (feature.chr1 === feature.chr2 || feature.chr === 'all') {
                    if (proportional) {
                        const { xc, yc, radiusX, radiusY } = feature.drawState;
                        const dx = clickState.canvasX - xc;
                        const dy = clickState.canvasY - yc;
                        const score = (dx / radiusX) * (dx / radiusX) + (dy / radiusY) * (dy / radiusY);
                        if (score <= 1) {
                            candidates.push({ score: 1 / score, feature });
                        }
                    } else {
                        const { xc, yc, r } = feature.drawState;
                        const dx = clickState.canvasX - xc;
                        const dy = clickState.canvasY - yc;
                        const score = Math.abs(Math.sqrt(dx * dx + dy * dy) - r);
                        if (score < 5) {
                            candidates.push({ score, feature });
                        }
                    }
                } else {
                    const { x, y, w, h } = feature.drawState;
                    const tolerance = 5;
                    if (clickState.canvasX >= x - tolerance && clickState.canvasX <= x + w + tolerance &&
                        clickState.canvasY >= y && clickState.canvasY <= y + h) {
                        const score = -Math.abs(clickState.canvasX - (x + w / 2));
                        candidates.push({ score, feature });
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
    return { m1, m2 };
}

function positionString(chr, start, end, strand) {

    return strand && strand !== '.' ?
        `${chr}:${StringUtils.numberFormatter(start + 1)}-${StringUtils.numberFormatter(end)} (${strand})` :
        `${chr}:${StringUtils.numberFormatter(start + 1)}-${StringUtils.numberFormatter(end)}`;
}

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

    return Math.min(Math.PI / 2, (thetaLeft + r * (thetaRight - thetaLeft)));
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

function getWGFeatures(allFeatures) {

    const makeWGFeature = (f) => {
        const wg = Object.assign({}, f);
        wg.chr = "all";
        wg.start = genome.getGenomeCoordinate(f.chr1, f.start1);
        wg.end = genome.getGenomeCoordinate(f.chr2, f.end2);
        return wg;
    };

    const genome = this.genome;

    let maxScoreFeature;
    let totalFeatureCount = 0;
    for (let c of genome.wgChromosomeNames) {
        let chrFeatures = allFeatures[c];
        if (chrFeatures) {
            for (let f of chrFeatures) {
                if (!f.dup) {
                    totalFeatureCount++;
                    if (f.score && (!maxScoreFeature || f.score > maxScoreFeature.score)) {
                        maxScoreFeature = f;
                    }
                }
            }
        }
    }

    const maxCount = this.maxWGCount;
    const nBins = maxScoreFeature && maxScoreFeature.score > 0 && totalFeatureCount > maxCount ? 5 : 1;
    const featuresPerBin = Math.floor(maxCount / nBins);
    const binSize = maxScoreFeature && maxScoreFeature.score > 0 ? Math.log(maxScoreFeature.score) / nBins : Number.MAX_SAFE_INTEGER;

    let binnedFeatures = [];
    let counts = [];
    for (let i = 0; i < nBins; i++) {
        counts.push([0]);
        binnedFeatures.push([]);
    }

    for (let c of genome.wgChromosomeNames) {
        let chrFeatures = allFeatures[c];
        if (chrFeatures) {
            for (let f of chrFeatures) {
                if (!f.dup) {
                    const bin = f.score ? Math.max(0, Math.min(nBins - 1, Math.floor(Math.log(f.score) / binSize))) : 0;
                    if (binnedFeatures[bin].length < featuresPerBin) {
                        binnedFeatures[bin].push(makeWGFeature(f));
                    } else {
                        const samplingProb = featuresPerBin / (counts[bin] + 1);
                        if (Math.random() < samplingProb) {
                            const idx = Math.floor(Math.random() * (featuresPerBin - 1));
                            binnedFeatures[bin][idx] = makeWGFeature(f);
                        }
                    }
                    counts[bin]++;
                }
            }
        }
    }

    let wgFeatures;
    if (nBins === 1) {
        wgFeatures = binnedFeatures[0];
    } else {
        wgFeatures = [];
        for (let bf of binnedFeatures) {
            for (let f of bf) wgFeatures.push(f);
        }
        if (maxScoreFeature) {
            wgFeatures.push(makeWGFeature(maxScoreFeature));
        }
        wgFeatures.sort(function (a, b) {
            return a.start - b.start;
        });
    }

    return wgFeatures;
}

function extractInfoColumn(data, str) {
    const kvs = str.split(';');
    for (let t of kvs) {
        const kv = t.split('=');
        if (kv.length === 2) {
            data.push({ name: kv[0], value: kv[1] });
        }
    }
}

export default InteractionTrack;
