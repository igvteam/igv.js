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


var igv = (function (igv) {

    var alignmentStartGap = 5;
    var downsampleRowHeight = 5;
    var DEFAULT_COVERAGE_TRACK_HEIGHT = 50;
    var DEFAULT_TRACK_HEIGHT = 300;
    var DEFAULT_ALIGNMENT_COLOR = "rgb(185, 185, 185)";
    var DEFAULT_COVERAGE_COLOR = "rgb(150, 150, 150)"

    igv.BAMTrack = function (config) {

        this.featureSource = new igv.BamSource(config);

        // Override default track height for bams
        if (config.height === undefined) config.height = DEFAULT_TRACK_HEIGHT;

        igv.configTrack(this, config);

        if (config.coverageTrackHeight === undefined) {
            config.coverageTrackHeight = DEFAULT_COVERAGE_TRACK_HEIGHT;
        }

        this.coverageTrack = new CoverageTrack(config, this);

        this.alignmentTrack = new AlignmentTrack(config, this);

        this.visibilityWindow = config.visibilityWindow || 30000;     // 30kb default

        this.viewAsPairs = config.viewAsPairs;

        this.pairsSupported = (undefined === config.pairsSupported);

        this.color = config.color || DEFAULT_ALIGNMENT_COLOR;
        this.coverageColor = config.coverageColor || DEFAULT_COVERAGE_COLOR;

        // sort alignment rows
        this.sortOption = config.sortOption || {sort: "NUCLEOTIDE"};

        // filter alignments
        this.filterOption = config.filterOption || {name: "mappingQuality", params: [30, undefined]};

        this.minFragmentLength = config.minFragmentLength;   // Optional, might be undefined
        this.maxFragmentLength = config.maxFragmentLength;

    };

    igv.BAMTrack.prototype.getFeatures = function (chr, bpStart, bpEnd) {
        var self = this;
        return this.featureSource.getAlignments(chr, bpStart, bpEnd)

            .then(function (alignmentContainer) {

                if (alignmentContainer.alignments && alignmentContainer.alignments.length > 99) {
                    if (undefined === self.minFragmentLength) {
                        self.minFragmentLength = alignmentContainer.pairedEndStats.lowerFragmentLength;
                    }
                    if (undefined === self.maxFragmentLength) {
                        self.maxFragmentLength = alignmentContainer.pairedEndStats.upperFragmentLength;
                    }
                }
                return alignmentContainer;

            });
    };

    igv.BAMTrack.filters = {

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
    igv.BAMTrack.prototype.computePixelHeight = function (alignmentContainer) {

        return this.coverageTrack.computePixelHeight(alignmentContainer) +
            this.alignmentTrack.computePixelHeight(alignmentContainer) +
            15;

    };

    igv.BAMTrack.prototype.draw = function (options) {

        igv.graphics.fillRect(options.context, 0, 0, options.pixelWidth, options.pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

        if (this.coverageTrack.height > 0) {
            this.coverageTrack.draw(options);
        }

        this.alignmentTrack.draw(options);
    };

    igv.BAMTrack.prototype.paintAxis = function (ctx, pixelWidth, pixelHeight) {

        if (igv.browser.isMultiLocus()) {
            ctx.clearRect(0, 0, pixelWidth, pixelHeight);
        }
        else {
            this.coverageTrack.paintAxis(ctx, pixelWidth, this.coverageTrack.height);
        }
    };

    igv.BAMTrack.prototype.contextMenuItemList = function (config) {

        return this.alignmentTrack.contextMenuItemList(config);

    };

    igv.BAMTrack.prototype.popupData = function (config) {

        if (config.y >= this.coverageTrack.top && config.y < this.coverageTrack.height) {
            return this.coverageTrack.popupData(config);
        } else {
            return this.alignmentTrack.popupData(config);
        }

    };

    igv.BAMTrack.prototype.menuItemList = function () {

        var self = this,
            $e,
            html,
            menuItems = [],
            colorByMenuItems = [],
            tagLabel,
            selected;

        // sort by @ center line
        //menuItems.push(sortMenuItem());

        colorByMenuItems.push({key: 'strand', label: 'read strand'});

        if (self.alignmentTrack.hasPairs) {
            colorByMenuItems.push({key: 'firstOfPairStrand', label: 'first-of-pair strand'});
            colorByMenuItems.push({key: 'pairOrientation', label: 'pair orientation'});
            colorByMenuItems.push({key: 'fragmentLength', label: 'fragment length'});
        }

        tagLabel = 'tag' + (self.alignmentTrack.colorByTag ? ' (' + self.alignmentTrack.colorByTag + ')' : '');
        colorByMenuItems.push({key: 'tag', label: tagLabel});

        $e = $('<div class="igv-track-menu-category igv-track-menu-border-top">');
        $e.text('Color by');
        menuItems.push({name: undefined, object: $e, click: undefined, init: undefined});

        colorByMenuItems.forEach(function (item) {
            selected = (self.alignmentTrack.colorBy === item.key);
            menuItems.push(colorByCB(item, selected));
        });

        if (self.pairsSupported && self.alignmentTrack.hasPairs) {

            menuItems.push({object: $('<div class="igv-track-menu-border-top">')});

            menuItems.push({
                object: igv.createCheckbox("View as pairs", self.viewAsPairs),
                click: function () {
                    var $fa = $(this).find('i');

                    self.viewAsPairs = !self.viewAsPairs;

                    if (true === self.viewAsPairs) {
                        $fa.removeClass('igv-fa-check-hidden');
                    } else {
                        $fa.addClass('igv-fa-check-hidden');
                    }

                    self.featureSource.setViewAsPairs(self.viewAsPairs);
                    self.trackView.updateViews(true);
                }
            });
        }

        return menuItems;

        function colorByCB(menuItem, showCheck) {

            var $e,
                clickHandler;

            $e = igv.createCheckbox(menuItem.label, showCheck);

            clickHandler = function () {
                var config,
                    clickFunction;

                if (menuItem.key === self.alignmentTrack.colorBy) {
                    self.alignmentTrack.colorBy = 'none';
                    self.trackView.repaint(true);
                } else if ('tag' === menuItem.key) {

                    clickFunction = function () {
                        var tag;

                        self.alignmentTrack.colorBy = 'tag';

                        tag = igv.inputDialog.$input.val().trim();
                        if (tag !== self.alignmentTrack.colorByTag) {
                            self.alignmentTrack.colorByTag = tag;
                            self.alignmentTrack.tagColors = new igv.PaletteColorTable("Set1");
                            $('#color-by-tag').text(self.alignmentTrack.colorByTag);
                        }

                        self.trackView.repaintViews();
                    };

                    config =
                    {
                        label: 'Tag Name',
                        input: self.alignmentTrack.colorByTag ? self.alignmentTrack.colorByTag : '',
                        click: clickFunction
                    };

                    igv.inputDialog.configure(config);
                    igv.inputDialog.present($(self.trackView.trackDiv));

                } else {
                    self.alignmentTrack.colorBy = menuItem.key;
                    self.trackView.repaintViews();
                }

            };

            return {name: undefined, object: $e, click: clickHandler, init: undefined}

        }

        function sortMenuItem() {

            var $e,
                clickHandler;

            $e = $('<div>');
            $e.text('Sort by base');

            clickHandler = function () {
                var genomicState = igv.browser.genomicStateList[0],
                    referenceFrame = genomicState.referenceFrame,
                    genomicLocation,
                    viewportHalfWidth;

                viewportHalfWidth = Math.floor(0.5 * (igv.browser.viewportContainerWidth() / igv.browser.genomicStateList.length));
                genomicLocation = Math.floor((referenceFrame.start) + referenceFrame.toBP(viewportHalfWidth));

                self.sortOption = {sort: "NUCLEOTIDE"};
                self.alignmentTrack.sortAlignmentRows(genomicLocation, sortOption);

                if ("show center guide" === igv.browser.centerGuide.$centerGuideToggle.text()) {
                    igv.browser.centerGuide.$centerGuideToggle.trigger("click");
                }

            };

            return {name: undefined, object: $e, click: clickHandler, init: undefined}
        }

    };

    function shadedBaseColor(qual, nucleotide, genomicLocation) {

        var baseColor,
            alpha,
            minQ = 5,   //prefs.getAsInt(PreferenceManager.SAM_BASE_QUALITY_MIN),
            maxQ = 20,  //prefs.getAsInt(PreferenceManager.SAM_BASE_QUALITY_MAX);
            foregroundColor = igv.nucleotideColorComponents[nucleotide],
            backgroundColor = [255, 255, 255];   // White


        //if (171167156 === genomicLocation) {
        //    // NOTE: Add 1 when presenting genomic location
        //    console.log("shadedBaseColor - locus " + igv.numberFormatter(1 + genomicLocation) + " qual " + qual);
        //}

        if (!foregroundColor) return;

        if (qual < minQ) {
            alpha = 0.1;
        } else {
            alpha = Math.max(0.1, Math.min(1.0, 0.1 + 0.9 * (qual - minQ) / (maxQ - minQ)));
        }
        // Round alpha to nearest 0.1
        alpha = Math.round(alpha * 10) / 10.0;

        if (alpha >= 1) {
            baseColor = igv.nucleotideColors[nucleotide];
        }
        else {
            baseColor = "rgba(" + foregroundColor[0] + "," + foregroundColor[1] + "," + foregroundColor[2] + "," + alpha + ")";    //igv.getCompositeColor(backgroundColor, foregroundColor, alpha);
        }
        return baseColor;
    }

    /**
     * Called when the track is removed.  Do any needed cleanup here
     */
    igv.BAMTrack.prototype.dispose = function () {
        this.trackView = undefined;
    }

    CoverageTrack = function (config, parent) {

        this.parent = parent;
        this.featureSource = parent.featureSource;
        this.top = 0;


        this.height = config.coverageTrackHeight;
        this.dataRange = {min: 0};   // Leav max undefined
        this.paintAxis = igv.paintAxis;
    };

    CoverageTrack.prototype.computePixelHeight = function (alignmentContainer) {
        return this.height;
    };

    CoverageTrack.prototype.draw = function (options) {

        var self = this,
            alignmentContainer = options.features,
            ctx = options.context,
            bpPerPixel = options.bpPerPixel,
            bpStart = options.bpStart,
            pixelWidth = options.pixelWidth,
            pixelHeight = options.pixelHeight,
            bpEnd = bpStart + pixelWidth * bpPerPixel + 1,
            coverageMap = alignmentContainer.coverageMap,
            bp,
            x,
            y,
            w,
            h,
            refBase,
            i,
            len,
            item,
            accumulatedHeight,
            sequence;


        if (this.top) ctx.translate(0, top);

        if (coverageMap.refSeq) sequence = coverageMap.refSeq.toUpperCase();

        this.dataRange.max = coverageMap.maximum;

        // paint backdrop color for all coverage buckets
        w = Math.max(1, Math.ceil(1.0 / bpPerPixel));
        for (i = 0, len = coverageMap.coverage.length; i < len; i++) {

            bp = (coverageMap.bpStart + i);
            if (bp < bpStart) continue;
            if (bp > bpEnd) break;

            item = coverageMap.coverage[i];
            if (!item) continue;

            h = Math.round((item.total / this.dataRange.max) * this.height);
            y = this.height - h;
            x = Math.floor((bp - bpStart) / bpPerPixel);


            igv.graphics.setProperties(ctx, {
                fillStyle: this.parent.coverageColor,
                strokeStyle: this.parent.coverageColor
            });
            // igv.graphics.setProperties(ctx, {fillStyle: "rgba(0, 200, 0, 0.25)", strokeStyle: "rgba(0, 200, 0, 0.25)" });
            igv.graphics.fillRect(ctx, x, y, w, h);
        }

        // coverage mismatch coloring -- don't try to do this in above loop, color bar will be overwritten when w<1
        if (sequence) {
            for (i = 0, len = coverageMap.coverage.length; i < len; i++) {

                bp = (coverageMap.bpStart + i);
                if (bp < bpStart) continue;
                if (bp > bpEnd) break;

                item = coverageMap.coverage[i];
                if (!item) continue;

                h = (item.total / this.dataRange.max) * this.height;
                y = this.height - h;
                x = Math.floor((bp - bpStart) / bpPerPixel);

                refBase = sequence[i];
                if (item.isMismatch(refBase)) {

                    igv.graphics.setProperties(ctx, {fillStyle: igv.nucleotideColors[refBase]});
                    igv.graphics.fillRect(ctx, x, y, w, h);

                    accumulatedHeight = 0.0;
                    ["A", "C", "T", "G"].forEach(function (nucleotide) {

                        var count,
                            hh;

                        count = item["pos" + nucleotide] + item["neg" + nucleotide];


                        // non-logoritmic
                        hh = (count / self.dataRange.max) * self.height;

                        y = (self.height - hh) - accumulatedHeight;
                        accumulatedHeight += hh;

                        igv.graphics.setProperties(ctx, {fillStyle: igv.nucleotideColors[nucleotide]});
                        igv.graphics.fillRect(ctx, x, y, w, hh);
                    });
                }
            }
        }

    };

    CoverageTrack.prototype.popupData = function (config) {

        var genomicLocation = config.genomicLocation,
            xOffset = config.x,
            yOffset = config.y,
            referenceFrame = config.viewport.genomicState.referenceFrame,
            coverageMap = config.viewport.tile.features.coverageMap,
            coverageMapIndex,
            coverage,
            nameValues = [],
            tmp;


        coverageMapIndex = genomicLocation - coverageMap.bpStart;
        coverage = coverageMap.coverage[coverageMapIndex];

        if (coverage) {


            nameValues.push(referenceFrame.chrName + ":" + igv.numberFormatter(1 + genomicLocation));

            nameValues.push({name: 'Total Count', value: coverage.total});

            // A
            tmp = coverage.posA + coverage.negA;
            if (tmp > 0)  tmp = tmp.toString() + " (" + Math.floor((tmp / coverage.total) * 100.0) + "%, " + coverage.posA + "+, " + coverage.negA + "- )";
            nameValues.push({name: 'A', value: tmp});


            // C
            tmp = coverage.posC + coverage.negC;
            if (tmp > 0)  tmp = tmp.toString() + " (" + Math.floor((tmp / coverage.total) * 100.0) + "%, " + coverage.posC + "+, " + coverage.negC + "- )";
            nameValues.push({name: 'C', value: tmp});

            // G
            tmp = coverage.posG + coverage.negG;
            if (tmp > 0)  tmp = tmp.toString() + " (" + Math.floor((tmp / coverage.total) * 100.0) + "%, " + coverage.posG + "+, " + coverage.negG + "- )";
            nameValues.push({name: 'G', value: tmp});

            // T
            tmp = coverage.posT + coverage.negT;
            if (tmp > 0)  tmp = tmp.toString() + " (" + Math.floor((tmp / coverage.total) * 100.0) + "%, " + coverage.posT + "+, " + coverage.negT + "- )";
            nameValues.push({name: 'T', value: tmp});

            // N
            tmp = coverage.posN + coverage.negN;
            if (tmp > 0)  tmp = tmp.toString() + " (" + Math.floor((tmp / coverage.total) * 100.0) + "%, " + coverage.posN + "+, " + coverage.negN + "- )";
            nameValues.push({name: 'N', value: tmp});

        }


        return nameValues;

    };

    AlignmentTrack = function (config, parent) {

        this.parent = parent;
        this.featureSource = parent.featureSource;
        this.top = config.coverageTrackHeight == 0 ? 0 : config.coverageTrackHeight + 5;
        this.alignmentRowHeight = config.alignmentRowHeight || 14;

        this.negStrandColor = config.negStrandColor || "rgba(150, 150, 230, 0.75)";
        this.posStrandColor = config.posStrandColor || "rgba(230, 150, 150, 0.75)";
        this.insertionColor = config.insertionColor || "rgb(138, 94, 161)";
        this.deletionColor = config.deletionColor || "black";
        this.skippedColor = config.skippedColor || "rgb(150, 170, 170)";

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

        // sort alignment rows
        this.sortOption = config.sortOption || {sort: "NUCLEOTIDE"};

        this.sortDirection = true;

        this.hasPairs = false;   // Until proven otherwise

    };

    AlignmentTrack.prototype.computePixelHeight = function (alignmentContainer) {

        if (alignmentContainer.packedAlignmentRows) {
            var h = 0;
            if (alignmentContainer.hasDownsampledIntervals()) {
                h += downsampleRowHeight + alignmentStartGap;
            }
            return h + (this.alignmentRowHeight * alignmentContainer.packedAlignmentRows.length) + 5;
        }
        else {
            return this.height;
        }

    };

    AlignmentTrack.prototype.draw = function (options) {

        var self = this,
            alignmentContainer = options.features,
            ctx = options.context,
            bpPerPixel = options.bpPerPixel,
            bpStart = options.bpStart,
            pixelWidth = options.pixelWidth,
            pixelHeight = options.pixelHeight,
            bpEnd = bpStart + pixelWidth * bpPerPixel + 1,
            packedAlignmentRows = alignmentContainer.packedAlignmentRows,
            sequence = alignmentContainer.sequence;

        var alignmentRowYInset = 0;


        if (this.top) ctx.translate(0, this.top);

        if (sequence) {
            sequence = sequence.toUpperCase();
        }

        if (alignmentContainer.hasDownsampledIntervals()) {
            alignmentRowYInset = downsampleRowHeight + alignmentStartGap;

            alignmentContainer.downsampledIntervals.forEach(function (interval) {
                var xBlockStart = (interval.start - bpStart) / bpPerPixel,
                    xBlockEnd = (interval.end - bpStart) / bpPerPixel;

                if (xBlockEnd - xBlockStart > 5) {
                    xBlockStart += 1;
                    xBlockEnd -= 1;
                }
                igv.graphics.fillRect(ctx, xBlockStart, 2, (xBlockEnd - xBlockStart), downsampleRowHeight - 2, {fillStyle: "black"});
            })

        }
        else {
            alignmentRowYInset = 0;
        }

        // Transient variable -- rewritten on every draw, used for click object selection
        this.alignmentsYOffset = alignmentRowYInset;

        if (packedAlignmentRows) {

            packedAlignmentRows.forEach(function renderAlignmentRow(alignmentRow, rowIndex) {

                var yRect,
                    alignmentHeight,
                    i,
                    b,
                    alignment;

                yRect = alignmentRowYInset + (self.alignmentRowHeight * rowIndex);
                alignmentHeight = self.alignmentRowHeight - 2;
                for (i = 0; i < alignmentRow.alignments.length; i++) {

                    alignment = alignmentRow.alignments[i];

                    self.hasPairs = self.hasPairs || alignment.isPaired();

                    if ((alignment.start + alignment.lengthOnRef) < bpStart) continue;
                    if (alignment.start > bpEnd) break;


                    if (true === alignment.hidden) {
                        continue;
                    }

                    if (alignment instanceof igv.PairedAlignment) {

                        drawPairConnector(alignment, yRect, alignmentHeight);

                        drawSingleAlignment(alignment.firstAlignment, yRect, alignmentHeight);

                        if (alignment.secondAlignment) {
                            drawSingleAlignment(alignment.secondAlignment, yRect, alignmentHeight);
                        }

                    }
                    else {
                        drawSingleAlignment(alignment, yRect, alignmentHeight);
                    }

                }
            });
        }


        // alignment is a PairedAlignment
        function drawPairConnector(alignment, yRect, alignmentHeight) {

            var alignmentColor = getAlignmentColor.call(self, alignment.firstAlignment),
                xBlockStart = (alignment.connectingStart - bpStart) / bpPerPixel,
                xBlockEnd = (alignment.connectingEnd - bpStart) / bpPerPixel,
                yStrokedLine = yRect + alignmentHeight / 2;

            if ((alignment.connectingEnd) < bpStart || alignment.connectingStart > bpEnd) {
                return;
            }

            if (alignment.mq <= 0) {
                alignmentColor = igv.Color.addAlpha(alignmentColor, "0.15");
            }

            igv.graphics.setProperties(ctx, {fillStyle: alignmentColor, strokeStyle: alignmentColor});

            igv.graphics.strokeLine(ctx, xBlockStart, yStrokedLine, xBlockEnd, yStrokedLine);

        }

        function drawSingleAlignment(alignment, yRect, alignmentHeight) {

            var alignmentColor,
                outlineColor,
                lastBlockEnd,
                blocks,
                block,
                b,
                diagnosticColor;

            alignmentColor = getAlignmentColor.call(self, alignment);
            outlineColor = 'alignmentColor';
            blocks = alignment.blocks;

            if ((alignment.start + alignment.lengthOnRef) < bpStart || alignment.start > bpEnd) {
                return;
            }

            if (alignment.mq <= 0) {
                alignmentColor = igv.Color.addAlpha(alignmentColor, "0.15");
            }

            igv.graphics.setProperties(ctx, {fillStyle: alignmentColor, strokeStyle: outlineColor});

            diagnosticColor = 'rgb(255,105,180)';
            for (b = 0; b < blocks.length; b++) {   // Can't use forEach here -- we need ability to break

                block = blocks[b];

                if ((block.start + block.len) < bpStart) continue;

                drawBlock(block);

                if ((block.start + block.len) > bpEnd) break;  // Do this after drawBlock to insure gaps are drawn


                if (alignment.insertions) {
                    alignment.insertions.forEach(function (block) {
                        var refOffset = block.start - bpStart,
                            xBlockStart = refOffset / bpPerPixel - 1,
                            widthBlock = 3;
                        igv.graphics.fillRect(ctx, xBlockStart, yRect - 1, widthBlock, alignmentHeight + 2, {fillStyle: self.insertionColor});
                    });
                }

            }

            function drawBlock(block) {

                var offsetBP,
                    blockStartPixel,
                    blockEndPixel,
                    blockWidthPixel,
                    arrowHeadWidthPixel,
                    blockSequence,
                    refChar,
                    readChar,
                    readQual,
                    xPixel,
                    widthPixel,
                    baseColor,
                    xListPixel,
                    yListPixel,
                    yStrokedLine;

                offsetBP = block.start - alignmentContainer.start;
                blockStartPixel = (block.start - bpStart) / bpPerPixel;
                blockEndPixel = ((block.start + block.len) - bpStart) / bpPerPixel;
                blockWidthPixel = Math.max(1, blockEndPixel - blockStartPixel);
                arrowHeadWidthPixel = self.alignmentRowHeight / 2.0;
                blockSequence = block.seq.toUpperCase();
                yStrokedLine = yRect + alignmentHeight / 2;

                if (block.gapType !== undefined && blockEndPixel !== undefined && lastBlockEnd !== undefined) {
                    if ("D" === block.gapType) {
                        igv.graphics.strokeLine(ctx, lastBlockEnd, yStrokedLine, blockStartPixel, yStrokedLine, {strokeStyle: self.deletionColor});
                    }
                    else {
                        igv.graphics.strokeLine(ctx, lastBlockEnd, yStrokedLine, blockStartPixel, yStrokedLine, {strokeStyle: self.skippedColor});
                    }
                }
                lastBlockEnd = blockEndPixel;

                if (true === alignment.strand && b === blocks.length - 1) {
                    // Last block on + strand
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

                    igv.graphics.fillPolygon(ctx, xListPixel, yListPixel, {fillStyle: alignmentColor});

                    if (self.highlightedAlignmentReadNamed === alignment.readName) {
                        igv.graphics.strokePolygon(ctx, xListPixel, yListPixel, {strokeStyle: 'red'});
                    }

                    if (alignment.mq <= 0) {
                        igv.graphics.strokePolygon(ctx, xListPixel, yListPixel, {strokeStyle: outlineColor});
                    }
                }
                else if (false === alignment.strand && b === 0) {
                    // First block on - strand
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

                    igv.graphics.fillPolygon(ctx, xListPixel, yListPixel, {fillStyle: alignmentColor});

                    if (self.highlightedAlignmentReadNamed === alignment.readName) {
                        igv.graphics.strokePolygon(ctx, xListPixel, yListPixel, {strokeStyle: 'red'});
                    }

                    if (alignment.mq <= 0) {
                        igv.graphics.strokePolygon(ctx, xListPixel, yListPixel, {strokeStyle: outlineColor});
                    }
                }
                else {
                    igv.graphics.fillRect(ctx, blockStartPixel, yRect, blockWidthPixel, alignmentHeight, {fillStyle: alignmentColor});

                    if (alignment.mq <= 0) {
                        ctx.save();
                        ctx.strokeStyle = outlineColor;
                        ctx.strokeRect(blockStartPixel, yRect, blockWidthPixel, alignmentHeight);
                        ctx.restore();
                    }
                }
                // Only do mismatch coloring if a refseq exists to do the comparison
                if (sequence && blockSequence !== "*") {
                    for (var i = 0, len = blockSequence.length; i < len; i++) {

                        if (offsetBP + i < 0) continue;

                        readChar = blockSequence.charAt(i);
                        refChar = sequence.charAt(offsetBP + i);
                        if (readChar === "=") {
                            readChar = refChar;
                        }
                        if (readChar === "X" || refChar !== readChar) {
                            if (block.qual && block.qual.length > i) {
                                readQual = block.qual[i];
                                baseColor = shadedBaseColor(readQual, readChar, i + block.start);
                            }
                            else {
                                baseColor = igv.nucleotideColors[readChar];
                            }
                            if (baseColor) {
                                xPixel = ((block.start + i) - bpStart) / bpPerPixel;
                                widthPixel = Math.max(1, 1 / bpPerPixel);
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
                if (bpp <= threshold) {

                    // render letter
                    context.font = '10px sans-serif';
                    center = bbox.x + (bbox.width / 2.0);
                    igv.graphics.strokeText(context, char, center - (context.measureText(char).width / 2), 9 + bbox.y, {strokeStyle: color});
                } else {

                    // render colored block
                    igv.graphics.fillRect(context, bbox.x, bbox.y, bbox.width, bbox.height, {fillStyle: color});
                }
            }
        }

    };

    AlignmentTrack.prototype.sortAlignmentRows = function (genomicLocation, sortOption, alignmentContainer) {

        var self = this;

        if (alignmentContainer === null) {
            alignmentContainer = this.featureSource.alignmentContainer;
        }

        alignmentContainer.packedAlignmentRows.forEach(function (row) {
            row.updateScore(genomicLocation, alignmentContainer, sortOption, self.sortDirection);
        });

        alignmentContainer.packedAlignmentRows.sort(function (rowA, rowB) {
            return true === self.sortDirection ? rowA.score - rowB.score : rowB.score - rowA.score;
        });

        this.parent.trackView.repaintViews();
        this.sortDirection = !(this.sortDirection);

    };

    AlignmentTrack.prototype.popupData = function (config) {

        var clickedObject;

        clickedObject = this.getClickedObject(config.viewport, config.y, config.genomicLocation);

        return clickedObject ? clickedObject.popupData(config.genomicLocation) : undefined;
    };

    AlignmentTrack.prototype.contextMenuItemList = function (config) {

        var self = this,
            clickHandler,
            list = [];

        list.push({label: 'Sort by base', click: sortRows});

        var alignment = this.getClickedObject(config.viewport, config.y, config.genomicLocation);
        if (alignment && !alignment.paired && alignment.isPaired() && alignment.isMateMapped()) {
            list.push({label: 'View mate in split screen', click: viewMateInSplitScreen, init: undefined});
        }

        return list;

        function sortRows() {
            self.sortOption = {sort: "NUCLEOTIDE"};
            self.sortAlignmentRows(config.genomicLocation, self.sortOption, config.viewport.tile.features);
        }

        function viewMateInSplitScreen() {
            if (alignment.mate) {
                self.highlightedAlignmentReadNamed = alignment.readName;
                igv.browser.presentSplitScreenMultiLocusPanel(alignment, config.viewport.genomicState);
            }
        }
    };


    function parse(locusString) {
        return locusString.split(/[^a-zA-Z0-9]/).map(function (value, index) {
            return 0 === index ? value : parseInt(value, 10);
        });
    }

    AlignmentTrack.prototype.getClickedObject = function (viewport, y, genomicLocation) {

        var packedAlignmentRows,
            downsampledIntervals,
            packedAlignmentsIndex,
            alignmentRow, clicked, i;

        packedAlignmentRows = viewport.tile.features.packedAlignmentRows;
        downsampledIntervals = viewport.tile.features.downsampledIntervals;

        packedAlignmentsIndex = Math.floor((y - this.top - this.alignmentsYOffset) / this.alignmentRowHeight);

        if (packedAlignmentsIndex < 0) {
            for (i = 0; i < downsampledIntervals.length; i++) {
                if (downsampledIntervals[i].start <= genomicLocation && (downsampledIntervals[i].end >= genomicLocation)) {
                    return downsampledIntervals[i];
                }
            }
        } else if (packedAlignmentsIndex < packedAlignmentRows.length) {

            alignmentRow = packedAlignmentRows[packedAlignmentsIndex];
            clicked = alignmentRow.alignments.filter(function (alignment) {
                return (genomicLocation >= alignment.start && genomicLocation <= (alignment.start + alignment.lengthOnRef));
            });

            if (clicked.length > 0) return clicked[0];
        }

        return undefined;

    };

    function getAlignmentColor(alignment) {

        var self = this,
            option = self.colorBy,
            tagValue, color,
            strand;

        color = self.parent.color;

        switch (option) {

            case "strand":
                color = alignment.strand ? self.posStrandColor : self.negStrandColor;
                break;

            case "firstOfPairStrand":
                if (alignment instanceof igv.PairedAlignment) {
                    color = alignment.firstOfPairStrand() ? self.posStrandColor : self.negStrandColor;
                }
                else if (alignment.isPaired()) {

                    if (alignment.isFirstOfPair()) {
                        color = alignment.strand ? self.posStrandColor : self.negStrandColor;
                    }
                    else if (alignment.isSecondOfPair()) {
                        color = alignment.strand ? self.negStrandColor : self.posStrandColor;
                    }
                    else {
                        console.log("ERROR. Paired alignments are either first or second.")
                    }
                }
                break;

            case "pairOrientation":
                if (self.pairOrientation && alignment.pairOrientation) {
                    var oTypes = orientationTypes[self.pairOrientation];
                    if (oTypes) {
                        var pairColor = self.pairColors[oTypes[alignment.pairOrientation]];
                        if (pairColor) color = pairColor;
                    } else {
                        console.log("No orientation types for " + self.pairOrientation);
                    }

                }
                break;

            case "fragmentLength":
                if (alignment.pairOrientation) {
                    if (self.parent.minFragmentLength && Math.abs(alignment.fragmentLength) < self.parent.minFragmentLength) {
                        color = self.smallFragmentLengthColor;
                    } else if (self.parent.maxFragmentLength && Math.abs(alignment.fragmentLength) > self.parent.maxFragmentLength) {
                        color = self.largeFragmentLengthColor;
                    }
                }
                break;

            case "tag":
                tagValue = alignment.tags()[self.colorByTag];
                if (tagValue !== undefined) {

                    if (self.bamColorTag === self.colorByTag) {
                        // UCSC style color option
                        color = "rgb(" + tagValue + ")";
                    }
                    else {
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
    };

    return igv;

})
(igv || {});
