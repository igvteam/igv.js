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

    "use strict";

    var type = "feature";

    let FeatureTrack;

    if (!igv.trackFactory) {
        igv.trackFactory = {};
    }

    igv.trackFactory[type] = function (config, browser) {

        if (!FeatureTrack) {
            defineClass();
        }

        return new FeatureTrack(config, browser);
    }


    function defineClass() {

        FeatureTrack = igv.extend(igv.TrackBase,

            function (config, browser) {

                this.type = type;

                igv.TrackBase.call(this, config, browser);

                // Set maxRows -- protects against pathological feature packing cases (# of rows of overlapping feaures)
                if (config.maxRows === undefined) {
                    config.maxRows = 500;
                }
                this.maxRows = config.maxRows;

                this.displayMode = config.displayMode || "EXPANDED";    // COLLAPSED | EXPANDED | SQUISHED
                this.labelDisplayMode = config.labelDisplayMode;

                const format = config.format ? config.format.toLowerCase() : undefined;
                if ('bigwig' === format || 'bigbed' === format) {
                    this.featureSource = new igv.BWSource(config, browser.genome);

                }
                else {
                    this.featureSource = new igv.FeatureSource(config, browser.genome);
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

            });

        FeatureTrack.prototype.postInit = function () {

            const self = this;
            const format = this.config.format;

            if (format && format.toLowerCase() === 'bigbed' && this.visibilityWindow === undefined) {

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

        FeatureTrack.prototype.supportsWholeGenome = function () {
            return this.config.indexed === false && this.config.supportsWholeGenome !== false
        }

        FeatureTrack.prototype.getFileHeader = function () {

            const self = this;

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

        FeatureTrack.prototype.getFeatures = function (chr, bpStart, bpEnd, bpPerPixel) {

            const self = this;

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
        FeatureTrack.prototype.computePixelHeight = function (features) {


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

                const height = this.margin + (maxRow + 1) * ("SQUISHED" === this.displayMode ? this.squishedRowHeight : this.expandedRowHeight);
                return height;

            }

        };

        FeatureTrack.prototype.draw = function (options) {

            const self = this;
            const featureList = options.features;
            const ctx = options.context;
            const bpPerPixel = options.bpPerPixel;
            const bpStart = options.bpStart;
            const pixelWidth = options.pixelWidth;
            const pixelHeight = options.pixelHeight;
            const bpEnd = bpStart + pixelWidth * bpPerPixel + 1;


            igv.graphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

            if (featureList) {

                const selectedFeatureName = igv.selectedGene ? igv.selectedGene.toUpperCase() : undefined;

                let selectedFeature;
                let lastPxEnd = [];

                for (let gene of featureList) {

                    if (gene.end < bpStart) continue;
                    if (gene.start > bpEnd) break;

                    if (!selectedFeature && selectedFeatureName && selectedFeatureName === gene.name.toUpperCase()) {
                        selectedFeature = gene;
                    }
                    else {
                        const row = this.displayMode === 'COLLAPSED' ? 0 : gene.row;
                        const pxEnd = Math.ceil((gene.end - bpStart) / bpPerPixel);
                        const last = lastPxEnd[row];
                        if (!last || pxEnd > last) {
                            self.render.call(this, gene, bpStart, bpPerPixel, pixelHeight, ctx, options);

                            lastPxEnd[row] = pxEnd;
                        }
                    }
                }

                if (selectedFeature) {
                    const c = selectedFeature.color;
                    selectedFeature.color = "rgb(255,0,0)";
                    self.render.call(this, selectedFeature, bpStart, bpPerPixel, pixelHeight, ctx, options);
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
        FeatureTrack.prototype.popupData = function (clickState) {

            let self = this;

            const yOffset = clickState.y - this.margin;
            const features = filterByRow(this.clickedFeatures(clickState), yOffset);
            const genomicLocation = clickState.genomicLocation;

            const data = [];
            for (let feature of features) {

                const featureData = feature.popupData ? feature.popupData(genomicLocation) : this.extractPopupData(feature);

                if (featureData) {
                    if (data.length > 0) {
                        data.push("<HR>");
                    }
                    Array.prototype.push.apply(data, featureData);
                }
            }
            ;

            return data;

            function filterByRow(features, y) {

                let row;
                switch (self.displayMode) {
                    case 'SQUISHED':
                        row = Math.floor(y / self.squishedRowHeight);
                        break;
                    case 'EXPANDED':
                        row = Math.floor(y / self.expandedRowHeight);
                        break;
                    default:
                        row = undefined;
                }

                return features.filter(function (feature) {
                    return (row === undefined || feature.row === undefined || row === feature.row);
                })
            }

        };


        FeatureTrack.prototype.menuItemList = function () {

            const self = this;
            const menuItems = [];

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
                        object: igv.createCheckbox(lut[displayMode], displayMode === self.displayMode),
                        click: function () {
                            self.browser.popover.hide();
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
            }
            else {
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

            if(feature.alpha && feature.alpha !== 1) {
                color = igv.Color.addAlpha(this.color, feature.alpha);
            }


            if (this.config.colorBy) {
                const colorByValue = feature[this.config.colorBy.field];
                if (colorByValue) {
                    color = this.config.colorBy.pallete[colorByValue];
                }
            }

            else if (feature.color) {
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
            if (exonCount === 0) {
                // single-exon transcript
                ctx.fillRect(coord.px, py, coord.pw, h);

            }
            else {
                // multi-exon transcript
                igv.graphics.strokeLine(ctx, coord.px + 1, cy, coord.px1 - 1, cy); // center line for introns

                const direction = feature.strand === '+' ? 1 : -1;
                const step = this.arrowSpacing;
                const pixelWidth = options.pixelWidth;

                const xLeft = Math.max(0, coord.px) + step / 2;
                const xRight = Math.min(pixelWidth, coord.px1);
                for (let x = xLeft; x < xRight; x += step) {
                    // draw arrowheads along central line indicating transcribed orientation
                    igv.graphics.strokeLine(ctx, x - direction * 2, cy - 2, x, cy);
                    igv.graphics.strokeLine(ctx, x - direction * 2, cy + 2, x, cy);
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
                            for (let x = ePx + step / 2; x < ePx1; x += step) {
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

            const windowX = Math.round(options.viewportContainerX);
            const windowX1 = windowX + options.viewportContainerWidth / (browser.genomicStateList.length || 1);

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
                selectedFeatureName = igv.selectedGene ? igv.selectedGene.toUpperCase() : undefined;    // <= for juicebox

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
    }

    return igv;

})
(igv || {});
