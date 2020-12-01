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
import TrackBase from "../trackBase.js";
import IGVGraphics from "../igv-canvas.js";
import {IGVColor} from "../../node_modules/igv-utils/src/index.js";
import {createCheckbox} from "../igv-icons.js";
import {PaletteColorTable} from "../util/colorPalletes.js";
import GtexUtils from "../gtex/gtexUtils.js";


let JUNCTION_MOTIF_PALETTE = new PaletteColorTable("Dark2");

// Lock in color-to-motif mapping so it's independent of data loading order. This list may not include all possible
// motif values as this varies depending on the RNA-seq pipeline. The current list is based on STAR v2.4 docs.
const someMotifValues = ['GT/AG', 'CT/AC', 'GC/AG', 'CT/GC', 'AT/AC', 'GT/AT', 'non-canonical'];
someMotifValues.forEach(motif => {
    JUNCTION_MOTIF_PALETTE.getColor(motif);
})

// rendering context with values that only need to be computed once per render, rather than for each splice junction
const junctionRenderingContext = {}

class FeatureTrack extends TrackBase {

    constructor(config, browser) {

        super(config, browser);

        // Set maxRows -- protects against pathological feature packing cases (# of rows of overlapping feaures)
        this.maxRows = config.maxRows === undefined ? 1000 : config.maxRows;

        this.displayMode = config.displayMode || "EXPANDED";    // COLLAPSED | EXPANDED | SQUISHED
        this.labelDisplayMode = config.labelDisplayMode;

        if (config._featureSource) {
            this.featureSource = config._featureSource;
            delete config._featureSource;
        } else {
            this.featureSource = config.featureSource ?
                config.featureSource :
                FeatureSource(config, browser.genome);
        }

        // Set default heights
        this.autoHeight = config.autoHeight;
        this.margin = config.margin === undefined ? 10 : config.margin;

        this.featureHeight = config.featureHeight || 14;

        if ("FusionJuncSpan" === config.type) {
            this.squishedRowHeight = config.squishedRowHeight || 50;
            this.expandedRowHeight = config.expandedRowHeight || 50;
            this.height = config.height || this.margin + 2 * this.expandedRowHeight;
        } else if ('snp' === config.type) {
            this.expandedRowHeight = config.expandedRowHeight || 10;
            this.squishedRowHeight = config.squishedRowHeight || 5;
            this.height = config.height || 30;
        } else {
            this.squishedRowHeight = config.squishedRowHeight || 15;
            this.expandedRowHeight = config.expandedRowHeight || 30;
            this.height = config.height || this.margin + 2 * this.expandedRowHeight;
        }

        if (this.height === undefined || !this.height) {
            this.height = 100;
        }

        //set defaults
        if (('spliceJunctions' === config.type)
            && config.colorByNumReadsThreshold === undefined) {
            config.colorByNumReadsThreshold = 5;
        }

        // Set the render function.  This can optionally be passed in the config
        if (config.render) {
            this.render = config.render;
        } else if ("FusionJuncSpan" === config.type) {
            this.render = renderFusionJuncSpan;
        } else if ('spliceJunctions' === config.type) {
            this.render = renderJunctions;
        } else if ('snp' === config.type) {
            this.render = renderSnp;
            // colors ordered based on priority least to greatest
            this.snpColors = ['rgb(0,0,0)', 'rgb(0,0,255)', 'rgb(0,255,0)', 'rgb(255,0,0)'];
            this.colorBy = 'function';
        } else {
            this.render = renderFeature;
            this.arrowSpacing = 30;
            // adjust label positions to make sure they're always visible
            monitorTrackDrag(this);
        }

        //UCSC useScore option
        this.useScore = config.useScore;

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
            this.featureSource.visibilityWindow = this.visibilityWindow;   // <- this looks odd
        }

