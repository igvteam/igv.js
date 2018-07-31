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

    igv.FeatureTrack = function (config) {

        // Set defaults
        igv.configTrack(this, config);

        // Set maxRows -- protects against pathological feature packing cases (# of rows of overlapping feaures)
        if (config.maxRows === undefined) {
            config.maxRows = 500;
        }
        this.maxRows = config.maxRows;

        this.displayMode = config.displayMode || "EXPANDED";    // COLLAPSED | EXPANDED | SQUISHED
        this.labelDisplayMode = config.labelDisplayMode;

        let format = config.format.toLowerCase();
        if (format === 'bigwig' || format === 'bigbed') {
            this.featureSource = new igv.BWSource(config);

        } else {
            this.featureSource = new igv.FeatureSource(config);
        }

        // Set default heights
        this.autoHeight = config.autoHeight;
        this.margin = config.margin === undefined ? 10 : config.margin;

        this.featureHeight = config.featureHeight || 14;

        if ("FusionJuncSpan" === config.type) {
            this.squishedRowHeight = config.squishedRowHeight || 50;
            this.expandedRowHeight = config.expandedRowHeight || 50;
            this.height = config.height || this.margin + 2 * this.expandedRowHeight;
        }
        else if ('snp' === config.type) {
            this.expandedRowHeight = config.expandedRowHeight || 10;
            this.squishedRowHeight = config.squishedRowHeight || 5;
            this.height = config.height || 30;
        }
        else {
            this.squishedRowHeight = config.squishedRowHeight || 15;
            this.expandedRowHeight = config.expandedRowHeight || 30;
            this.height = config.height || this.margin + 2 * this.expandedRowHeight;
        }


        // Set the render function.  This can optionally be passed in the config
        if (config.render) {
            this.render = config.render;
        } else if ("FusionJuncSpan" === config.type) {
            this.render = renderFusionJuncSpan;
        }
        else if ('snp' === config.type) {
            this.render = renderSnp;
            // colors ordered based on priority least to greatest
            this.snpColors = ['rgb(0,0,0)', 'rgb(0,0,255)', 'rgb(0,255,0)', 'rgb(255,0,0)'];
            this.colorBy = 'function';
        }
        else {
            this.render = renderFeature;
            this.arrowSpacing = 30;
            // adjust label positions to make sure they're always visible
            monitorTrackDrag(this);
        }

    };

    igv.FeatureTrack.prototype.postInit = function () {

        let self = this,
            format = this.config.format.toLowerCase();

        if (format === 'bigbed' && false === igv.hasVisibilityWindow(this)) {

            return this.featureSource.defaultVisibilityWindow()
                .then(function (visibilityWindow) {
                    self.visibilityWindow = visibilityWindow;
                    return self;
                })
        }
        else {
            return Promise.resolve(self);
        }

    }

    igv.FeatureTrack.prototype.getFileHeader = function () {

        var self = this;

        if (typeof self.featureSource.getFileHeader === "function") {

            if (self.header) {
                return Promise.resolve(self.header);
            }
            else {
                return self.featureSource.getFileHeader()

                    .then(function (header) {

                        if (header) {
                            // Header (from track line).  Set properties,unless set in the config (config takes precedence)
                            if (header.name && !self.config.name) {
                                self.name = header.name;
                            }
                            if (header.color && !self.config.color) {
                                self.color = "rgb(" + header.color + ")";
                            }
                            self.header = header;
                        }
                        else {
                            self.header = {};
                        }


                        return header;

                    })
            }
        }
        else {
            return Promise.resolve(null);
        }
    };

    igv.FeatureTrack.prototype.getFeatures = function (chr, bpStart, bpEnd, bpPerPixel) {

        var self = this;

        return this.getFileHeader()

            .then(function (header) {
                return self.featureSource.getFeatures(chr, bpStart, bpEnd, bpPerPixel, self.visibilityWindow);
            });
    };


    /**
     * The required height in pixels required for the track content.   This is not the visible track height, which
     * can be smaller (with a scrollbar) or larger.
     *
     * @param features
     * @returns {*}
     */
    igv.FeatureTrack.prototype.computePixelHeight = function (features) {

        var height;

        if (this.displayMode === "COLLAPSED") {
            return this.margin + this.expandedRowHeight;
        }
        else {
            let maxRow = 0;
            if (features && (typeof features.forEach === "function")) {
                features.forEach(function (feature) {

                    if (feature.row && feature.row > maxRow) {
                        maxRow = feature.row;
                    }

                });
            }

            height = this.margin + (maxRow + 1) * ("SQUISHED" === this.displayMode ? this.squishedRowHeight : this.expandedRowHeight);
            return height;

        }

    };

    igv.FeatureTrack.prototype.draw = function (options) {

        var track = this,
            featureList = options.features,
            ctx = options.context,
            bpPerPixel = options.bpPerPixel,
            bpStart = options.bpStart,
            pixelWidth = options.pixelWidth,
            pixelHeight = options.pixelHeight,
            bpEnd = bpStart + pixelWidth * bpPerPixel + 1,
            selectedFeatureName,
            selectedFeature,
            c;

        igv.graphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

        if (featureList) {

            selectedFeatureName = igv.FeatureTrack.selectedGene ? igv.FeatureTrack.selectedGene.toUpperCase() : undefined;

            for (var gene, i = 0, len = featureList.length; i < len; i++) {
                gene = featureList[i];
                if (gene.end < bpStart) continue;
                if (gene.start > bpEnd) break;

                if (!selectedFeature && selectedFeatureName && selectedFeatureName === gene.name.toUpperCase()) {
                    selectedFeature = gene;
                }
                else {
                    track.render.call(this, gene, bpStart, bpPerPixel, pixelHeight, ctx, options);
                }
            }

            if (selectedFeature) {
                c = selectedFeature.color;
                selectedFeature.color = "rgb(255,0,0)";
                track.render.call(this, selectedFeature, bpStart, bpPerPixel, pixelHeight, ctx, options);
                selectedFeature.color = c;
            }
        }
        else {
            console.log("No feature list");
        }

    };


    /**
     * Return "popup data" for feature @ genomic location.  Data is an array of key-value pairs
     */
    igv.FeatureTrack.prototype.popupData = function (args) {

        // We use the featureCache property rather than method to avoid async load.  If the
        // feature is not already loaded this won't work,  but the user wouldn't be mousing over it either.
        if (args.viewport.tile.features) {

            var genomicLocation, yOffset, referenceFrame, tolerance, featureList, row, data, ss, ee, hits;

            data = [];

            genomicLocation = args.genomicLocation;
            yOffset = args.y - this.margin;
            referenceFrame = args.viewport.genomicState.referenceFrame;

            // We need some tolerance around genomicLocation
            tolerance = 3 * referenceFrame.bpPerPixel;
            ss = genomicLocation - tolerance;
            ee = genomicLocation + tolerance;
            //featureList = this.featureSource.featureCache.queryFeatures(referenceFrame.chrName, ss, ee);

            featureList = args.viewport.tile.features;

            if ('COLLAPSED' !== this.displayMode) {
                row = 'SQUISHED' === this.displayMode ? Math.floor((yOffset - 0) / this.squishedRowHeight) : Math.floor((yOffset - 0) / this.expandedRowHeight);
            }

            if (featureList && featureList.length > 0) {

                hits = featureList.filter(function (feature) {
                    return (feature.end >= ss && feature.start <= ee) &&
                        (row === undefined || feature.row === undefined || row === feature.row);
                })

                hits.forEach(function (feature) {
                    var featureData;

                    if (feature.popupData) {
                        featureData = feature.popupData(genomicLocation);
                    } else {
                        featureData = extractPopupData(feature);
                    }
                    if (featureData) {
                        if (data.length > 0) {
                            data.push("<HR>");
                        }
                        Array.prototype.push.apply(data, featureData);
                    }


                });

                return data;
            }

        }

        return null;
    };

    /**
     * Default popup text function -- just extracts string and number properties in random order.
     * @param feature
     * @returns {Array}
     */
    function extractPopupData(feature) {

        const filteredProperties = new Set(['row', 'color']);
        let data = [];
        let alleles, alleleFreqs;

        for (var property in feature) {

            if (feature.hasOwnProperty(property) && !filteredProperties.has(property) &&
                igv.isStringOrNumber(feature[property])) {

                data.push({name: property, value: feature[property]});

                if (property === "alleles") {
                    alleles = feature[property];
                } else if (property === "alleleFreqs") {
                    alleleFreqs = feature[property];
                }
            }
        }

        if (alleles && alleleFreqs) {
            addCravatLinks(alleles, alleleFreqs, data);
        }

        return data;


        function addCravatLinks(alleles, alleleFreqs, data) {
            if (alleles && alleleFreqs) {
                if (alleles.endsWith(",")) alleles = alleles.substr(0, alleles.length - 1);
                if (alleleFreqs.endsWith(",")) alleleFreqs = alleleFreqs.substr(0, alleleFreqs.length - 1);
                let a = alleles.split(",");
                let af = alleleFreqs.split(",");
                if (af.length > 1) {
                    let b = [];
                    for (let i = 0; i < af.length; i++) {
                        b.push({a: a[i], af: Number.parseFloat(af[i])});
                    }
                    b.sort(function (x, y) {
                        return x.af - y.af
                    });

                    let ref = b[b.length - 1].a;
                    if (ref.length === 1) {
                        for (let i = b.length - 2; i >= 0; i--) {
                            let alt = b[i].a;
                            if (alt.length === 1) {
                                let l = "<a target='_blank' " +
                                    "href='http://www.cravat.us/CRAVAT/variant.html?variant=chr7_140808049_+_" + ref + "_" + alt + "'>Cravat " + ref + "->" + alt + "</a>";
                                data.push("<hr/>");
                                data.push(l);
                            }
                        }
                    }
                }
            }
        }
    }

    igv.FeatureTrack.prototype.menuItemList = function () {

        var self = this,
            menuItems = [];

        if (this.render === renderSnp) {
            (["function", "class"]).forEach(function (colorScheme) {
                menuItems.push({
                    object: igv.createCheckbox('Color by ' + colorScheme, colorScheme === self.colorBy),
                    click: function () {
                        self.colorBy = colorScheme;
                        self.trackView.repaintViews();
                    }
                });
            });
        }

        menuItems.push({object: $('<div class="igv-track-menu-border-top">')});

        ["COLLAPSED", "SQUISHED", "EXPANDED"].forEach(function (displayMode) {
            var lut =
            {
                "COLLAPSED": "Collapse",
                "SQUISHED": "Squish",
                "EXPANDED": "Expand"
            };

            menuItems.push(
             {
                object: igv.createCheckbox( lut[displayMode] ,displayMode=== self.displayMode),
            click:

        function () {
            igv.popover.hide();
            self.displayMode = displayMode;
                self.config.displayMode = displayMode;
  self.trackView.checkContentHeight();
         self .trackView.repaintViews();

            }
                });
            });

        return menuItems;

    };


    igv.FeatureTrack.prototype.description = function () {

        var desc;

        // if('snp' === this.type) {
        if (renderSnp === this.render) {
            desc = "<html>" + this.name + "<hr>";
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
        }
        else {
            return this.name;
        }

    };

    /**
     * Called when the track is removed.  Do any needed cleanup here
     */
    igv.FeatureTrack.prototype.dispose = function () {
        this.trackView = undefined;
    }


    /**
     * Monitors track drag events, updates label position to ensure that they're always visible.
     * @param track
     */
    function monitorTrackDrag(track) {
        var onDragEnd = function () {
            if (!track.trackView || !track.trackView.tile || track.displayMode === "SQUISHED") {
                return;
            }
            track.trackView.repaintViews();
        }

        var unSubscribe = function (removedTrack) {
            if (igv.browser.un && track === removedTrack) {
                igv.browser.un('trackdrag', onDragEnd);
                igv.browser.un('trackremoved', unSubscribe);
            }
        };

        if (igv.browser.on) {
            igv.browser.on('trackdragend', onDragEnd);
            igv.browser.on('trackremoved', unSubscribe);
        }
    }

    /**
     * @param feature
     * @param bpStart  genomic location of the left edge of the current canvas
     * @param xScale  scale in base-pairs per pixel
     * @returns {{px: number, px1: number, pw: number, h: number, py: number}}
     */
    function calculateFeatureCoordinates(feature, bpStart, xScale) {
        var px = (feature.start - bpStart) / xScale,
            px1 = (feature.end - bpStart) / xScale,
        //px = Math.round((feature.start - bpStart) / xScale),
        //px1 = Math.round((feature.end - bpStart) / xScale),
            pw = px1 - px;

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

        var x, e, exonCount, cy, direction, exon, ePx, ePx1, ePxU, ePw, py2, h2, py,
            windowX, windowX1,
            coord = calculateFeatureCoordinates(feature, bpStart, xScale),
            h = this.featureHeight,
            step = this.arrowSpacing,
            color = this.color;

        if (this.config.colorBy) {
            var colorByValue = feature[this.config.colorBy.field];
            if (colorByValue) {
                color = this.config.colorBy.pallete[colorByValue];
            }
        }
        else if (feature.color) {
            color = feature.color;
        }

        ctx.fillStyle = color;
        ctx.strokeStyle = color;

        if (this.displayMode === "SQUISHED" && feature.row !== undefined) {
            h = this.featureHeight / 2;
            py = this.margin + this.squishedRowHeight * feature.row;
        } else if (this.displayMode === "EXPANDED" && feature.row !== undefined) {
            py = this.margin + this.expandedRowHeight * feature.row;
        } else {  // collapsed
            py = this.margin;
        }

        cy = py + h / 2;
        h2 = h / 2;
        py2 = cy - h2 / 2;

        exonCount = feature.exons ? feature.exons.length : 0;

        if (exonCount === 0) {
            // single-exon transcript
            ctx.fillRect(coord.px, py, coord.pw, h);

        }
        else {
            // multi-exon transcript
            igv.graphics.strokeLine(ctx, coord.px + 1, cy, coord.px1 - 1, cy); // center line for introns

            direction = feature.strand === '+' ? 1 : -1;
            for (x = coord.px + step / 2; x < coord.px1; x += step) {
                // draw arrowheads along central line indicating transcribed orientation
                igv.graphics.strokeLine(ctx, x - direction * 2, cy - 2, x, cy);
                igv.graphics.strokeLine(ctx, x - direction * 2, cy + 2, x, cy);
            }
            for (e = 0; e < exonCount; e++) {
                // draw the exons
                exon = feature.exons[e];
                ePx = Math.round((exon.start - bpStart) / xScale);
                ePx1 = Math.round((exon.end - bpStart) / xScale);
                ePw = Math.max(1, ePx1 - ePx);

                if (exon.utr) {
                    ctx.fillRect(ePx, py2, ePw, h2); // Entire exon is UTR
                }
                else {
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
                    if (ePw > step + 5) {
                        ctx.fillStyle = "white";
                        ctx.strokeStyle = "white";
                        for (x = ePx + step / 2; x < ePx1; x += step) {
                            // draw arrowheads along central line indicating transcribed orientation
                            igv.graphics.strokeLine(ctx, x - direction * 2, cy - 2, x, cy);
                            igv.graphics.strokeLine(ctx, x - direction * 2, cy + 2, x, cy);
                        }
                        ctx.fillStyle = color;
                        ctx.strokeStyle = color;

                    }
                }
            }
        }

        windowX = Math.round(options.viewportContainerX);
        windowX1 = windowX + options.viewportContainerWidth / (igv.browser.genomicStateList.length || 1);

        renderFeatureLabels.call(this, ctx, feature, coord.px, coord.px1, py, windowX, windowX1, options.genomicState, options);
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
    function renderFeatureLabels(ctx, feature, featureX, featureX1, featureY, windowX, windowX1, genomicState, options) {

        var geneColor, geneFontStyle, transform,
            boxX, boxX1,    // label should be centered between these two x-coordinates
            labelX, labelY,
            textFitsInBox,
            selectedFeatureName = igv.FeatureTrack.selectedGene ? igv.FeatureTrack.selectedGene.toUpperCase() : undefined;    // <= for juicebox

        // feature outside of viewable window
        if (featureX1 < windowX || featureX > windowX1) {
            boxX = featureX;
            boxX1 = featureX1;
        } else {
            // center label within visible portion of the feature
            boxX = Math.max(featureX, windowX);
            boxX1 = Math.min(featureX1, windowX1);
        }

        if (genomicState.selection && igv.GtexUtils.gtexLoaded && feature.name !== undefined) {
            // TODO -- for gtex, figure out a better way to do this
            geneColor = genomicState.selection.colorForGene(feature.name);
        }


        textFitsInBox = (boxX1 - boxX) > ctx.measureText(feature.name).width;

        if ((feature.name !== undefined && feature.name.toUpperCase() === selectedFeatureName) ||
            ((textFitsInBox || geneColor) && this.displayMode !== "SQUISHED" && feature.name !== undefined)) {
            geneFontStyle = {
                // font: '10px PT Sans',
                textAlign: 'center',
                fillStyle: geneColor || feature.color || this.color,
                strokeStyle: geneColor || feature.color || this.color
            };

            if (this.displayMode === "COLLAPSED" && this.labelDisplayMode === "SLANT") {
                transform = {rotate: {angle: 45}};
                delete geneFontStyle.textAlign;
            }

            labelX = boxX + ((boxX1 - boxX) / 2);
            labelY = getFeatureLabelY(featureY, transform);

            // TODO: This is for compatibility with JuiceboxJS.
            if (options.labelTransform) {
                ctx.save();
                options.labelTransform(ctx, labelX);
                igv.graphics.fillText(ctx, feature.name, labelX, labelY, geneFontStyle, undefined);
                ctx.restore();

            } else {
                igv.graphics.fillText(ctx, feature.name, labelX, labelY, geneFontStyle, transform);
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
        var rowHeight = (this.displayMode === "EXPANDED") ? this.squishedRowHeight : this.expandedRowHeight;

        if (this.display === "COLLAPSED") {
            py = this.margin;
        }
        if (this.displayMode === "SQUISHED" && feature.row != undefined) {
            py = this.margin + rowHeight * feature.row;
        }
        else if (this.displayMode === "EXPANDED" && feature.row != undefined) {
            py = this.margin + rowHeight * feature.row;
        }

        var cy = py + 0.5 * rowHeight;
        var top_y = cy - 0.5 * rowHeight;
        var bottom_y = cy + 0.5 * rowHeight;

        // draw the junction arc
        var junction_left_px = Math.round((feature.junction_left - bpStart) / xScale);
        var junction_right_px = Math.round((feature.junction_right - bpStart) / xScale);


        ctx.beginPath();
        ctx.moveTo(junction_left_px, cy);
        ctx.bezierCurveTo(junction_left_px, top_y, junction_right_px, top_y, junction_right_px, cy);

        ctx.lineWidth = 1 + Math.log(feature.num_junction_reads) / Math.log(2);
        ctx.strokeStyle = 'blue';
        ctx.stroke();

        // draw the spanning arcs
        var spanning_coords = feature.spanning_frag_coords;
        for (var i = 0; i < spanning_coords.length; i++) {
            var spanning_info = spanning_coords[i];

            var span_left_px = Math.round((spanning_info.left - bpStart) / xScale);
            var span_right_px = Math.round((spanning_info.right - bpStart) / xScale);


            ctx.beginPath();
            ctx.moveTo(span_left_px, cy);
            ctx.bezierCurveTo(span_left_px, bottom_y, span_right_px, bottom_y, span_right_px, cy);

            ctx.lineWidth = 1;
            ctx.strokeStyle = 'purple';
            ctx.stroke();
        }
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


    return igv;

})
(igv || {});
