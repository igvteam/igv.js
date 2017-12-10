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
    const DEFAULT_COVERAGE_TRACK_HEIGHT = 50;
    const DEFAULT_TRACK_HEIGHT = 300;

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

        this.color = config.color || "rgb(185, 185, 185)";

        // sort alignment rows
        this.sortOption = config.sortOption || {sort: "NUCLEOTIDE"};
        this.sortDirection = true;

        // filter alignments
        this.filterOption = config.filterOption || {name: "mappingQuality", params: [30, undefined]};

    };

    igv.BAMTrack.prototype.getFeatures = function (chr, bpStart, bpEnd) {
        return this.featureSource.getAlignments(chr, bpStart, bpEnd);
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

    // Alt - Click to Sort alignment rows
    igv.BAMTrack.prototype.altClick = function (genomicLocation, referenceFrame, event) {

        this.alignmentTrack.sortAlignmentRows(genomicLocation, this.sortOption);

        // TODO - dat. Temporary hack to stand up mult-locus implementation.
        // TODO - dat. MUST identify viewport that was clicked in.
        this.trackView.viewports[0].redrawTile(this.featureSource.alignmentContainer);
        this.trackView.viewports[0].$viewport.scrollTop(0);

        this.sortDirection = !this.sortDirection;
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
            this.alignmentTrack.computePixelHeight(alignmentContainer);

    };

    igv.BAMTrack.prototype.draw = function (options) {

        if (this.coverageTrack.height > 0) {
            this.coverageTrack.draw(options);
        }

        this.alignmentTrack.draw(options);
    };

    igv.BAMTrack.prototype.paintAxis = function (ctx, pixelWidth, pixelHeight) {

        this.coverageTrack.paintAxis(ctx, pixelWidth, this.coverageTrackHeight);

    };

    igv.BAMTrack.prototype.popupMenuItemList = function (config) {

        var self = this,
            $e,
            clickHandler,
            list = [];

        $e = $('<div>');
        $e.text('Sort by base');

        clickHandler = function () {

            self.alignmentTrack.sortAlignmentRows(config.genomicLocation, self.sortOption);

            config.viewport.redrawTile(self.featureSource.alignmentContainer);

            config.viewport.$viewport.scrollTop(0);

            self.sortDirection = !(self.sortDirection);

            config.popover.hide();

        };

        list.push({name: undefined, object: $e, click: clickHandler, init: undefined});

        if (false === self.viewAsPairs) {

            $e = $('<div>');
            $e.text('View mate in split screen');

            clickHandler = function () {
                self.alignmentTrack.popupMenuItemList(config);
            };

            list.push({name: undefined, object: $e, click: clickHandler, init: undefined});

        }

        return list;

    };

    igv.BAMTrack.prototype.popupData = function (config) {

        if (config.y >= this.coverageTrack.top && config.y < this.coverageTrack.height) {
            return this.coverageTrack.popupData(config);
        } else {
            return this.alignmentTrack.popupData(config);
        }

    };

    igv.BAMTrack.prototype.menuItemList = function (popover) {

        var self = this,
            $e,
            html,
            menuItems = [],
            colorByMenuItems = [],
            tagLabel,
            selected;

        // sort by genomic location
        menuItems.push(sortMenuItem(popover));

        colorByMenuItems.push({key: 'none', label: 'track color'});

        if (!self.viewAsPairs) {
            colorByMenuItems.push({key: 'strand', label: 'read strand'});
        }

        if (self.pairsSupported && self.alignmentTrack.hasPairs) {
            colorByMenuItems.push({key: 'firstOfPairStrand', label: 'first-of-pair strand'});
        }

        tagLabel = 'tag' + (self.alignmentTrack.colorByTag ? ' (' + self.alignmentTrack.colorByTag + ')' : '');
        colorByMenuItems.push({key: 'tag', label: tagLabel});

        $e = $('<div class="igv-track-menu-category igv-track-menu-border-top">');
        $e.text('Color by');
        menuItems.push({name: undefined, object: $e, click: undefined, init: undefined});
        // menuItems.push('<div class="igv-track-menu-category igv-track-menu-border-top">Color by</div>');

        colorByMenuItems.forEach(function (item) {
            selected = (self.alignmentTrack.colorBy === item.key);
            menuItems.push(colorByMarkup(item, selected));
        });

        html = [];
        if (self.pairsSupported && self.alignmentTrack.hasPairs) {

            html.push('<div class="igv-track-menu-border-top">');
            html.push(true === self.viewAsPairs ? '<i class="fa fa-check">' : '<i class="fa fa-check fa-check-hidden">');
            html.push('</i>');
            html.push('View as pairs');
            html.push('</div>');

            menuItems.push({
                object: $(html.join('')),
                click: function () {
                    var $fa = $(this).find('i');

                    popover.hide();

                    self.viewAsPairs = !self.viewAsPairs;

                    if (true === self.viewAsPairs) {
                        $fa.removeClass('fa-check-hidden');
                    } else {
                        $fa.addClass('fa-check-hidden');
                    }

                    self.featureSource.setViewAsPairs(self.viewAsPairs);
                    self.trackView.update();
                }
            });
        }

        return menuItems;

        function colorByMarkup(menuItem, showCheck, index) {

            var $e,
                clickHandler,
                parts = [];

            parts.push('<div>');

            parts.push(showCheck ? '<i class="fa fa-check"></i>' : '<i class="fa fa-check fa-check-hidden"></i>');

            if (menuItem.key === 'tag') {
                parts.push('<span id="color-by-tag">');
            } else {
                parts.push('<span>');
            }

            parts.push(menuItem.label);
            parts.push('</span>');

            parts.push('</div>');

            $e = $(parts.join(''));

            clickHandler = function () {

                igv.popover.hide();

                if ('tag' === menuItem.key) {

                    igv.dialog.configure(function () {
                        return "Tag Name"
                    }, self.alignmentTrack.colorByTag ? self.alignmentTrack.colorByTag : '', function () {
                        var tag = igv.dialog.$dialogInput.val().trim();
                        self.alignmentTrack.colorBy = 'tag';

                        if (tag !== self.alignmentTrack.colorByTag) {
                            self.alignmentTrack.colorByTag = igv.dialog.$dialogInput.val().trim();
                            self.alignmentTrack.tagColors = new igv.PaletteColorTable("Set1");
                            $('#color-by-tag').text(self.alignmentTrack.colorByTag);
                        }

                        self.trackView.update();
                    }, undefined, undefined);

                    igv.dialog.show($(self.trackView.trackDiv));

                } else {
                    self.alignmentTrack.colorBy = menuItem.key;
                    self.trackView.update();
                }
            };

            return {name: undefined, object: $e, click: clickHandler, init: undefined}

        }

        function sortMenuItem(popover) {

            var $e,
                clickHandler;

            $e = $('<div>');
            $e.text('Sort by base');

            clickHandler = function () {
                var genomicState = _.first(igv.browser.genomicStateList),
                    referenceFrame = genomicState.referenceFrame,
                    genomicLocation,
                    viewportHalfWidth;

                popover.hide();

                viewportHalfWidth = Math.floor(0.5 * (igv.browser.viewportContainerWidth() / genomicState.locusCount));
                genomicLocation = Math.floor((referenceFrame.start) + referenceFrame.toBP(viewportHalfWidth));

                self.altClick(genomicLocation, undefined, undefined);

                if ("show center guide" === igv.browser.centerGuide.$centerGuideToggle.text()) {
                    igv.browser.centerGuide.$centerGuideToggle.trigger("click");
                }

            };

            return {name: undefined, object: $e, click: clickHandler, init: undefined}
        }

    };

    function shadedBaseColor(qual, nucleotide, genomicLocation) {

        var color,
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
            color = igv.nucleotideColors[nucleotide];
        }
        else {
            color = "rgba(" + foregroundColor[0] + "," + foregroundColor[1] + "," + foregroundColor[2] + "," + alpha + ")";    //igv.getCompositeColor(backgroundColor, foregroundColor, alpha);
        }
        return color;
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


            igv.graphics.setProperties(ctx, {fillStyle: this.parent.color, strokeStyle: this.color});
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
            coverageMap = this.featureSource.alignmentContainer.coverageMap,
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
            if (tmp > 0)  tmp = tmp.toString() + " (" + Math.floor(((coverage.posA + coverage.negA) / coverage.total) * 100.0) + "%)";
            nameValues.push({name: 'A', value: tmp});


            // C
            tmp = coverage.posC + coverage.negC;
            if (tmp > 0)  tmp = tmp.toString() + " (" + Math.floor((tmp / coverage.total) * 100.0) + "%)";
            nameValues.push({name: 'C', value: tmp});

            // G
            tmp = coverage.posG + coverage.negG;
            if (tmp > 0)  tmp = tmp.toString() + " (" + Math.floor((tmp / coverage.total) * 100.0) + "%)";
            nameValues.push({name: 'G', value: tmp});

            // T
            tmp = coverage.posT + coverage.negT;
            if (tmp > 0)  tmp = tmp.toString() + " (" + Math.floor((tmp / coverage.total) * 100.0) + "%)";
            nameValues.push({name: 'T', value: tmp});

            // N
            tmp = coverage.posN + coverage.negN;
            if (tmp > 0)  tmp = tmp.toString() + " (" + Math.floor((tmp / coverage.total) * 100.0) + "%)";
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

        this.colorBy = config.colorBy || "none";
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

            packedAlignmentRows.forEach(function renderAlignmentRow(alignmentRow, i) {

                var yRect = alignmentRowYInset + (self.alignmentRowHeight * i),
                    alignmentHeight = self.alignmentRowHeight - 2,
                    i,
                    b,
                    alignment;

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

            var alignmentColor = getAlignmentColor.call(self, alignment),
                outlineColor = 'alignmentColor',
                lastBlockEnd,
                blocks = alignment.blocks,
                block,
                b;

            if ((alignment.start + alignment.lengthOnRef) < bpStart || alignment.start > bpEnd) {
                return;
            }

            if (alignment.mq <= 0) {
                alignmentColor = igv.Color.addAlpha(alignmentColor, "0.15");
            }

            igv.graphics.setProperties(ctx, {fillStyle: alignmentColor, strokeStyle: outlineColor});

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

                var seqOffset = block.start - alignmentContainer.start,
                    xBlockStart = (block.start - bpStart) / bpPerPixel,
                    xBlockEnd = ((block.start + block.len) - bpStart) / bpPerPixel,
                    widthBlock = Math.max(1, xBlockEnd - xBlockStart),
                    widthArrowHead = self.alignmentRowHeight / 2.0,
                    blockSeq = block.seq.toUpperCase(),
                    skippedColor = self.skippedColor,
                    deletionColor = self.deletionColor,
                    refChar,
                    readChar,
                    readQual,
                    xBase,
                    widthBase,
                    colorBase,
                    x,
                    y,
                    i,
                    yStrokedLine = yRect + alignmentHeight / 2,
                    len;

                if (block.gapType !== undefined && xBlockEnd !== undefined && lastBlockEnd !== undefined) {
                    if ("D" === block.gapType) {
                        igv.graphics.strokeLine(ctx, lastBlockEnd, yStrokedLine, xBlockStart, yStrokedLine, {strokeStyle: deletionColor});
                    }
                    else {
                        igv.graphics.strokeLine(ctx, lastBlockEnd, yStrokedLine, xBlockStart, yStrokedLine, {strokeStyle: skippedColor});
                    }
                }
                lastBlockEnd = xBlockEnd;

                if (true === alignment.strand && b === blocks.length - 1) {
                    // Last block on + strand
                    x = [
                        xBlockStart,
                        xBlockEnd,
                        xBlockEnd + widthArrowHead,
                        xBlockEnd,
                        xBlockStart,
                        xBlockStart];
                    y = [
                        yRect,
                        yRect,
                        yRect + (alignmentHeight / 2.0),
                        yRect + alignmentHeight,
                        yRect + alignmentHeight,
                        yRect];

                    igv.graphics.fillPolygon(ctx, x, y, {fillStyle: alignmentColor});

                    if (self.highlightedAlignmentReadNamed === alignment.readName) {
                        igv.graphics.strokePolygon(ctx, x, y, {strokeStyle: 'red'});
                    }

                    if (alignment.mq <= 0) {
                        igv.graphics.strokePolygon(ctx, x, y, {strokeStyle: outlineColor});
                    }
                }
                else if (false === alignment.strand && b === 0) {
                    // First block on - strand
                    x = [
                        xBlockEnd,
                        xBlockStart,
                        xBlockStart - widthArrowHead,
                        xBlockStart,
                        xBlockEnd,
                        xBlockEnd];
                    y = [
                        yRect,
                        yRect,
                        yRect + (alignmentHeight / 2.0),
                        yRect + alignmentHeight,
                        yRect + alignmentHeight,
                        yRect];

                    igv.graphics.fillPolygon(ctx, x, y, {fillStyle: alignmentColor});

                    if (self.highlightedAlignmentReadNamed === alignment.readName) {
                        igv.graphics.strokePolygon(ctx, x, y, {strokeStyle: 'red'});
                    }

                    if (alignment.mq <= 0) {
                        igv.graphics.strokePolygon(ctx, x, y, {strokeStyle: outlineColor});
                    }
                }
                else {
                    igv.graphics.fillRect(ctx, xBlockStart, yRect, widthBlock, alignmentHeight, {fillStyle: alignmentColor});
                    if (alignment.mq <= 0) {
                        ctx.save();
                        ctx.strokeStyle = outlineColor;
                        ctx.strokeRect(xBlockStart, yRect, widthBlock, alignmentHeight);
                        ctx.restore();
                    }
                }
                // Only do mismatch coloring if a refseq exists to do the comparison
                if (sequence && blockSeq !== "*") {
                    for (i = 0, len = blockSeq.length; i < len; i++) {

                        if(seqOffset + i < 0) continue;

                        readChar = blockSeq.charAt(i);
                        refChar = sequence.charAt(seqOffset + i);
                        if (readChar === "=") {
                            readChar = refChar;
                        }
                        if (readChar === "X" || refChar !== readChar) {
                            if (block.qual && block.qual.length > i) {
                                readQual = block.qual[i];
                                colorBase = shadedBaseColor(readQual, readChar, i + block.start);
                            }
                            else {
                                colorBase = igv.nucleotideColors[readChar];
                            }
                            if (colorBase) {
                                xBase = ((block.start + i) - bpStart) / bpPerPixel;
                                widthBase = Math.max(1, 1 / bpPerPixel);
                                igv.graphics.fillRect(ctx, xBase, yRect, widthBase, alignmentHeight, {fillStyle: colorBase});
                            }
                        }
                    }
                }
            }
        }

    };

    AlignmentTrack.prototype.sortAlignmentRows = function (genomicLocation, sortOption) {

        var self = this;

        this.featureSource.alignmentContainer.packedAlignmentRows.forEach(function (row) {
            row.updateScore(genomicLocation, self.featureSource.alignmentContainer, sortOption);
        });

        this.featureSource.alignmentContainer.packedAlignmentRows.sort(function (rowA, rowB) {
            // return rowA.score - rowB.score;
            return true === self.sortDirection ? rowA.score - rowB.score : rowB.score - rowA.score;
        });

    };

    AlignmentTrack.prototype.popupData = function (config) {

        var clickedObject;

        clickedObject = this.getClickedObject(config.viewport, config.y, config.genomicLocation);

        return clickedObject ? clickedObject.popupData(config.genomicLocation) : undefined;
    };


    AlignmentTrack.prototype.popupMenuItemList = function (config) {

        var alignment,
            loci,
            mateLoci,
            index,
            head,
            tail;

        this.highlightedAlignmentReadNamed = undefined;

        config.popover.hide();

        alignment = this.getClickedObject(config.viewport, config.y, config.genomicLocation);

        if (alignment) {

            this.highlightedAlignmentReadNamed = alignment.readName;

            loci = _.map(igv.browser.genomicStateList, function (gs) {
                return gs.locusSearchString;
            });

            index = config.viewport.genomicState.locusIndex;
            head = _.first(loci, 1 + index);
            tail = _.size(loci) === 1 ? undefined : _.last(loci, _.size(loci) - (1 + index));

            mateLoci = locusPairWithAlignmentAndViewport(alignment, config.viewport);

            // discard last element of head and replace with mateLoci
            head.splice(-1, 1);
            Array.prototype.push.apply(head, mateLoci);
            if (tail) {
                Array.prototype.push.apply(head, tail);
            }

            igv.browser.search(head.join(' '));
        }

        function locusPairWithAlignmentAndViewport(alignment, viewport) {
            var left,
                right,
                centroid,
                widthBP;

            widthBP = viewport.$viewport.width() * viewport.genomicState.referenceFrame.bpPerPixel;

            centroid = (alignment.start + (alignment.start + alignment.lengthOnRef)) / 2;
            left = alignment.chr + ':' + Math.round(centroid - widthBP / 2.0).toString() + '-' + Math.round(centroid + widthBP / 2.0).toString();

            centroid = (alignment.mate.position + (alignment.mate.position + alignment.lengthOnRef)) / 2;
            right = alignment.chr + ':' + Math.round(centroid - widthBP / 2.0).toString() + '-' + Math.round(centroid + widthBP / 2.0).toString();

            return [left, right];
        }
    };

    AlignmentTrack.prototype.getClickedObject = function (viewport, y, genomicLocation) {

        var packedAlignmentRows,
            downsampledIntervals,
            packedAlignmentsIndex,
            alignmentRow, clicked, i;

        packedAlignmentRows = viewport.drawConfiguration.features.packedAlignmentRows;
        downsampledIntervals = viewport.drawConfiguration.features.downsampledIntervals;

        packedAlignmentsIndex = Math.floor((y - this.top - this.alignmentsYOffset) / this.alignmentRowHeight);

        if (packedAlignmentsIndex < 0) {
            for (i = 0; i < downsampledIntervals.length; i++) {
                if (downsampledIntervals[i].start <= genomicLocation && (downsampledIntervals[i].end >= genomicLocation)) {
                    return downsampledIntervals[i];
                }
            }
        } else if (packedAlignmentsIndex < packedAlignmentRows.length) {

            alignmentRow = packedAlignmentRows[packedAlignmentsIndex];
            clicked = _.filter(alignmentRow.alignments, function (alignment) {
                return (genomicLocation >= alignment.start && genomicLocation <= (alignment.start + alignment.lengthOnRef));
            });

            if (clicked.length > 0) return clicked[0];
        }

        return undefined;

    }

    function getAlignmentColor(alignment) {

        var alignmentTrack = this,
            option = alignmentTrack.colorBy,
            tagValue, color,
            strand;

        color = alignmentTrack.parent.color;

        switch (option) {

            case "strand":
                color = alignment.strand ? alignmentTrack.posStrandColor : alignmentTrack.negStrandColor;
                break;

            case "firstOfPairStrand":
                if (alignment instanceof igv.PairedAlignment) {
                    color = alignment.firstOfPairStrand() ? alignmentTrack.posStrandColor : alignmentTrack.negStrandColor;
                }
                else if (alignment.isPaired()) {

                    if (alignment.isFirstOfPair()) {
                        color = alignment.strand ? alignmentTrack.posStrandColor : alignmentTrack.negStrandColor;
                    }
                    else if (alignment.isSecondOfPair()) {
                        color = alignment.strand ? alignmentTrack.negStrandColor : alignmentTrack.posStrandColor;
                    }
                    else {
                        console.log("ERROR. Paired alignments are either first or second.")
                    }
                }
                break;

            case "tag":
                tagValue = alignment.tags()[alignmentTrack.colorByTag];
                if (tagValue !== undefined) {

                    if (alignmentTrack.bamColorTag === alignmentTrack.colorByTag) {
                        // UCSC style color option
                        color = "rgb(" + tagValue + ")";
                    }
                    else {
                        color = alignmentTrack.tagColors.getColor(tagValue);
                    }
                }
                break;

            default:
                color = alignmentTrack.parent.color;
        }

        return color;

    }

    return igv;

})
(igv || {});