        return this;
    }

    supportsWholeGenome() {
        return (this.config.indexed === false || !this.config.indexURL) && this.config.supportsWholeGenome !== false
    }

    async getFeatures(chr, start, end, bpPerPixel) {
        const visibilityWindow = this.visibilityWindow;
        return this.featureSource.getFeatures({chr, start, end, bpPerPixel, visibilityWindow});
    };


    /**
     * The required height in pixels required for the track content.   This is not the visible track height, which
     * can be smaller (with a scrollbar) or larger.
     *
     * @param features
     * @returns {*}
     */
    computePixelHeight(features) {

        if (this.type === 'spliceJunctions') {
            return this.height;
        } else if (this.displayMode === "COLLAPSED") {
            return this.margin + this.expandedRowHeight;
        } else {
            let maxRow = 0;
            if (features && (typeof features.forEach === "function")) {
                for (let feature of features) {
                    if (feature.row && feature.row > maxRow) {
                        maxRow = feature.row;
                    }
                }
            }

            const height = this.margin + (maxRow + 1) * ("SQUISHED" === this.displayMode ? this.squishedRowHeight : this.expandedRowHeight);
            return height;

        }
    };

    draw(options) {

        const featureList = options.features;
        const ctx = options.context;
        const bpPerPixel = options.bpPerPixel;
        const bpStart = options.bpStart;
        const pixelWidth = options.pixelWidth;
        const pixelHeight = options.pixelHeight;
        const bpEnd = bpStart + pixelWidth * bpPerPixel + 1;


        if (!this.config.isMergedTrack) {
            IGVGraphics.fillRect(ctx, 0, options.pixelTop, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});
        }

        if (featureList) {

            const rowFeatureCount = [];
            options.rowLastX = [];
            for (let feature of featureList) {
                const row = feature.row || 0;
                if (rowFeatureCount[row] === undefined) {
                    rowFeatureCount[row] = 1;
                } else {
                    rowFeatureCount[row]++;
                }
                options.rowLastX[row] = -Number.MAX_SAFE_INTEGER;
            }

            if (this.config.type == 'spliceJunctions') {
                const vp = this.browser.trackViews[0].viewports[0]
                junctionRenderingContext.referenceFrame = vp.referenceFrame;
                junctionRenderingContext.referenceFrameStart = junctionRenderingContext.referenceFrame.start;
                junctionRenderingContext.referenceFrameEnd = junctionRenderingContext.referenceFrameStart + junctionRenderingContext.referenceFrame.toBP($(vp.contentDiv).width());

                // For a given viewport, records where features that are < 2px in width have been rendered already.
                // This prevents wasteful rendering of multiple such features onto the same pixels.
                junctionRenderingContext.featureZoomOutTracker = {}
            }

            let lastPxEnd = [];
            for (let feature of featureList) {
                if (feature.end < bpStart) continue;
                if (feature.start > bpEnd) break;

                const row = this.displayMode === 'COLLAPSED' ? 0 : feature.row;
                const featureDensity = pixelWidth / rowFeatureCount[row];
                options.drawLabel = options.labelAllFeatures || featureDensity > 10;
                const pxEnd = Math.ceil((feature.end - bpStart) / bpPerPixel);
                const last = lastPxEnd[row];
                if (!last || pxEnd > last || this.config.type === 'spliceJunctions') {
                    this.render.call(this, feature, bpStart, bpPerPixel, pixelHeight, ctx, options);

                    if (this.config.type !== 'spliceJunctions') {
                        // Ensure a visible gap between features
                        const pxStart = Math.floor((feature.start - bpStart) / bpPerPixel)
                        if (last && pxStart - last <= 0) {
                            ctx.globalAlpha = 0.5
                            IGVGraphics.strokeLine(ctx, pxStart, 0, pxStart, pixelHeight, {'strokeStyle': "rgb(255, 255, 255)"})
                            ctx.globalAlpha = 1.0
                        }
                        lastPxEnd[row] = pxEnd;
                    }
                }
            }

        } else {
            console.log("No feature list");
        }

    };

    clickedFeatures(clickState) {

        const y = clickState.y - this.margin;
        const allFeatures = super.clickedFeatures(clickState);

        let row;
        switch (this.displayMode) {
            case 'SQUISHED':
                row = Math.floor(y / this.squishedRowHeight);
                break;
            case 'EXPANDED':
                row = Math.floor(y / this.expandedRowHeight);
                break;
            default:
                row = undefined;
        }

        return allFeatures.filter(function (feature) {
            return (row === undefined || feature.row === undefined || row === feature.row);
        })
    }

    /**
     * Return "popup data" for feature @ genomic location.  Data is an array of key-value pairs
     */
    popupData(clickState, features) {

        if (!features) features = this.clickedFeatures(clickState);
        const genomicLocation = clickState.genomicLocation;

        const data = [];
        for (let feature of features) {
            if (this.config.type === 'spliceJunctions') {
                if (!feature.isVisible || !feature.attributes) {
                    continue
                }
            }
            const featureData = (typeof feature.popupData === "function") ?
              feature.popupData(genomicLocation) :
              TrackBase.extractPopupData(feature, this.getGenomeId());

            if (featureData) {
                if (data.length > 0) {
                    data.push("<HR>");
                }

                Array.prototype.push.apply(data, featureData);
            }
        }

        return data;

    }


    menuItemList() {

        const self = this;
        const menuItems = [];

        if (this.render === renderSnp) {
            (["function", "class"]).forEach(function (colorScheme) {
                menuItems.push({
                    object: createCheckbox('Color by ' + colorScheme, colorScheme === self.colorBy),
                    click: function () {
                        self.colorBy = colorScheme;
                        self.trackView.repaintViews();
                    }
                });
            });

            menuItems.push({object: $('<div class="igv-track-menu-border-top">')});

        }

        menuItems.push({object: $('<div class="igv-track-menu-border-top">')});

        ["COLLAPSED", "SQUISHED", "EXPANDED"].forEach(function (displayMode) {
            const lut =
                {
                    "COLLAPSED": "Collapse",
                    "SQUISHED": "Squish",
                    "EXPANDED": "Expand"
                };

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
        });

        return menuItems;

    };


    description() {

        // if('snp' === this.type) {
        if (renderSnp === this.render) {
            let desc = "<html>" + this.name + "<hr>";
            desc += '<em>Color By Function:</em><br>';
            desc += '<span style="color:red">Red</span>: Coding-Non-Synonymous, Splice Site<br>';
            desc += '<span style="color:green">Green</span>: Coding-Synonymous<br>';
            desc += '<span style="color:blue">Blue</span>: Untranslated<br>';
            desc += '<span style="color:black">Black</span>: Intron, Locus, Unknown<br><br>';
            desc += '<em>Color By Class:</em><br>';
            desc += '<span style="color:red">Red</span>: Deletion<br>';
            desc += '<span style="color:green">Green</span>: MNP<br>';
            desc += '<span style="color:blue">Blue</span>: Microsatellite, Named<br>';
            desc += '<span style="color:black">Black</span>: Indel, Insertion, SNP';
            desc += "</html>";
            return desc;
        } else {
            return this.name;
        }

    };

    /**
     * Called when the track is removed.  Do any needed cleanup here
     */
    dispose() {
       this.trackView = undefined;
    }
}

