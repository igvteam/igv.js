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
import BamSource from "./bamSource.js";
import PairedAlignment from "./pairedAlignment.js";
import TrackBase from "../trackBase.js";
import IGVGraphics from "../igv-canvas.js";
import paintAxis from "../util/paintAxis.js";
import IGVColor from "../igv-color.js";
import {createCheckbox} from "../igv-icons.js";
import {numberFormatter} from "../util/stringUtils.js";
import {nucleotideColorComponents, nucleotideColors, PaletteColorTable} from "../util/colorPalletes.js";
import {extend} from "../util/igvUtils.js";
import {parseLocusString} from "../util/trackUtils.js";

const type = "alignment";

var alignmentStartGap = 5;
var downsampleRowHeight = 5;
var DEFAULT_COVERAGE_TRACK_HEIGHT = 50;
var DEFAULT_TRACK_HEIGHT = 300;
var DEFAULT_ALIGNMENT_COLOR = "rgb(185, 185, 185)";
var DEFAULT_COVERAGE_COLOR = "rgb(150, 150, 150)";
var DEFAULT_CONNECTOR_COLOR = "rgb(200, 200, 200)";


const BAMTrack = extend(TrackBase,
    function (config, browser) {

        this.type = type;

        // Override default track height for bams
        if (config.height === undefined) config.height = DEFAULT_TRACK_HEIGHT;

        TrackBase.call(this, config, browser);

        if (config.coverageTrackHeight === undefined) {
            config.coverageTrackHeight = DEFAULT_COVERAGE_TRACK_HEIGHT;
        }

        this.featureSource = new BamSource(config, browser);
        this.coverageTrack = new CoverageTrack(config, this);
        this.alignmentTrack = new AlignmentTrack(config, this);

        this.visibilityWindow = config.visibilityWindow || 30000;
        this.viewAsPairs = config.viewAsPairs;
        this.pairsSupported = (undefined === config.pairsSupported);
        this.showSoftClips = config.showSoftClips;
        this.showAllBases = config.showAllBases;
        this.color = config.color || DEFAULT_ALIGNMENT_COLOR;
        this.coverageColor = config.coverageColor || DEFAULT_COVERAGE_COLOR;
        this.minFragmentLength = config.minFragmentLength;   // Optional, might be undefined
        this.maxFragmentLength = config.maxFragmentLength;

        // Transient object, maintains the last sort option per viewport.
        this.sortObjects = {};

        if (config.sort) {
            if (Array.isArray(config.sort)) {
                for (let sort of config.sort) {
                    assignSort(this.sortObjects, sort);
                }
            } else {
                assignSort(this.sortObjects, config.sort);
            }
            config.sort = undefined;
        }

        // Assign sort objects to a genomic state
        function assignSort(currentSorts, sort) {

            const range = parseLocusString(sort.locus);

            // Loop through current genomic states, assign sort to first matching state
            for (let gs of browser.genomicStateList) {

                if (gs.chromosome.name === range.chr && range.start >= gs.start && range.start <= gs.end) {

                    currentSorts[gs.id] = {
                        chr: range.chr,
                        position: range.start,
                        sortOption: sort.option || "NUCLEOTIDE",
                        direction: sort.direction || "ASC"
                    }

                    break;
                }
            }

        }
    });

BAMTrack.prototype.getFeatures = async function (chr, bpStart, bpEnd, bpPerPixel, viewport) {

    const self = this;

    const alignmentContainer = await this.featureSource.getAlignments(chr, bpStart, bpEnd)

    if (alignmentContainer.alignments && alignmentContainer.alignments.length > 99) {
        if (undefined === self.minFragmentLength) {
            self.minFragmentLength = alignmentContainer.pairedEndStats.lowerFragmentLength;
        }
        if (undefined === self.maxFragmentLength) {
            self.maxFragmentLength = alignmentContainer.pairedEndStats.upperFragmentLength;
        }
    }

    const sort = self.sortObjects[viewport.genomicState.id];

    if (sort) {
        if (sort.chr === chr && sort.position >= bpStart && sort.position <= bpEnd) {

            self.alignmentTrack.sortAlignmentRows(sort, alignmentContainer);

        } else {
            delete self.sortObjects[viewport.genomicState.id];
        }
    }

    return alignmentContainer;


};

BAMTrack.filters = {

    noop: function () {
        return function (alignment) {
            return false;
        };
    },

    strand: function (strand) {
        return function (alignment) {
            return alignment.strand === strand;
        };
    },

    mappingQuality: function (lower, upper) {
        return function (alignment) {

            if (lower && alignment.mq < lower) {
                return true;
            }

            if (upper && alignment.mq > upper) {
                return true;
            }

            return false;
        }
    }
};


/**
 * Optional method to compute pixel height to accomodate the list of features.  The implementation below
 * has side effects (modifiying the samples hash).  This is unfortunate, but harmless.
 *
 * @param alignmentContainer
 * @returns {number}
 */
BAMTrack.prototype.computePixelHeight = function (alignmentContainer) {

    return this.coverageTrack.computePixelHeight(alignmentContainer) +
        this.alignmentTrack.computePixelHeight(alignmentContainer) +
        15;

};

