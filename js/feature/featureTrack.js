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
import BWSource from "../bigwig/bwSource.js";
import IGVGraphics from "../igv-canvas.js";
import IGVColor from "../igv-color.js";
import {createCheckbox} from "../igv-icons.js";
import {extend} from "../util/igvUtils.js";
import {PaletteColorTable} from "../util/colorPalletes.js";
import GtexUtils from "../gtex/gtexUtils.js";


var JUNCTION_MOTIF_PALETTE = new PaletteColorTable("Dark2");

// Lock in color-to-motif mapping so it's independent of data loading order. This list may not include all possible
// motif values as this varies depending on the RNA-seq pipeline. The current list is based on STAR v2.4 docs.
var someMotifValues = ['GT/AG', 'CT/AC', 'GC/AG', 'CT/GC', 'AT/AC', 'GT/AT', 'non-canonical'];
someMotifValues.forEach(motif => {
    JUNCTION_MOTIF_PALETTE.getColor(motif);
})


const FeatureTrack = extend(TrackBase,

    function (config, browser) {

        this.type = "feature";

        TrackBase.call(this, config, browser);

        // Set maxRows -- protects against pathological feature packing cases (# of rows of overlapping feaures)
        if (config.maxRows === undefined) {
            config.maxRows = 500;
        }
        this.maxRows = config.maxRows;
        this.displayMode = config.displayMode || "EXPANDED";    // COLLAPSED | EXPANDED | SQUISHED
        this.labelDisplayMode = config.labelDisplayMode;

        const format = config.format ? config.format.toLowerCase() : undefined;
        if ('bigwig' === format || 'bigbed' === format) {
            this.featureSource = new BWSource(config, browser.genome);
        } else {
            this.featureSource = new FeatureSource(config, browser.genome);
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
        if ('junctions' === config.type && config.colorByNumReadsThreshold === undefined) {
            config.colorByNumReadsThreshold = 5;
        }

        // Set the render function.  This can optionally be passed in the config
        if (config.render) {
            this.render = config.render;
        } else if ("FusionJuncSpan" === config.type) {
            this.render = renderFusionJuncSpan;
        } else if ('junctions' === config.type) {
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

    });

FeatureTrack.prototype.postInit = async function () {

    const header = await this.readFileHeader();

    // Set properties from track line
    if (header) this.setTrackProperties(header)

    const format = this.config.format;
    if (format && format.toLowerCase() === 'bigbed' &&
        this.visibilityWindow === undefined &&
        typeof this.featureSource.defaultVisibilityWindow === 'function') {
        this.visibilityWindow = await this.featureSource.defaultVisibilityWindow()
        this.featureSource.visibilityWindow = this.visibilityWindow;
    }

    return this;

}

FeatureTrack.prototype.supportsWholeGenome = function () {
    return this.config.indexed === false && this.config.supportsWholeGenome !== false
}

FeatureTrack.prototype.readFileHeader = async function () {

    if (typeof this.featureSource.getFileHeader === "function") {
        this.header = await this.featureSource.getFileHeader();
    }

    return this.header;
}

FeatureTrack.prototype.getFeatures = async function (chr, bpStart, bpEnd, bpPerPixel) {
    return this.featureSource.getFeatures(chr, bpStart, bpEnd, bpPerPixel, this.visibilityWindow);
};


/**
 * The required height in pixels required for the track content.   This is not the visible track height, which
 * can be smaller (with a scrollbar) or larger.
 *
 * @param features
 * @returns {*}
 */
FeatureTrack.prototype.computePixelHeight = function (features) {

    if (this.type === "junctions") {
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

FeatureTrack.prototype.draw = function (options) {

    const featureList = options.features;
    const ctx = options.context;
    const bpPerPixel = options.bpPerPixel;
    const bpStart = options.bpStart;
    const pixelWidth = options.pixelWidth;
    const pixelHeight = options.pixelHeight;
    const bpEnd = bpStart + pixelWidth * bpPerPixel + 1;


    if ( !this.config.isMergedTrack ) {
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
            options.rowLastX[row] = -Number.MAX_VALUE;
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
            if (!last || pxEnd > last || this.config.type === 'junctions') {
                this.render.call(this, feature, bpStart, bpPerPixel, pixelHeight, ctx, options);

                if (this.config.type !== 'junctions') {
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

FeatureTrack.prototype.clickedFeatures = function (clickState) {

    const y = clickState.y - this.margin;
    const allFeatures = TrackBase.prototype.clickedFeatures.call(this, clickState);

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
FeatureTrack.prototype.popupData = function (clickState, features) {

    let self = this;

    if (!features) features = this.clickedFeatures(clickState);
    const genomicLocation = clickState.genomicLocation;

    const data = [];
    for (let feature of features) {

        const featureData = (typeof feature.popupData === "function") ? feature.popupData(genomicLocation) : TrackBase.extractPopupData(feature, this.getGenomeId());

        if (featureData) {
            if (data.length > 0) {
                data.push("<HR>");
            }
            Array.prototype.push.apply(data, featureData);
        }
    }

    return data;

};


FeatureTrack.prototype.menuItemList = function () {

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


FeatureTrack.prototype.description = function () {

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
FeatureTrack.prototype.dispose = function () {
    this.trackView = undefined;
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

    let color = this.color;  // default

    if (feature.alpha && feature.alpha !== 1) {
        color = IGVColor.addAlpha(this.color, feature.alpha);
    }

    if (this.config.colorBy) {
        const colorByValue = feature[this.config.colorBy.field];
        if (colorByValue) {
            color = this.config.colorBy.pallete[colorByValue];
        }
    } else if (feature.color) {
        color = feature.color;
    }
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
    const nLoci = browser.genomicStateList ? browser.genomicStateList.length : 1
    const windowX1 = windowX + options.viewportContainerWidth / nLoci;

    if (options.drawLabel) {
        renderFeatureLabel.call(this, ctx, feature, coord.px, coord.px1, py, windowX, windowX1, options.genomicState, options);
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
 * @param genomicState  genomic state
 * @param options  options
 */
function renderFeatureLabel(ctx, feature, featureX, featureX1, featureY, windowX, windowX1, genomicState, options) {

    if (feature.name === undefined) return;

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

    let geneColor;
    let gtexSelection = false;
    if (genomicState.selection && GtexUtils.gtexLoaded) {
        // TODO -- for gtex, figure out a better way to do this
        gtexSelection = true;
        geneColor = genomicState.selection.colorForGene(feature.name);
    }


    if (this.displayMode !== "SQUISHED") {
        const geneFontStyle = {
            textAlign: "SLANT" === this.labelDisplayMode ? undefined : 'center',
            fillStyle: geneColor || feature.color || this.color,
            strokeStyle: geneColor || feature.color || this.color
        };

        let transform;
        if (this.displayMode === "COLLAPSED" && this.labelDisplayMode === "SLANT") {
            transform = {rotate: {angle: 45}};
        }

        const labelX = boxX + ((boxX1 - boxX) / 2);
        const labelY = getFeatureLabelY(featureY, transform);

        const textBox = ctx.measureText(feature.name);
        const xleft = labelX - textBox.width / 2;
        const xright = labelX + textBox.width / 2;
        if (options.labelAllFeatures || xleft > options.rowLastX[feature.row] || gtexSelection) {

            options.rowLastX[feature.row] = xright;

            // This is for compatibility with JuiceboxJS.
            if (options.labelTransform) {
                ctx.save();
                options.labelTransform(ctx, labelX);
                IGVGraphics.fillText(ctx, feature.name, labelX, labelY, geneFontStyle, undefined);
                ctx.restore();

            } else {
                IGVGraphics.fillText(ctx, feature.name, labelX, labelY, geneFontStyle, transform);
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
    var uniquelyMappedReadCount = parseInt(feature.attributes.uniquely_mapped);
    if (uniquelyMappedReadCount < this.config.minUniquelyMappedReads) {
        return
    }
    var multiMappedReadCount = parseInt(feature.attributes.multi_mapped);
    var totalReadCount =  uniquelyMappedReadCount + multiMappedReadCount;
    if (totalReadCount < this.config.minTotalReads) {
        return
    }
    if (totalReadCount > 0 && multiMappedReadCount/totalReadCount > this.config.maxFractionMultiMappedReads) {
        return
    }
    var maximumSplicedAlignmentOverhang = parseInt(feature.attributes.maximum_spliced_alignment_overhang);
    if (maximumSplicedAlignmentOverhang < this.config.minSplicedAlignmentOverhang) {
        return
    }

    var py = this.margin;
    var rowHeight = this.height;

    var cy = py + 0.5 * rowHeight;
    var topY = py;
    var bottomY = py + rowHeight;
    var bezierBottomY = bottomY - 10;

    // draw the junction arc
    var junctionLeftPx = Math.round((feature.start - bpStart) / xScale);
    var junctionRightPx = Math.round((feature.end - bpStart) / xScale);
    var junctionMiddlePx = (junctionLeftPx + junctionRightPx)/2;
    var bezierControlLeftPx = (junctionLeftPx + junctionMiddlePx)/2;
    var bezierControlRightPx = (junctionMiddlePx + junctionRightPx)/2;

    var lineWidth;
    if (this.config.thicknessBasedOn === undefined || this.config.thicknessBasedOn === 'numUniqueReads') {
        lineWidth = uniquelyMappedReadCount;
    } else if (this.config.thicknessBasedOn === 'numReads') {
        lineWidth = totalReadCount;
    } else if (this.config.thicknessBasedOn === 'isAnnotatedJunction') {
        lineWidth = feature.attributes.annotated_junction === "true" ? 20 : 100;
    }
    lineWidth = 1 + Math.log(lineWidth + 1)/Math.log(12);

    var bounceHeight;
    if (this.config.bounceHeightBasedOn === undefined || this.config.bounceHeightBasedOn === 'random') {
        // randomly but deterministically stagger topY coordinates to reduce overlap
        bounceHeight = (feature.start + feature.end) % 7;
    } else if (this.config.bounceHeightBasedOn === 'distance') {
        bounceHeight = (feature.end - feature.start)/1000;
    } else if (this.config.bounceHeightBasedOn === 'thickness') {
        bounceHeight = 2*lineWidth;
    }
    topY += rowHeight * Math.max(7 - bounceHeight, 0) / 10;

    var color;
    if (this.config.colorBy === undefined || this.config.colorBy === 'numUniqueReads') {
        color = uniquelyMappedReadCount > this.config.colorByNumReadsThreshold ? 'blue' : '#AAAAAA';  // color gradient?
    } else if (this.config.colorBy === 'numReads') {
        color = totalReadCount > this.config.colorByNumReadsThreshold ? 'blue' : '#AAAAAA';
    } else if (this.config.colorBy === 'isAnnotatedJunction') {
        color = feature.attributes.annotated_junction === "true" ?  '#b0b0ec' : 'orange';
    } else if (this.config.colorBy === 'strand') {
        color = feature.strand === "+" ? '#b0b0ec' : '#ecb0b0';
    } else if (this.config.colorBy === 'motif') {
        color = JUNCTION_MOTIF_PALETTE.getColor(feature.attributes.motif);
    }

    var label = '';
    if (this.config.labelUniqueReadCount === undefined && this.config.labelMultiMappedReadCount === undefined && this.config.labelTotalReadCount === undefined) {
        //default label
        label += uniquelyMappedReadCount + (multiMappedReadCount == 0 ? '' : '(+' + multiMappedReadCount + ')');
    } else {
        if (this.config.labelTotalReadCount) {
            label += totalReadCount;
        } else if (this.config.labelUniqueReadCount) {
            label += uniquelyMappedReadCount;
        }
        if (this.config.labelMultiMappedReadCount && multiMappedReadCount > 0) {
            label += ' (+' + multiMappedReadCount + ')';
        }
    }

    if (this.config.labelAnnotatedJunction && feature.attributes.annotated_junction === "true" ) {
        label += this.config.labelAnnotatedJunction;
    }

    if (this.config.labelMotif && feature.attributes.motif) {
        label += ` ${feature.attributes.motif}`;
    }

    // data source: STAR splice junctions (eg. SJ.out.tab file converted to bed).
    // .bed "name" field used to store unique + multi-mapped read counts, so:
    // feature.score:  unique spanning read counts
    // feature.name:   unique + multi-mapped spanning read counts
    //example feature:  { chr: "chr17", start: 39662344, end: 39662803, name: "59", row: 0, score: 38, strand: "+"}

    ctx.beginPath();
    ctx.moveTo(junctionLeftPx, bezierBottomY);
    ctx.bezierCurveTo(bezierControlLeftPx, topY, bezierControlRightPx, topY, junctionRightPx, bezierBottomY);

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.stroke();

    ctx.fillText(label, junctionMiddlePx - ctx.measureText(label).width/2, (7*topY + cy)/8);
}

// SNP constants
const codingNonSynonSet = new Set(['nonsense', 'missense', 'stop-loss', 'frameshift', 'cds-indel']);
const codingSynonSet = new Set(['coding-synon']);
const spliceSiteSet = new Set(['splice-3', 'splice-5']);
const untranslatedSet = new Set(['untranslated-5', 'untranslated-3']);
const locusSet = new Set(['near-gene-3', 'near-gene-5']);
const intronSet = new Set(['intron']);

/**
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