/**
 * Monitors track drag events, updates label position to ensure that they're always visible.
 * @param track
 */
function monitorTrackDrag(track) {

    if (track.browser.on) {
        track.browser.on('trackdragend', onDragEnd);
        track.browser.on('trackremoved', unSubscribe);
    }

    function onDragEnd() {
        if (!track.trackView || !track.trackView.tile || track.displayMode === "SQUISHED") {
            return;
        }
        track.trackView.repaintViews();
    }

    function unSubscribe(removedTrack) {
        if (track.browser.un && track === removedTrack) {
            track.browser.un('trackdrag', onDragEnd);
            track.browser.un('trackremoved', unSubscribe);
        }
    }

}

/**
 * @param feature
 * @param bpStart  genomic location of the left edge of the current canvas
 * @param xScale  scale in base-pairs per pixel
 * @returns {{px: number, px1: number, pw: number, h: number, py: number}}
 */
function calculateFeatureCoordinates(feature, bpStart, xScale) {
    let px = (feature.start - bpStart) / xScale;
    let px1 = (feature.end - bpStart) / xScale;
    //px = Math.round((feature.start - bpStart) / xScale),
    //px1 = Math.round((feature.end - bpStart) / xScale),
    let pw = px1 - px;

    if (pw < 3) {
        pw = 3;
        px -= 1.5;
    }

    return {
        px: px,
        px1: px1,
        pw: pw
    };
}

/**
 * Return color for feature.  Called in the context of a FeatureTrack instance.
 * @param feature
 * @returns {string}
 */
function getColorForFeature(feature) {
    let color;
    if (this.altColor && "-" === feature.strand) {
        color = this.altColor;
    } else if (this.color) {
        color = this.color;   // Explicit setting via menu, or possibly track line if !config.color
    } else if (this.config.colorBy) {
        const colorByValue = feature[this.config.colorBy.field];
        if (colorByValue) {
            color = this.config.colorBy.pallete[colorByValue];  // This is an undocumented option, and its not clear if its used
        }
    } else if (feature.color) {
        color = feature.color;   // Explicit color for feature
    } else {
        color = this.defaultColor;   // Track default
    }

    if (feature.alpha && feature.alpha !== 1) {
        color = IGVColor.addAlpha(color, feature.alpha);
    } else if (this.useScore && feature.score && !Number.isNaN(feature.score)) {
        // UCSC useScore option, for scores between 0-1000.  See https://genome.ucsc.edu/goldenPath/help/customTrack.html#TRACK
        const min = this.config.min? this.config.min : 0; //getViewLimitMin(track);
        const max = this.config.max? this.config.max : 1000; //getViewLimitMax(track);
        const alpha = getAlpha(min, max, feature.score);
        feature.alpha = alpha;    // Avoid computing again
        color = IGVColor.addAlpha(color, alpha);
    }


    function getAlpha(min, max, score) {
        const binWidth = (max - min) / 9;
        const binNumber = Math.floor((score - min) / binWidth);
        return Math.min(1.0, 0.2 + (binNumber * 0.8) / 9);
    }

    return color
}