BAMTrack.prototype.draw = function (options) {

    IGVGraphics.fillRect(options.context, 0, options.pixelTop, options.pixelWidth, options.pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

    if (this.coverageTrack.height > 0) {
        this.coverageTrack.draw(options);
    }

    this.alignmentTrack.draw(options);
};

BAMTrack.prototype.paintAxis = function (ctx, pixelWidth, pixelHeight) {

    if (this.browser.isMultiLocusMode()) {
        ctx.clearRect(0, 0, pixelWidth, pixelHeight);
    } else {
        this.coverageTrack.paintAxis(ctx, pixelWidth, this.coverageTrack.height);
    }
};

BAMTrack.prototype.contextMenuItemList = function (config) {

    return this.alignmentTrack.contextMenuItemList(config);

};

BAMTrack.prototype.popupData = function (config) {

    if (config.y >= this.coverageTrack.top && config.y < this.coverageTrack.height) {
        return this.coverageTrack.popupData(config);
    } else {
        return this.alignmentTrack.popupData(config);
    }

};

BAMTrack.prototype.menuItemList = function () {

    const self = this;

    const menuItems = [];

    const $e = $('<div class="igv-track-menu-category igv-track-menu-border-top">');
    $e.text('Color by');
    menuItems.push({name: undefined, object: $e, click: undefined, init: undefined});

    const colorByMenuItems = [{key: 'strand', label: 'read strand'}];
    if (self.alignmentTrack.hasPairs) {
        colorByMenuItems.push({key: 'firstOfPairStrand', label: 'first-of-pair strand'});
        colorByMenuItems.push({key: 'pairOrientation', label: 'pair orientation'});
        colorByMenuItems.push({key: 'fragmentLength', label: 'insert size (TLEN)'});
    }
    const tagLabel = 'tag' + (self.alignmentTrack.colorByTag ? ' (' + self.alignmentTrack.colorByTag + ')' : '');
    colorByMenuItems.push({key: 'tag', label: tagLabel});

    colorByMenuItems.forEach(function (item) {
        const selected = (self.alignmentTrack.colorBy === item.key);
        menuItems.push(colorByCB(item, selected));
    });

    menuItems.push({object: $('<div class="igv-track-menu-border-top">')});
    menuItems.push({
        object: createCheckbox("Show all bases", self.showAllBases),
        click: function () {

            const $fa = $(this).find('i');

            self.showAllBases = !self.showAllBases;

            if (true === self.showAllBases) {
                $fa.removeClass('igv-fa-check-hidden');
                $fa.addClass('igv-fa-check-visible');
            } else {
                $fa.removeClass('igv-fa-check-visible');
                $fa.addClass('igv-fa-check-hidden');
            }

            self.config.showAllBases = self.showAllBases;
            self.trackView.updateViews(true);
        }
    });

    menuItems.push({object: $('<div class="igv-track-menu-border-top">')});

    if (self.pairsSupported && self.alignmentTrack.hasPairs) {

        menuItems.push({
            object: createCheckbox("View as pairs", self.viewAsPairs),
            click: function () {

                const $fa = $(this).find('i');

                self.viewAsPairs = !self.viewAsPairs;

                if (true === self.viewAsPairs) {
                    $fa.removeClass('igv-fa-check-hidden');
                    $fa.addClass('igv-fa-check-visible');
                } else {
                    $fa.removeClass('igv-fa-check-visible');
                    $fa.addClass('igv-fa-check-hidden');
                }

                self.config.viewAsPairs = self.viewAsPairs;
                self.featureSource.setViewAsPairs(self.viewAsPairs);
                self.trackView.updateViews(true);
            }
        });
    }

    menuItems.push({
        object: createCheckbox("Show soft clips", self.showSoftClips),
        click: function () {

            const $fa = $(this).find('i');

            self.showSoftClips = !self.showSoftClips;

            if (true === self.showSoftClips) {
                $fa.removeClass('igv-fa-check-hidden');
                $fa.addClass('igv-fa-check-visible');
            } else {
                $fa.removeClass('igv-fa-check-visible');
                $fa.addClass('igv-fa-check-hidden');
            }

            self.config.showSoftClips = self.showSoftClips;
            self.featureSource.setShowSoftClips(self.showSoftClips);
            self.trackView.updateViews(true);
        }
    });

    return menuItems;

    function colorByCB(menuItem, showCheck) {


        const $e = createCheckbox(menuItem.label, showCheck);

        const clickHandler = function () {

            if (menuItem.key === self.alignmentTrack.colorBy) {

                self.alignmentTrack.colorBy = 'none';
                self.config.colorBy = 'none';
                self.trackView.repaintViews();

            } else if ('tag' === menuItem.key) {

                const clickFunction = function () {

                    self.alignmentTrack.colorBy = 'tag';
                    self.config.colorBy = 'tag';

                    const tag = self.browser.inputDialog.$input.val().trim();
                    if (tag !== self.alignmentTrack.colorByTag) {
                        self.alignmentTrack.colorByTag = tag;
                        self.config.colorByTag = tag;

                        self.alignmentTrack.tagColors = new PaletteColorTable("Set1");
                        $('#color-by-tag').text(self.alignmentTrack.colorByTag);
                    }

                    self.trackView.repaintViews();
                };

                const config =
                    {
                        label: 'Tag Name',
                        input: self.alignmentTrack.colorByTag ? self.alignmentTrack.colorByTag : '',
                        click: clickFunction
                    };

                self.browser.inputDialog.configure(config);
                self.browser.inputDialog.present($(self.trackView.trackDiv));

            } else {

                self.alignmentTrack.colorBy = menuItem.key;
                self.config.colorBy = menuItem.key;
                self.trackView.repaintViews();
            }

        };

        return {name: undefined, object: $e, click: clickHandler, init: undefined}

    }

};

function shadedBaseColor(qual, nucleotide) {

    const minQ = 5;   //prefs.getAsInt(PreferenceManager.SAM_BASE_QUALITY_MIN),
    const maxQ = 20;  //prefs.getAsInt(PreferenceManager.SAM_BASE_QUALITY_MAX);

    let alpha;
    if (qual < minQ) {
        alpha = 0.1;
    } else {
        alpha = Math.max(0.1, Math.min(1.0, 0.1 + 0.9 * (qual - minQ) / (maxQ - minQ)));
    }
    // Round alpha to nearest 0.1
    alpha = Math.round(alpha * 10) / 10.0;

    let baseColor;
    if (alpha >= 1) {
        baseColor = nucleotideColors[nucleotide];
    } else {
        const foregroundColor = nucleotideColorComponents[nucleotide];
        if (!foregroundColor) {
            return undefined;
        }

        const backgroundColor = [255, 255, 255];   // White
        baseColor = "rgba(" + foregroundColor[0] + "," + foregroundColor[1] + "," + foregroundColor[2] + "," + alpha + ")";
    }
    return baseColor;
}

/**
 * Called when the track is removed.  Do any needed cleanup here
 */
BAMTrack.prototype.dispose = function () {
    this.trackView = undefined;
}

/**
 * Return the current state of the track.  Used to create sessions and bookmarks.
 *
 * @returns {*|{}}
 */
BAMTrack.prototype.getState = function () {

    const config = Object.assign({}, this.config);

    config.sort = undefined;

    for (let gs of this.browser.genomicStateList) {

        const s = this.sortObjects[gs.id];

        if (s) {
            config.sort = config.sort || [];

            config.sort.push({
                locus: s.chr + ":" + (s.position + 1),
                option: s.sortOption,
                direction: s.direction
            });
        }
    }

    return config;
}

var CoverageTrack = function (config, parent) {

    this.parent = parent;
    this.featureSource = parent.featureSource;
    this.top = 0;


    this.height = config.coverageTrackHeight;
    this.dataRange = {min: 0};   // Leav max undefined
    this.paintAxis = paintAxis;
};

CoverageTrack.prototype.computePixelHeight = function (alignmentContainer) {
    return this.height;
};

CoverageTrack.prototype.draw = function (options) {

    const ctx = options.context;
    if (this.top) {
        ctx.translate(0, top);
    }
    const yTop = options.top || 0
    const yBottom = yTop + options.pixelHeight

    const alignmentContainer = options.features;
    const coverageMap = alignmentContainer.coverageMap;
    this.dataRange.max = coverageMap.maximum;

    let sequence;
    if (coverageMap.refSeq) {
        sequence = coverageMap.refSeq.toUpperCase();
    }

    const bpPerPixel = options.bpPerPixel;
    const bpStart = options.bpStart;
    const pixelWidth = options.pixelWidth;
    const bpEnd = bpStart + pixelWidth * bpPerPixel + 1;

    // paint for all coverage buckets
    // If alignment track color is != default, use it
    let color = this.parent.coverageColor;
    if (this.parent.color !== DEFAULT_ALIGNMENT_COLOR) {
        color = IGVColor.darkenLighten(this.parent.color, -35);
    }

    IGVGraphics.setProperties(ctx, {
        fillStyle: color,
        strokeStyle: color
    });

    const w = Math.max(1, Math.ceil(1.0 / bpPerPixel));
    for (let i = 0, len = coverageMap.coverage.length; i < len; i++) {

        const bp = (coverageMap.bpStart + i);
        if (bp < bpStart) continue;
        if (bp > bpEnd) break;

        const item = coverageMap.coverage[i];
        if (!item) continue;

        const h = Math.round((item.total / this.dataRange.max) * this.height);
        const y = this.height - h;
        const x = Math.floor((bp - bpStart) / bpPerPixel);


        // IGVGraphics.setProperties(ctx, {fillStyle: "rgba(0, 200, 0, 0.25)", strokeStyle: "rgba(0, 200, 0, 0.25)" });
        IGVGraphics.fillRect(ctx, x, y, w, h);
    }

    // coverage mismatch coloring -- don't try to do this in above loop, color bar will be overwritten when w<1
    if (sequence) {
        for (let i = 0, len = coverageMap.coverage.length; i < len; i++) {

            const bp = (coverageMap.bpStart + i);
            if (bp < bpStart) continue;
            if (bp > bpEnd) break;

            const item = coverageMap.coverage[i];
            if (!item) continue;

            const h = (item.total / this.dataRange.max) * this.height;
            let y = this.height - h;
            const x = Math.floor((bp - bpStart) / bpPerPixel);

            const refBase = sequence[i];
            if (item.isMismatch(refBase)) {

                IGVGraphics.setProperties(ctx, {fillStyle: nucleotideColors[refBase]});
                IGVGraphics.fillRect(ctx, x, y, w, h);

                let accumulatedHeight = 0.0;
                for (let nucleotide of ["A", "C", "T", "G"]) {

                    const count = item["pos" + nucleotide] + item["neg" + nucleotide];

                    // non-logoritmic
                    const hh = (count / this.dataRange.max) * this.height;
                    y = (this.height - hh) - accumulatedHeight;
                    accumulatedHeight += hh;

                    IGVGraphics.setProperties(ctx, {fillStyle: nucleotideColors[nucleotide]});
                    IGVGraphics.fillRect(ctx, x, y, w, hh);
                }
            }
        }
    }
}

CoverageTrack.prototype.popupData = function (config) {

    let features = config.viewport.getCachedFeatures();
    if (!features || features.length === 0) return;

    let genomicLocation = Math.floor(config.genomicLocation),
        referenceFrame = config.viewport.genomicState.referenceFrame,
        coverageMap = features.coverageMap,
        nameValues = [],
        coverageMapIndex = Math.floor(genomicLocation - coverageMap.bpStart),
        coverage = coverageMap.coverage[coverageMapIndex];

    if (coverage) {

        nameValues.push(referenceFrame.chrName + ":" + numberFormatter(1 + genomicLocation));

        nameValues.push({name: 'Total Count', value: coverage.total});

        // A
        let tmp = coverage.posA + coverage.negA;
        if (tmp > 0) tmp = tmp.toString() + " (" + Math.round((tmp / coverage.total) * 100.0) + "%, " + coverage.posA + "+, " + coverage.negA + "- )";
        nameValues.push({name: 'A', value: tmp});

        // C
        tmp = coverage.posC + coverage.negC;
        if (tmp > 0) tmp = tmp.toString() + " (" + Math.round((tmp / coverage.total) * 100.0) + "%, " + coverage.posC + "+, " + coverage.negC + "- )";
        nameValues.push({name: 'C', value: tmp});

        // G
        tmp = coverage.posG + coverage.negG;
        if (tmp > 0) tmp = tmp.toString() + " (" + Math.round((tmp / coverage.total) * 100.0) + "%, " + coverage.posG + "+, " + coverage.negG + "- )";
        nameValues.push({name: 'G', value: tmp});

        // T
        tmp = coverage.posT + coverage.negT;
        if (tmp > 0) tmp = tmp.toString() + " (" + Math.round((tmp / coverage.total) * 100.0) + "%, " + coverage.posT + "+, " + coverage.negT + "- )";
        nameValues.push({name: 'T', value: tmp});

        // N
        tmp = coverage.posN + coverage.negN;
        if (tmp > 0) tmp = tmp.toString() + " (" + Math.round((tmp / coverage.total) * 100.0) + "%, " + coverage.posN + "+, " + coverage.negN + "- )";
        nameValues.push({name: 'N', value: tmp});

        nameValues.push('<HR/>');
        nameValues.push({name: 'DEL', value: coverage.del.toString()});
        nameValues.push({name: 'INS', value: coverage.ins.toString()});
    }

    return nameValues;

};

var AlignmentTrack = function (config, parent) {

    this.parent = parent;
    this.browser = parent.browser;
    this.featureSource = parent.featureSource;
    this.top = config.coverageTrackHeight === 0 ? 0 : config.coverageTrackHeight + 5;
    this.alignmentRowHeight = config.alignmentRowHeight || 14;

    this.negStrandColor = config.negStrandColor || "rgba(150, 150, 230, 0.75)";
    this.posStrandColor = config.posStrandColor || "rgba(230, 150, 150, 0.75)";
    this.insertionColor = config.insertionColor || "rgb(138, 94, 161)";
    this.deletionColor = config.deletionColor || "black";
    this.skippedColor = config.skippedColor || "rgb(150, 170, 170)";
    this.pairConnectorColor = config.pairConnectorColor;

    this.smallFragmentLengthColor = config.smallFragmentLengthColor || "rgb(0, 0, 150)";
    this.largeFragmentLengthColor = config.largeFragmentLengthColor || "rgb(200, 0, 0)";

    this.pairOrientation = config.pairOrienation || 'fr';
    this.pairColors = {};
    this.pairColors["RL"] = config.rlColor || "rgb(0, 150, 0)";
    this.pairColors["RR"] = config.rrColor || "rgb(20, 50, 200)";
    this.pairColors["LL"] = config.llColor || "rgb(0, 150, 150)";

    this.colorBy = config.colorBy || "pairOrientation";
    this.colorByTag = config.colorByTag;
    this.bamColorTag = config.bamColorTag === undefined ? "YC" : config.bamColorTag;

    this.hasPairs = false;   // Until proven otherwise
};

AlignmentTrack.prototype.computePixelHeight = function (alignmentContainer) {

    if (alignmentContainer.packedAlignmentRows) {
        var h = 0;
        if (alignmentContainer.hasDownsampledIntervals()) {
            h += downsampleRowHeight + alignmentStartGap;
        }
        return h + (this.alignmentRowHeight * alignmentContainer.packedAlignmentRows.length) + 5;
    } else {
        return this.height;
    }

};

AlignmentTrack.prototype.draw = function (options) {

    const alignmentContainer = options.features
    const ctx = options.context
    const bpPerPixel = options.bpPerPixel
    const bpStart = options.bpStart
    const pixelWidth = options.pixelWidth
    const bpEnd = bpStart + pixelWidth * bpPerPixel + 1
    const packedAlignmentRows = alignmentContainer.packedAlignmentRows
    const showSoftClips = this.parent.showSoftClips;
    const showAllBases = this.parent.showAllBases;
    const yTop = options.top || 0
    const yBottom = yTop + options.pixelHeight

    let referenceSequence = alignmentContainer.sequence;
    if (referenceSequence) {
        referenceSequence = referenceSequence.toUpperCase();
    }

    let alignmentRowYInset = 0;

    ctx.save();
    if (this.top) ctx.translate(0, this.top);

    if (alignmentContainer.hasDownsampledIntervals()) {
        alignmentRowYInset = downsampleRowHeight + alignmentStartGap;

        alignmentContainer.downsampledIntervals.forEach(function (interval) {
            var xBlockStart = (interval.start - bpStart) / bpPerPixel,
                xBlockEnd = (interval.end - bpStart) / bpPerPixel;

            if (xBlockEnd - xBlockStart > 5) {
                xBlockStart += 1;
                xBlockEnd -= 1;
            }
            IGVGraphics.fillRect(ctx, xBlockStart, 2, (xBlockEnd - xBlockStart), downsampleRowHeight - 2, {fillStyle: "black"});
        })

    } else {
        alignmentRowYInset = 0;
    }

    // Transient variable -- rewritten on every draw, used for click object selection
    this.alignmentsYOffset = alignmentRowYInset;

    if (packedAlignmentRows) {

        const nRows = packedAlignmentRows.length;

        for (let rowIndex = 0; rowIndex < nRows; rowIndex++) {

            const alignmentRow = packedAlignmentRows[rowIndex];
            const alignmentY = alignmentRowYInset + (this.alignmentRowHeight * rowIndex);
            const alignmentHeight = this.alignmentRowHeight <= 4 ? this.alignmentRowHeight : this.alignmentRowHeight - 2;

            for (let alignment of alignmentRow.alignments) {

                this.hasPairs = this.hasPairs || alignment.isPaired();

                if ((alignment.start + alignment.lengthOnRef) < bpStart) continue;
                if (alignment.start > bpEnd) break;
                if (true === alignment.hidden) {
                    continue;
                }

                if (alignment instanceof PairedAlignment) {

                    drawPairConnector.call(this, alignment, alignmentY, alignmentHeight);

                    drawSingleAlignment.call(this, alignment.firstAlignment, alignmentY, alignmentHeight);

                    if (alignment.secondAlignment) {
                        drawSingleAlignment.call(this, alignment.secondAlignment, alignmentY, alignmentHeight);
                    }

                } else {
                    drawSingleAlignment.call(this, alignment, alignmentY, alignmentHeight);
                }

            }
        }
    }
    ctx.restore();

    // alignment is a PairedAlignment
    function drawPairConnector(alignment, yRect, alignmentHeight) {

        var connectorColor = this.getConnectorColor(alignment.firstAlignment),
            xBlockStart = (alignment.connectingStart - bpStart) / bpPerPixel,
            xBlockEnd = (alignment.connectingEnd - bpStart) / bpPerPixel,
            yStrokedLine = yRect + alignmentHeight / 2;

        if ((alignment.connectingEnd) < bpStart || alignment.connectingStart > bpEnd) {
            return;
        }
        if (alignment.mq <= 0) {
            connectorColor = IGVColor.addAlpha(connectorColor, 0.15);
        }
        IGVGraphics.setProperties(ctx, {fillStyle: connectorColor, strokeStyle: connectorColor});
        IGVGraphics.strokeLine(ctx, xBlockStart, yStrokedLine, xBlockEnd, yStrokedLine);

    }

    function drawSingleAlignment(alignment, yRect, alignmentHeight) {

        var alignmentColor,
            lastBlockEnd,
            blocks,
            block,
            b,
            diagnosticColor;

        alignmentColor = this.getAlignmentColor(alignment);
        const outlineColor = alignmentColor;

        blocks = showSoftClips ? alignment.blocks : alignment.blocks.filter(b => 'S' !== b.type);

        if ((alignment.start + alignment.lengthOnRef) < bpStart || alignment.start > bpEnd) {
            return;
        }

        if (alignment.mq <= 0) {
            alignmentColor = IGVColor.addAlpha(alignmentColor, 0.15);
        }

        IGVGraphics.setProperties(ctx, {fillStyle: alignmentColor, strokeStyle: outlineColor});

        for (b = 0; b < blocks.length; b++) {   // Can't use forEach here -- we need ability to break

            block = blocks[b];

            // Somewhat complex test, neccessary to insure gaps are drawn.
            // If this is not the last block, and the next block starts before the orign (off screen to left)
            // then skip.
            if ((b !== blocks.length - 1) && blocks[b + 1].start < bpStart) continue;

            drawBlock.call(this, block);

            if ((block.start + block.len) > bpEnd) break;  // Do this after drawBlock to insure gaps are drawn

            if (alignment.insertions) {
                for (let block of alignment.insertions) {
                    const refOffset = block.start - bpStart
                    const xBlockStart = refOffset / bpPerPixel - 1
                    const widthBlock = 3
                    IGVGraphics.fillRect(ctx, xBlockStart, yRect - 1, widthBlock, alignmentHeight + 2, {fillStyle: this.insertionColor});
                }
            }
        }

        function drawBlock(block) {


            const offsetBP = block.start - alignmentContainer.start;
            const blockStartPixel = (block.start - bpStart) / bpPerPixel;
            const blockEndPixel = ((block.start + block.len) - bpStart) / bpPerPixel;
            const blockWidthPixel = Math.max(1, blockEndPixel - blockStartPixel);
            const arrowHeadWidthPixel = this.alignmentRowHeight / 2.0;
            const yStrokedLine = yRect + alignmentHeight / 2;
            const isSoftClip = 'S' === block.type;

            const strokeOutline =
                alignment.mq <= 0 ||
                this.highlightedAlignmentReadNamed === alignment.readName ||
                isSoftClip;

            let blockOutlineColor = outlineColor;
            if (this.highlightedAlignmentReadNamed === alignment.readName) blockOutlineColor = 'red'
            else if (isSoftClip) blockOutlineColor = 'rgb(50,50,50)'

            if (block.gapType !== undefined && blockEndPixel !== undefined && lastBlockEnd !== undefined) {
                if ("D" === block.gapType) {
                    IGVGraphics.strokeLine(ctx, lastBlockEnd, yStrokedLine, blockStartPixel, yStrokedLine, {strokeStyle: this.deletionColor});
                } else if ("N" === block.gapType) {
                    IGVGraphics.strokeLine(ctx, lastBlockEnd, yStrokedLine, blockStartPixel, yStrokedLine, {strokeStyle: this.skippedColor});
                }
            }
            lastBlockEnd = blockEndPixel;

            const lastBlockPositiveStrand = (true === alignment.strand && b === blocks.length - 1);
            const lastBlockReverseStrand = (false === alignment.strand && b === 0);
            const lastBlock = lastBlockPositiveStrand | lastBlockReverseStrand;

            if (lastBlock) {
                let xListPixel;
                let yListPixel;
                if (lastBlockPositiveStrand) {
                    xListPixel = [
                        blockStartPixel,
                        blockEndPixel,
                        blockEndPixel + arrowHeadWidthPixel,
                        blockEndPixel,
                        blockStartPixel,
                        blockStartPixel];
                    yListPixel = [
                        yRect,
                        yRect,
                        yRect + (alignmentHeight / 2.0),
                        yRect + alignmentHeight,
                        yRect + alignmentHeight,
                        yRect];

                }

                // Last block on - strand ?
                else if (lastBlockReverseStrand) {
                    xListPixel = [
                        blockEndPixel,
                        blockStartPixel,
                        blockStartPixel - arrowHeadWidthPixel,
                        blockStartPixel,
                        blockEndPixel,
                        blockEndPixel];
                    yListPixel = [
                        yRect,
                        yRect,
                        yRect + (alignmentHeight / 2.0),
                        yRect + alignmentHeight,
                        yRect + alignmentHeight,
                        yRect];

                }
                IGVGraphics.fillPolygon(ctx, xListPixel, yListPixel, {fillStyle: alignmentColor});

                if (strokeOutline) {
                    IGVGraphics.strokePolygon(ctx, xListPixel, yListPixel, {strokeStyle: blockOutlineColor});
                }
            }

            // Internal block
            else {
                IGVGraphics.fillRect(ctx, blockStartPixel, yRect, blockWidthPixel, alignmentHeight, {fillStyle: alignmentColor});

                if (strokeOutline) {
                    ctx.save();
                    ctx.strokeStyle = blockOutlineColor;
                    ctx.strokeRect(blockStartPixel, yRect, blockWidthPixel, alignmentHeight);
                    ctx.restore();
                }
            }


            // Mismatch coloring

            if (isSoftClip || showAllBases || (referenceSequence && alignment.seq && alignment.seq !== "*")) {

                const seq = alignment.seq ? alignment.seq.toUpperCase() : undefined;
                const qual = alignment.qual;
                const seqOffset = block.seqOffset;


                for (let i = 0, len = block.len; i < len; i++) {

                    if (offsetBP + i < 0) continue;

                    let readChar = seq ? seq.charAt(seqOffset + i) : '';
                    const refChar = referenceSequence.charAt(offsetBP + i);

                    if (readChar === "=") {
                        readChar = refChar;
                    }
                    if (readChar === "X" || refChar !== readChar || isSoftClip || showAllBases) {

                        let baseColor;
                        if (!isSoftClip && qual !== undefined && qual.length > seqOffset + i) {
                            const readQual = qual[seqOffset + i];
                            baseColor = shadedBaseColor(readQual, readChar, i + block.start);
                        } else {
                            baseColor = nucleotideColors[readChar];
                        }
                        if (baseColor) {
                            const xPixel = ((block.start + i) - bpStart) / bpPerPixel;
                            const widthPixel = Math.max(1, 1 / bpPerPixel);
                            renderBlockOrReadChar(ctx, bpPerPixel, {
                                x: xPixel,
                                y: yRect,
                                width: widthPixel,
                                height: alignmentHeight
                            }, baseColor, readChar);
                        }
                    }
                }
            }
        }

        function renderBlockOrReadChar(context, bpp, bbox, color, char) {
            var threshold,
                center;

            threshold = 1.0 / 10.0;
            if (bpp <= threshold && bbox.height >= 8) {

                // render letter
                const fontHeight = Math.min(10, bbox.height)
                context.font = '' + fontHeight + 'px sans-serif';
                center = bbox.x + (bbox.width / 2.0);
                IGVGraphics.strokeText(context, char, center - (context.measureText(char).width / 2), fontHeight - 1 + bbox.y, {strokeStyle: color});
            } else {

                // render colored block
                IGVGraphics.fillRect(context, bbox.x, bbox.y, bbox.width, bbox.height, {fillStyle: color});
            }
        }
    }

};


AlignmentTrack.prototype.sortAlignmentRows = function (options, alignmentContainer) {

    const direction = options.direction
    if (alignmentContainer === null) {
        alignmentContainer = this.featureSource.alignmentContainer;
    }
    for (let row of alignmentContainer.packedAlignmentRows) {
        row.updateScore(options, alignmentContainer);
    }

    alignmentContainer.packedAlignmentRows.sort(function (rowA, rowB) {
        const i = rowA.score > rowB.score ? 1 : (rowA.score < rowB.score ? -1 : 0)
        return true === direction ? i : -i;
    });

};

AlignmentTrack.prototype.popupData = function (config) {

    const clickedObject = this.getClickedObject(config.viewport, config.y, config.genomicLocation);

    return clickedObject ? clickedObject.popupData(config.genomicLocation) : undefined;
};

AlignmentTrack.prototype.contextMenuItemList = function (clickState) {

    const self = this;
    const viewport = clickState.viewport;
    const genomicState = clickState.viewport.genomicState;
    const clickedObject = this.getClickedObject(clickState.viewport, clickState.y, clickState.genomicLocation);
    const isSingleAlignment = clickedObject && !clickedObject.paired && (typeof clickedObject.isPaired === 'function');
    const list = [];

    list.push('<b>Sort by...</b>')
    list.push({label: '&nbsp; base', click: () => sortByOption("NUCLEOTIDE")});
    list.push({label: '&nbsp; read strand', click: () => sortByOption("STRAND")});
    list.push({label: '&nbsp; insert size', click: () => sortByOption("INSERT_SIZE")});
    list.push({label: '&nbsp; chromosome of mate', click: () => sortByOption("MATE_CHR")});
    list.push({label: '&nbsp; mapping quality', click: () => sortByOption("MQ")});
    list.push({label: '&nbsp; tag', click: sortByTag});
    list.push('<hr/>');

    if (isSingleAlignment && clickedObject.isMateMapped()) {
        list.push({label: 'View mate in split screen', click: viewMateInSplitScreen, init: undefined});
    }
    list.push({label: 'View read sequence', click: viewReadSequence});
    list.push('<hr/>');
    return list;


    function sortByOption(option) {
        sortRows({
            chr: genomicState.referenceFrame.chrName,
            position: Math.floor(clickState.genomicLocation),
            sortOption: option
        })
    }
    function sortByTag() {
        const config =
            {
                label: 'Tag Name',
                input: self.sortByTag ? self.sortByTag : '',
                click: function () {
                    const tag = self.browser.inputDialog.$input.val().trim();
                    self.sortByTag = tag;
                    sortRows({
                        chr: genomicState.referenceFrame.chrName,
                        position: Math.floor(clickState.genomicLocation),
                        sortOption: "TAG",
                        tag: tag
                    })
                }
            };
        self.browser.inputDialog.configure(config);
        self.browser.inputDialog.present($(self.parent.trackView.trackDiv));
    }

    function sortRows(options) {

        if (!clickState.viewport.tile) {
            return;
        }

        const currentSorts = self.parent.sortObjects;
        const cs = currentSorts[viewport.genomicState.id];
        options.direction = cs ? !cs.direction : true;

        self.sortAlignmentRows(options, clickState.viewport.getCachedFeatures());
        self.parent.trackView.repaintViews();

        currentSorts[viewport.genomicState.id] = options;
    }

    function viewMateInSplitScreen() {
        if (clickedObject.mate) {
            self.highlightedAlignmentReadNamed = clickedObject.readName;
            self.browser.presentSplitScreenMultiLocusPanel(clickedObject, clickState.viewport.genomicState);
        }
    }

    function viewReadSequence() {
        const alignment = clickedObject;
        if (!alignment || !alignment.seq) return;
        const seqstring = alignment.seq; //.map(b => String.fromCharCode(b)).join("");
        self.browser.presentAlert(seqstring);
    }

};

AlignmentTrack.prototype.getClickedObject = function (viewport, y, genomicLocation) {

    const showSoftClips = this.parent.showSoftClips;

    let features = viewport.getCachedFeatures();
    if (!features || features.length === 0) return;

    let packedAlignmentRows = features.packedAlignmentRows;
    let downsampledIntervals = features.downsampledIntervals;
    let packedAlignmentsIndex = Math.floor((y - this.top - this.alignmentsYOffset) / this.alignmentRowHeight);

    if (packedAlignmentsIndex < 0) {
        for (let i = 0; i < downsampledIntervals.length; i++) {
            if (downsampledIntervals[i].start <= genomicLocation && (downsampledIntervals[i].end >= genomicLocation)) {
                return downsampledIntervals[i];
            }
        }
    } else if (packedAlignmentsIndex < packedAlignmentRows.length) {

        let alignmentRow = packedAlignmentRows[packedAlignmentsIndex];
        let clicked = alignmentRow.alignments.filter(function (alignment) {

            const s = showSoftClips ? alignment.scStart : alignment.start;
            const l = showSoftClips ? alignment.scLengthOnRef : alignment.lengthOnRef;

            return (genomicLocation >= s && genomicLocation <= (s + l));
        });

        if (clicked.length > 0) return clicked[0];
    }

    return undefined;

};

/**
 * Return the color for connectors in paired alignment view.   If explicitly set return that, otherwise return
 * the alignment color, unless the color option can result in split colors (separte color for each mate).
 *
 * @param alignment
 * @returns {string}
 */
AlignmentTrack.prototype.getConnectorColor = function (alignment) {

    if (this.pairConnectorColor) {
        return this.pairConnectorColor
    }

    switch (this.colorBy) {
        case "strand":
        case "firstOfPairStrand":
        case "pairOrientation":
        case "tag":
            return this.parent.color || DEFAULT_CONNECTOR_COLOR
        default:
            return this.getAlignmentColor(alignment)

    }
}

AlignmentTrack.prototype.getAlignmentColor = function (alignment) {

    const self = this;
    let color = self.parent.color;
    const option = self.colorBy;
    let tagValue;
    switch (option) {

        case "strand":
            color = alignment.strand ? self.posStrandColor : self.negStrandColor;
            break;

        case "firstOfPairStrand":

            if (alignment instanceof PairedAlignment) {
                color = alignment.firstOfPairStrand() ? self.posStrandColor : self.negStrandColor;
            } else if (alignment.isPaired()) {

                if (alignment.isFirstOfPair()) {
                    color = alignment.strand ? self.posStrandColor : self.negStrandColor;
                } else if (alignment.isSecondOfPair()) {
                    color = alignment.strand ? self.negStrandColor : self.posStrandColor;
                } else {
                    console.error("ERROR. Paired alignments are either first or second.")
                }
            }
            break;

        case "pairOrientation":

            if (alignment.mate && alignment.isMateMapped() && alignment.mate.chr !== alignment.chr) {
                color = getChrColor(alignment.mate.chr);
            } else if (self.pairOrientation && alignment.pairOrientation) {
                var oTypes = orientationTypes[self.pairOrientation];
                if (oTypes) {
                    var pairColor = self.pairColors[oTypes[alignment.pairOrientation]];
                    if (pairColor) color = pairColor;
                }
            }

            break;

        case "fragmentLength":

            if (alignment.mate && alignment.isMateMapped() && alignment.mate.chr !== alignment.chr) {
                color = getChrColor(alignment.mate.chr);
            } else if (self.parent.minFragmentLength && Math.abs(alignment.fragmentLength) < self.parent.minFragmentLength) {
                color = self.smallFragmentLengthColor;
            } else if (self.parent.maxFragmentLength && Math.abs(alignment.fragmentLength) > self.parent.maxFragmentLength) {
                color = self.largeFragmentLengthColor;
            }

            break;

        case "tag":
            tagValue = alignment.tags()[self.colorByTag];
            if (tagValue !== undefined) {
                if (self.bamColorTag === self.colorByTag) {
                    // UCSC style color option
                    color = "rgb(" + tagValue + ")";
                } else {

                    if (!self.tagColors) {
                        self.tagColors = new PaletteColorTable("Set1");
                    }
                    color = self.tagColors.getColor(tagValue);
                }
            }
            break;

        default:
            color = self.parent.color;
    }

    return color;

}

var orientationTypes = {

    "fr": {

        "F1R2": "LR",
        "F2R1": "LR",

        "F1F2": "LL",
        "F2F1": "LL",

        "R1R2": "RR",
        "R2R1": "RR",

        "R1F2": "RL",
        "R2F1": "RL"
    },

    "rf": {

        "R1F2": "LR",
        "R2F1": "LR",

        "R1R2": "LL",
        "R2R1": "LL",

        "F1F2": "RR",
        "F2F1": "RR",

        "F1R2": "RL",
        "F2R1": "RL"
    },

    "ff": {

        "F2F1": "LR",
        "R1R2": "LR",

        "F2R1": "LL",
        "R1F2": "LL",

        "R2F1": "RR",
        "F1R2": "RR",

        "R2R1": "RL",
        "F1F2": "RL"
    }
}

function getChrColor(chr) {
    if (chrColorMap[chr]) {
        return chrColorMap[chr];
    } else if (chrColorMap["chr" + chr]) {
        const color = chrColorMap["chr" + chr];
        chrColorMap[chr] = color;
        return color;
    } else {
        const color = IGVColor.randomRGB();
        chrColorMap[chr] = color;
        return color;
    }
}

const chrColorMap = {
    "chrX": "rgb(204, 153, 0)",
    "chrY": "rgb(153, 204, 0",
    "chrUn": "rgb(50, 50, 50)",
    "chr1": "rgb(80, 80, 255)",
    "chrI": "rgb(139, 155, 187)",
    "chr2": "rgb(206, 61, 50)",
    "chrII": "rgb(206, 61, 50)",
    "chr2a": "rgb(216, 71, 60)",
    "chr2b": "rgb(226, 81, 70)",
    "chr3": "rgb(116, 155, 88)",
    "chrIII": "rgb(116, 155, 88)",
    "chr4": "rgb(240, 230, 133)",
    "chrIV": "rgb(240, 230, 133)",
    "chr5": "rgb(70, 105, 131)",
    "chr6": "rgb(186, 99, 56)",
    "chr7": "rgb(93, 177, 221)",
    "chr8": "rgb(128, 34, 104)",
    "chr9": "rgb(107, 215, 107)",
    "chr10": "rgb(213, 149, 167)",
    "chr11": "rgb(146, 72, 34)",
    "chr12": "rgb(131, 123, 141)",
    "chr13": "rgb(199, 81, 39)",
    "chr14": "rgb(213, 143, 92)",
    "chr15": "rgb(122, 101, 165)",
    "chr16": "rgb(228, 175, 105)",
    "chr17": "rgb(59, 27, 83)",
    "chr18": "rgb(205, 222, 183)",
    "chr19": "rgb(97, 42, 121)",
    "chr20": "rgb(174, 31, 99)",
    "chr21": "rgb(231, 199, 111)",
    "chr22": "rgb(90, 101, 94)",
    "chr23": "rgb(204, 153, 0)",
    "chr24": "rgb(153, 204, 0)",
    "chr25": "rgb(51, 204, 0)",
    "chr26": "rgb(0, 204, 51)",
    "chr27": "rgb(0, 204, 153)",
    "chr28": "rgb(0, 153, 204)",
    "chr29": "rgb(10, 71, 255)",
    "chr30": "rgb(71, 117, 255)",
    "chr31": "rgb(255, 194, 10)",
    "chr32": "rgb(255, 209, 71)",
    "chr33": "rgb(153, 0, 51)",
    "chr34": "rgb(153, 26, 0)",
    "chr35": "rgb(153, 102, 0)",
    "chr36": "rgb(128, 153, 0)",
    "chr37": "rgb(51, 153, 0)",
    "chr38": "rgb(0, 153, 26)",
    "chr39": "rgb(0, 153, 102)",
    "chr40": "rgb(0, 128, 153)",
    "chr41": "rgb(0, 51, 153)",
    "chr42": "rgb(26, 0, 153)",
    "chr43": "rgb(102, 0, 153)",
    "chr44": "rgb(153, 0, 128)",
    "chr45": "rgb(214, 0, 71)",
    "chr46": "rgb(255, 20, 99)",
    "chr47": "rgb(0, 214, 143)",
    "chr48": "rgb(20, 255, 177)",
}

export default BAMTrack;