/**
 *
 * @param feature
 * @param bpStart  genomic location of the left edge of the current canvas
 * @param xScale  scale in base-pairs per pixel
 * @param pixelHeight  pixel height of the current canvas
 * @param ctx  the canvas 2d context
 * @param options  genomic state
 */
function renderFeature(feature, bpStart, xScale, pixelHeight, ctx, options) {

    const browser = this.browser;
    let color = getColorForFeature.call(this, feature)

    ctx.fillStyle = color;
    ctx.strokeStyle = color;

    let h;
    let py;
    if (this.displayMode === "SQUISHED" && feature.row !== undefined) {
        h = this.featureHeight / 2;
        py = this.margin + this.squishedRowHeight * feature.row;
    } else if (this.displayMode === "EXPANDED" && feature.row !== undefined) {
        h = this.featureHeight
        py = this.margin + this.expandedRowHeight * feature.row;
    } else {  // collapsed
        h = this.featureHeight;
        py = this.margin;
    }

    const cy = py + h / 2;
    const h2 = h / 2;
    const py2 = cy - h2 / 2;

    const exonCount = feature.exons ? feature.exons.length : 0;
    const coord = calculateFeatureCoordinates(feature, bpStart, xScale);
    const step = this.arrowSpacing;
    const direction = feature.strand === '+' ? 1 : feature.strand === '-' ? -1 : 0;

    if (exonCount === 0) {
        // single-exon transcript
        ctx.fillRect(coord.px, py, coord.pw, h);

        // Arrows
        // Do not draw if strand is not +/-
        if (direction !== 0) {
            ctx.fillStyle = "white";
            ctx.strokeStyle = "white";
            for (let x = coord.px + step / 2; x < coord.px1; x += step) {
                // draw arrowheads along central line indicating transcribed orientation
                IGVGraphics.strokeLine(ctx, x - direction * 2, cy - 2, x, cy);
                IGVGraphics.strokeLine(ctx, x - direction * 2, cy + 2, x, cy);
            }
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
        }
    } else {
        // multi-exon transcript
        IGVGraphics.strokeLine(ctx, coord.px + 1, cy, coord.px1 - 1, cy); // center line for introns

        const pixelWidth = options.pixelWidth;

        const xLeft = Math.max(0, coord.px) + step / 2;
        const xRight = Math.min(pixelWidth, coord.px1);
        for (let x = xLeft; x < xRight; x += step) {
            // draw arrowheads along central line indicating transcribed orientation
            IGVGraphics.strokeLine(ctx, x - direction * 2, cy - 2, x, cy);
            IGVGraphics.strokeLine(ctx, x - direction * 2, cy + 2, x, cy);
        }
        for (let e = 0; e < exonCount; e++) {
            // draw the exons
            const exon = feature.exons[e];
            let ePx = Math.round((exon.start - bpStart) / xScale);
            let ePx1 = Math.round((exon.end - bpStart) / xScale);
            let ePw = Math.max(1, ePx1 - ePx);
            let ePxU;

            if (ePx + ePw < 0) {
                continue;  // Off the left edge
            }
            if (ePx > pixelWidth) {
                break; // Off the right edge
            }

            if (exon.utr) {
                ctx.fillRect(ePx, py2, ePw, h2); // Entire exon is UTR
            } else {
                if (exon.cdStart) {
                    ePxU = Math.round((exon.cdStart - bpStart) / xScale);
                    ctx.fillRect(ePx, py2, ePxU - ePx, h2); // start is UTR
                    ePw -= (ePxU - ePx);
                    ePx = ePxU;

                }
                if (exon.cdEnd) {
                    ePxU = Math.round((exon.cdEnd - bpStart) / xScale);
                    ctx.fillRect(ePxU, py2, ePx1 - ePxU, h2); // start is UTR
                    ePw -= (ePx1 - ePxU);
                    ePx1 = ePxU;
                }

                ctx.fillRect(ePx, py, ePw, h);

                // Arrows
                if (ePw > step + 5 && direction !== 0) {
                    ctx.fillStyle = "white";
                    ctx.strokeStyle = "white";
                    for (let x = ePx + step / 2; x < ePx1; x += step) {
                        // draw arrowheads along central line indicating transcribed orientation
                        IGVGraphics.strokeLine(ctx, x - direction * 2, cy - 2, x, cy);
                        IGVGraphics.strokeLine(ctx, x - direction * 2, cy + 2, x, cy);
                    }
                    ctx.fillStyle = color;
                    ctx.strokeStyle = color;

                }
            }
        }
    }

    const windowX = Math.round(options.viewportContainerX);
    // const nLoci = browser.referenceFrameList ? browser.referenceFrameList.length : 1
    // const windowX1 = windowX + options.viewportContainerWidth / nLoci;
    const windowX1 = windowX + options.viewportWidth;

    if (options.drawLabel) {
        renderFeatureLabel.call(this, ctx, feature, coord.px, coord.px1, py, windowX, windowX1, options.referenceFrame, options);
    }
}

/**
 * @param ctx       the canvas 2d context
 * @param feature
 * @param featureX  feature start x-coordinate
 * @param featureX1 feature end x-coordinate
 * @param featureY  feature y-coordinate
 * @param windowX   visible window start x-coordinate
 * @param windowX1  visible window end x-coordinate
 * @param referenceFrame  genomic state
 * @param options  options
 */
function renderFeatureLabel(ctx, feature, featureX, featureX1, featureY, windowX, windowX1, referenceFrame, options) {

    let name = feature.name;
    if (name === undefined && feature.gene) name = feature.gene.name;
    if (name === undefined) name = feature.id || feature.ID
    if (!name || name === '.') return;

    // feature outside of viewable window
    let boxX;
    let boxX1;
    if (featureX1 < windowX || featureX > windowX1) {
        boxX = featureX;
        boxX1 = featureX1;
    } else {
        // center label within visible portion of the feature
        boxX = Math.max(featureX, windowX);
        boxX1 = Math.min(featureX1, windowX1);
    }

    let color = getColorForFeature.call(this, feature);
    let geneColor;
    let gtexSelection = false;
    if (referenceFrame.selection && GtexUtils.gtexLoaded) {
        // TODO -- for gtex, figure out a better way to do this
        gtexSelection = true;
        geneColor = referenceFrame.selection.colorForGene(name);
    }


    if (this.displayMode !== "SQUISHED") {
        const geneFontStyle = {
            textAlign: "SLANT" === this.labelDisplayMode ? undefined : 'center',
            fillStyle: geneColor || color,
            strokeStyle: geneColor || color
        };

        let transform;
        if (this.displayMode === "COLLAPSED" && this.labelDisplayMode === "SLANT") {
            transform = {rotate: {angle: 45}};
        }

        const labelX = boxX + ((boxX1 - boxX) / 2);
        const labelY = getFeatureLabelY(featureY, transform);

        const textBox = ctx.measureText(name);
        const xleft = labelX - textBox.width / 2;
        const xright = labelX + textBox.width / 2;
        if (options.labelAllFeatures || xleft > options.rowLastX[feature.row] || gtexSelection) {

            options.rowLastX[feature.row] = xright;

            // This is for compatibility with JuiceboxJS.
            if (options.labelTransform) {
                ctx.save();
                options.labelTransform(ctx, labelX);
                IGVGraphics.fillText(ctx, name, labelX, labelY, geneFontStyle, undefined);
                ctx.restore();

            } else {
                IGVGraphics.fillText(ctx, name, labelX, labelY, geneFontStyle, transform);
            }
        }
    }
}


function getFeatureLabelY(featureY, transform) {
    return transform ? featureY + 20 : featureY + 25;
}

/**
 *
 * @param feature
 * @param bpStart  genomic location of the left edge of the current canvas
 * @param xScale  scale in base-pairs per pixel
 * @param pixelHeight  pixel height of the current canvas
 * @param ctx  the canvas 2d context
 */
function renderFusionJuncSpan(feature, bpStart, xScale, pixelHeight, ctx) {
    var py;
    var rowHeight = (this.displayMode === "EXPANDED") ? this.expandedRowHeight : this.squishedRowHeight;

    if (this.display === "COLLAPSED") {
        py = this.margin;
    }

    if (this.displayMode === "SQUISHED" && feature.row !== undefined) {
        py = this.margin + rowHeight * feature.row;
    } else if (this.displayMode === "EXPANDED" && feature.row !== undefined) {
        py = this.margin + rowHeight * feature.row;
    }

    var cy = py + 0.5 * rowHeight;
    var topY = cy - 0.5 * rowHeight;
    var bottomY = cy + 0.5 * rowHeight;

    // draw the junction arc
    var junctionLeftPx = Math.round((feature.junction_left - bpStart) / xScale);
    var junctionRightPx = Math.round((feature.junction_right - bpStart) / xScale);

    ctx.beginPath();
    ctx.moveTo(junctionLeftPx, cy);
    ctx.bezierCurveTo(junctionLeftPx, topY, junctionRightPx, topY, junctionRightPx, cy);

    ctx.lineWidth = 1 + Math.log(feature.num_junction_reads) / Math.log(2);
    ctx.strokeStyle = 'blue';
    ctx.stroke();

    // draw the spanning arcs
    var spanningCoords = feature.spanning_frag_coords;
    for (var i = 0; i < spanningCoords.length; i++) {
        var spanningInfo = spanningCoords[i];

        var spanLeftPx = Math.round((spanningInfo.left - bpStart) / xScale);
        var spanRightPx = Math.round((spanningInfo.right - bpStart) / xScale);


        ctx.beginPath();
        ctx.moveTo(spanLeftPx, cy);
        ctx.bezierCurveTo(spanLeftPx, bottomY, spanRightPx, bottomY, spanRightPx, cy);

        ctx.lineWidth = 1;
        ctx.strokeStyle = 'purple';
        ctx.stroke();
    }
}


/**
 *
 * @param feature
 * @param bpStart  genomic location of the left edge of the current canvas
 * @param xScale  scale in base-pairs per pixel
 * @param pixelHeight  pixel height of the current canvas
 * @param ctx  the canvas 2d context
 */
function renderJunctions(feature, bpStart, xScale, pixelHeight, ctx) {
    // cache whether this junction is rendered or filtered out. Use later to exclude non-rendered junctions from click detection.
    feature.isVisible = false

    const junctionLeftPx = Math.round((feature.start - bpStart) / xScale);
    const junctionRightPx = Math.round((feature.end - bpStart) / xScale);
    const junctionMiddlePx = (junctionLeftPx + junctionRightPx) / 2;
    if (junctionRightPx - junctionLeftPx <= 3) {
        if (junctionMiddlePx in junctionRenderingContext.featureZoomOutTracker) {
            return
        }
        junctionRenderingContext.featureZoomOutTracker[junctionMiddlePx] = true
    }

    // TODO: cache filter and pixel calculations by doing them earlier when features are initially parsed?
    if (this.config.hideAnnotatedJunctions && feature.attributes.annotated_junction === "true") {
        return
    }
    if (this.config.hideUnannotatedJunctions && feature.attributes.annotated_junction === "false") {
        return
    }
    if (this.config.hideMotifs && this.config.hideMotifs.includes(feature.attributes.motif)) {
        return
    }
    if (this.config.hideStrand === feature.strand) {
        return
    }

    // check if splice junction is inside viewport
    if (this.config.minJunctionEndsVisible) {
        let numJunctionEndsVisible = 0
        if (feature.start >= junctionRenderingContext.referenceFrameStart && feature.start <= junctionRenderingContext.referenceFrameEnd) {
            numJunctionEndsVisible += 1
        }
        if (feature.end >= junctionRenderingContext.referenceFrameStart && feature.end <= junctionRenderingContext.referenceFrameEnd) {
            numJunctionEndsVisible += 1
        }
        if (numJunctionEndsVisible < this.config.minJunctionEndsVisible) {
            return
        }
    }

    let uniquelyMappedReadCount;
    let multiMappedReadCount;
    let totalReadCount;
    if (feature.attributes.uniquely_mapped) {
        uniquelyMappedReadCount = parseInt(feature.attributes.uniquely_mapped);
        if (uniquelyMappedReadCount < this.config.minUniquelyMappedReads) {
            return
        }
        multiMappedReadCount = parseInt(feature.attributes.multi_mapped);
        totalReadCount = uniquelyMappedReadCount + multiMappedReadCount;
        if (totalReadCount < this.config.minTotalReads) {
            return
        }
        if (totalReadCount > 0 && multiMappedReadCount / totalReadCount > this.config.maxFractionMultiMappedReads) {
            return
        }
        if (feature.attributes.maximum_spliced_alignment_overhang && parseInt(feature.attributes.maximum_spliced_alignment_overhang) < this.config.minSplicedAlignmentOverhang) {
            return
        }
    }

    let numSamplesWithThisJunction
    if (feature.attributes.num_samples_with_this_junction) {
        numSamplesWithThisJunction = parseInt(feature.attributes.num_samples_with_this_junction)
        if (this.config.minSamplesWithThisJunction && numSamplesWithThisJunction < this.config.minSamplesWithThisJunction) {
            return
        }
        if (this.config.maxSamplesWithThisJunction && numSamplesWithThisJunction > this.config.maxSamplesWithThisJunction) {
            return
        }
        if (feature.attributes.num_samples_total) {
            feature.attributes.percent_samples_with_this_junction = 100*numSamplesWithThisJunction / parseFloat(feature.attributes.num_samples_total)
            if (this.config.minPercentSamplesWithThisJunction) {
                if (feature.attributes.percent_samples_with_this_junction < this.config.minPercentSamplesWithThisJunction ||
                    feature.attributes.percent_samples_with_this_junction > this.config.maxPercentSamplesWithThisJunction) {
                    return
                }
            }
        }
    }

    const py = this.margin;
    const rowHeight = this.height;

    const cy = py + 0.5 * rowHeight;
    let topY = py;
    const bottomY = py + rowHeight;
    const bezierBottomY = bottomY - 10;

    // draw the junction arc
    const bezierControlLeftPx = (junctionLeftPx + junctionMiddlePx) / 2;
    const bezierControlRightPx = (junctionMiddlePx + junctionRightPx) / 2;

    let lineWidth = 1;
    if (feature.attributes.line_width) {
        lineWidth = parseFloat(feature.attributes.line_width)
    } else {
        if (this.config.thicknessBasedOn === undefined || this.config.thicknessBasedOn === 'numUniqueReads') {
            lineWidth = uniquelyMappedReadCount;
        } else if (this.config.thicknessBasedOn === 'numReads') {
            lineWidth = totalReadCount;
        } else if (this.config.thicknessBasedOn === 'numSamplesWithThisJunction') {
            if (numSamplesWithThisJunction !== undefined) {
                lineWidth = numSamplesWithThisJunction;
            }
        }
        lineWidth = 1 + Math.log(lineWidth + 1) / Math.log(12);
    }

    let bounceHeight;
    if (this.config.bounceHeightBasedOn === undefined || this.config.bounceHeightBasedOn === 'random') {
        // randomly but deterministically stagger topY coordinates to reduce overlap
        bounceHeight = (feature.start + feature.end) % 7;
    } else if (this.config.bounceHeightBasedOn === 'distance') {
        bounceHeight = 6 * (feature.end - feature.start) / (junctionRenderingContext.referenceFrameEnd - junctionRenderingContext.referenceFrameStart);
    } else if (this.config.bounceHeightBasedOn === 'thickness') {
        bounceHeight = 2 * lineWidth;
    }
    topY += rowHeight * Math.max(7 - bounceHeight, 0) / 10;

    let color;
    if (feature.attributes.color) {
        color = feature.attributes.color;  // Explicit setting
    } else if (this.config.colorBy === undefined || this.config.colorBy === 'numUniqueReads') {
        color = uniquelyMappedReadCount > this.config.colorByNumReadsThreshold ? 'blue' : '#AAAAAA';  // color gradient?
    } else if (this.config.colorBy === 'numReads') {
        color = totalReadCount > this.config.colorByNumReadsThreshold ? 'blue' : '#AAAAAA';
    } else if (this.config.colorBy === 'isAnnotatedJunction') {
        color = feature.attributes.annotated_junction === "true" ? '#b0b0ec' : 'orange';
    } else if (this.config.colorBy === 'strand') {
        color = feature.strand === "+" ? '#b0b0ec' : '#ecb0b0';
    } else if (this.config.colorBy === 'motif') {
        color = JUNCTION_MOTIF_PALETTE.getColor(feature.attributes.motif);
    } else {
        color = '#AAAAAA'
    }

    let label = ""
    if (feature.attributes.label) {
        label = feature.attributes.label.replace(/_/g, " ")
    } else if (this.config.labelWith === undefined || this.config.labelWith === 'uniqueReadCount') {
        //default label
        label = uniquelyMappedReadCount
    } else if(this.config.labelWith === 'totalReadCount') {
        label = totalReadCount
    } else if(this.config.labelWith === 'numSamplesWithThisJunction') {
        if (numSamplesWithThisJunction !== undefined) {
            label = numSamplesWithThisJunction
        }
    } else if(this.config.labelWith === 'percentSamplesWithThisJunction') {
        if(feature.attributes.percent_samples_with_this_junction !== undefined) {
            label = feature.attributes.percent_samples_with_this_junction.toFixed(0) + '%'
        }
    } else if(this.config.labelWith === 'motif') {
        if(feature.attributes.motif !== undefined) {
            label += feature.attributes.motif
        }
    }

    if (this.config.labelWithInParen === 'uniqueReadCount') {
        label += ' (' + uniquelyMappedReadCount + ')'
    } else if(this.config.labelWithInParen === 'totalReadCount') {
        label += ' (' + totalReadCount + ')'
    } else if(this.config.labelWithInParen === 'multiMappedReadCount') {
        if (multiMappedReadCount > 0) {
            label += ' (+' + multiMappedReadCount + ')'
        }
    } else if(this.config.labelWithInParen === 'numSamplesWithThisJunction') {
        if(numSamplesWithThisJunction !== undefined) {
            label += ' (' + numSamplesWithThisJunction + ')'
        }
    } else if(this.config.labelWithInParen === 'percentSamplesWithThisJunction') {
        if(feature.attributes.percent_samples_with_this_junction !== undefined) {
            label += ' (' + feature.attributes.percent_samples_with_this_junction.toFixed(0) + '%)'
        }
    } else if(this.config.labelWithInParen === 'motif') {
        if(feature.attributes.motif !== undefined) {
            label += ` ${feature.attributes.motif}`
        }
    }

    // data source: STAR splice junctions (eg. SJ.out.tab file converted to bed).
    // .bed "name" field used to store unique + multi-mapped read counts, so:
    // feature.score:  unique spanning read counts
    // feature.name:   unique + multi-mapped spanning read counts
    //example feature:  { chr: "chr17", start: 39662344, end: 39662803, name: "59", row: 0, score: 38, strand: "+"}
    feature.isVisible = true
    ctx.beginPath();
    ctx.moveTo(junctionLeftPx, bezierBottomY);
    ctx.bezierCurveTo(bezierControlLeftPx, topY, bezierControlRightPx, topY, junctionRightPx, bezierBottomY);

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.stroke();

    const drawArrowhead = (ctx, x, y, size) => {
        //TODO draw better arrow heads: https://stackoverflow.com/questions/21052972/curved-thick-arrows-on-canvas
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - size / 2, y - size);
        ctx.lineTo(x + size / 2, y - size);
        ctx.lineTo(x, y);
        ctx.closePath();
        ctx.fill();
    }

    if (feature.attributes.left_shape || feature.attributes.right_shape) {
        ctx.fillStyle = color;
        const arrowSize = ctx.lineWidth > 2 ? 10 : 7;
        if (feature.attributes.left_shape) {
            drawArrowhead(ctx, junctionLeftPx, bezierBottomY, arrowSize)
        }
        if (feature.attributes.right_shape) {
            drawArrowhead(ctx, junctionRightPx, bezierBottomY, arrowSize)
        }
    }

    ctx.fillText(label, junctionMiddlePx - ctx.measureText(label).width / 2, (7 * topY + cy) / 8);
}

// SNP constants
const codingNonSynonSet = new Set(['nonsense', 'missense', 'stop-loss', 'frameshift', 'cds-indel']);
const codingSynonSet = new Set(['coding-synon']);
const spliceSiteSet = new Set(['splice-3', 'splice-5']);
const untranslatedSet = new Set(['untranslated-5', 'untranslated-3']);
const locusSet = new Set(['near-gene-3', 'near-gene-5']);
const intronSet = new Set(['intron']);

/**
 * Renderer for a UCSC snp track
 *
 * @param snp
 * @param bpStart  genomic location of the left edge of the current canvas
 * @param xScale  scale in base-pairs per pixel
 * @param pixelHeight  pixel height of the current canvas
 * @param ctx  the canvas 2d context
 */
function renderSnp(snp, bpStart, xScale, pixelHeight, ctx) {

    var coord = calculateFeatureCoordinates(snp, bpStart, xScale),
        py = this.margin,
        h,
        colorArrLength = this.snpColors.length,
        colorPriority;

    h = this.displayMode === "squished" ? this.squishedRowHeight : this.expandedRowHeight;

    switch (this.colorBy) {
        case 'function':
            colorPriority = colorByFunc(snp.func);
            break;
        case 'class':
            colorPriority = colorByClass(snp['class']);
    }

    ctx.fillStyle = this.snpColors[colorPriority];
    ctx.fillRect(coord.px, py, coord.pw, h);

    // Coloring functions, convert a value to a priority

    function colorByFunc(theFunc) {
        var priorities;
        var funcArray = theFunc.split(',');
        // possible func values


        priorities = funcArray.map(function (func) {
            if (codingNonSynonSet.has(func) || spliceSiteSet.has(func)) {
                return colorArrLength - 1;
            } else if (codingSynonSet.has(func)) {
                return colorArrLength - 2;
            } else if (untranslatedSet.has(func)) {
                return colorArrLength - 3;
            } else { // locusSet.has(func) || intronSet.has(func)
                return 0;
            }
        });

        return priorities.reduce(function (a, b) {
            return Math.max(a, b);
        });
    }

    function colorByClass(cls) {
        if (cls === 'deletion') {
            return colorArrLength - 1;
        } else if (cls === 'mnp') {
            return colorArrLength - 2;
        } else if (cls === 'microsatellite' || cls === 'named') {
            return colorArrLength - 3;
        } else { // cls === 'single' || cls === 'in-del' || cls === 'insertion'
            return 0;
        }
    }
}

export default FeatureTrack;
