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

        igv.configTrack(this, config);

        this.displayMode = config.displayMode || "COLLAPSED";    // COLLAPSED | EXPANDED | SQUISHED
        this.labelDisplayMode = config.labelDisplayMode;

        this.variantHeight = config.variantHeight || this.height;
        this.squishedCallHeight = config.squishedCallHeight || 30;
        this.expandedCallHeight = config.expandedCallHeight || 15;

        this.featureHeight = config.featureHeight || 14;

        // Set maxRows -- protects against pathological feature packing cases (# of rows of overlapping feaures)
        if (config.maxRows === undefined) {
            config.maxRows = 500;
        }
        this.maxRows = config.maxRows;

        if (config.url &&
            (
                igv.filenameOrURLHasSuffix(config.url, '.bigbed') || igv.filenameOrURLHasSuffix(config.url, '.bb')
                ||
                igv.filenameOrURLHasSuffix(config.url, '.bigwig') || igv.filenameOrURLHasSuffix(config.url, '.bw')
            )
        ) {
            this.featureSource = new igv.BWSource(config);
        } else {
            this.featureSource = new igv.FeatureSource(config);
        }

        // Set the render function.  This can optionally be passed in the config
        if (config.render) {
            this.render = config.render;
        } else if ("variant" === config.type) {
            this.render = renderVariant;
            this.homvarColor = "rgb(17,248,254)";
            this.hetvarColor = "rgb(34,12,253)";
        } else if ("FusionJuncSpan" === config.type) {
            this.render = renderFusionJuncSpan;
            this.height = config.height || 50;
            this.autoHeight = false;
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

    igv.FeatureTrack.prototype.getFileHeader = function () {
        var self = this;
        return new Promise(function (fulfill, reject) {
            if (typeof self.featureSource.getFileHeader === "function") {
                self.featureSource
                    .getFileHeader()
                    .then(function (header) {

                        if (header) {
                            // Header (from track line).  Set properties,unless set in the config (config takes precedence)
                            if (header.name && !self.config.name) {
                                self.name = header.name;
                            }
                            if (header.color && !self.config.color) {
                                self.color = "rgb(" + header.color + ")";
                            }
                        }
                        fulfill(header);

                    })
                    .catch(function (error) {
                        reject(error);
                    });
            }
            else {
                fulfill(null);
            }
        });
    };

    igv.FeatureTrack.prototype.getFeatures = function (chr, bpStart, bpEnd, bpPerPixel) {

        var self = this;

        return new Promise(function (fulfill, reject) {

            self.featureSource.getFeatures(chr, bpStart, bpEnd, bpPerPixel).then(fulfill).catch(reject);

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
            return this.variantHeight;
        }
        else {
            var maxRow = 0;
            if (features && (typeof features.forEach === "function")) {
                features.forEach(function (feature) {

                    if (feature.row && feature.row > maxRow) {
                        maxRow = feature.row;
                    }

                });
            }

            height = Math.max(this.variantHeight, (maxRow + 1) * ("SQUISHED" === this.displayMode ? this.squishedCallHeight : this.expandedCallHeight));
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


    igv.FeatureTrack.prototype.popupDataWithConfiguration = function (config) {
        return this.popupData(config.genomicLocation, config.x, config.y, config.viewport.genomicState.referenceFrame)
    };

    /**
     * Return "popup data" for feature @ genomic location.  Data is an array of key-value pairs
     */
    igv.FeatureTrack.prototype.popupData = function (genomicLocation, xOffset, yOffset, referenceFrame) {

        // We use the featureCache property rather than method to avoid async load.  If the
        // feature is not already loaded this won't work,  but the user wouldn't be mousing over it either.
        if (this.featureSource.featureCache) {

            var tolerance,
                featureList,
                row,
                popupData,
                ss,
                ee,
                str,
                filtered,
                mapped;

            // We need some tolerance around genomicLocation, start with +/- 2 pixels
            tolerance = 2 * referenceFrame.bpPerPixel;
            ss = genomicLocation - tolerance;
            ee = genomicLocation + tolerance;
            featureList = this.featureSource.featureCache.queryFeatures(referenceFrame.chrName, ss, ee);

            if ('COLLAPSED' !== this.displayMode) {
                row = 'SQUISHED' === this.displayMode ? Math.floor((yOffset - 2)/this.expandedCallHeight) : Math.floor((yOffset - 5)/this.squishedCallHeight);
            }

            if (featureList && featureList.length > 0) {

                // filtered = _.filter(featureList, function (ff) {
                //     return ff.end >= ss && ff.start <= ee;
                // });
                //
                // mapped = _.map(filtered, function (f) {
                //     return f.row;
                // });
                //
                // str = mapped.join(' ');

                popupData = [];
                featureList.forEach(function (feature) {
                    var featureData;

                    if (feature.end >= ss && feature.start <= ee) {

                        // console.log('row ' + row + ' feature-rows ' + str + ' features ' + _.size(featureList));

                        if (row === undefined || feature.row === undefined || row === feature.row) {

                            if (feature.popupData) {
                                featureData = feature.popupData(genomicLocation);
                            } else {
                                featureData = extractPopupData(feature);
                            }
                            if (featureData) {
                                if (popupData.length > 0) {
                                    popupData.push("<HR>");
                                }
                                Array.prototype.push.apply(popupData, featureData);
                            }

                        }
                    }
                });

                return popupData;
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
        var data = [];
        for (var property in feature) {
            if (feature.hasOwnProperty(property) &&
                "chr" !== property && "start" !== property && "end" !== property && "row" !== property &&
                igv.isStringOrNumber(feature[property])) {
                data.push({name: property, value: feature[property]});
            }
        }
        return data;
    }

    igv.FeatureTrack.prototype.menuItemList = function (popover) {

        var self = this,
            menuItems = [],
            mapped;

        menuItems.push(igv.colorPickerMenuItem(popover, this.trackView));

        mapped = _.map(["COLLAPSED", "SQUISHED", "EXPANDED"], function (displayMode, index) {
            return {
                object: $(markupStringified(displayMode, index, self.displayMode)),
                click: function () {
                    popover.hide();
                    self.displayMode = displayMode;
                    self.trackView.update();
                }
            };
        });

        menuItems = menuItems.concat(mapped);

        function markupStringified(displayMode, index, selfDisplayMode) {

            var lut,
                chosen;

            lut =
            {
                "COLLAPSED": "Collapse",
                "SQUISHED": "Squish",
                "EXPANDED": "Expand"
            };

            chosen = (0 === index) ? '<div class="igv-track-menu-border-top">' : '<div>';
            if (displayMode === selfDisplayMode) {
                return chosen + '<i class="fa fa-check fa-check-shim"></i>' + lut[displayMode] + '</div>'
            } else {
                return chosen + '<i class="fa fa-check fa-check-shim fa-check-hidden"></i>' + lut[displayMode] + '</div>';
            }

        }

        return menuItems;

    };


    igv.FeatureTrack.prototype.popupMenuItemList = function(config) {
        if (this.render === renderSnp) {

            var menuItems = [], self = this;

            menuItems.push({
                name: 'Color by function',
                click: function() {
                    setColorBy('function');
                }
            });
            menuItems.push({
                name: 'Color by class',
                click: function() {
                    setColorBy('class');
                }
            });

            return menuItems;

            function setColorBy(value) {
                self.colorBy = value;
                self.trackView.update();
                config.popover.hide();
            }
        }
    };

    igv.FeatureTrack.prototype.description = function() {

        var desc;

        if('snp' === this.type) {
            desc = "<html>" + this.name + "<hr>";
            // TODO -- fill in color legened
            desc += "</html>"
            return desc;
        }
        else {
            return this.name;
        }

    }

    /**
     * @param feature
     * @param bpStart  genomic location of the left edge of the current canvas
     * @param xScale  scale in base-pairs per pixel
     * @returns {{px: number, px1: number, pw: number, h: number, py: number}}
     */
    function calculateFeatureCoordinates(feature, bpStart, xScale) {
        var px = Math.round((feature.start - bpStart) / xScale),
            px1 = Math.round((feature.end - bpStart) / xScale),
            pw = px1 - px;

        if (pw < 3) {
            pw = 3;
            px -= 1;
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
            py = this.expandedCallHeight * feature.row + 2;
        } else if (this.displayMode === "EXPANDED" && feature.row !== undefined) {
            py = this.squishedCallHeight * feature.row + 5;
        } else {  // collapsed
            py = 5;
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
        windowX1 = windowX + options.viewportContainerWidth / (options.genomicState.locusCount || 1);

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
            selectedFeatureName = igv.FeatureTrack.selectedGene ? igv.FeatureTrack.selectedGene.toUpperCase() : undefined;

        // feature outside of viewable window
        if (featureX1 < windowX || featureX > windowX1) {
            boxX = featureX;
            boxX1 = featureX1;
        } else {
            // center label within visible portion of the feature
            boxX = Math.max(featureX, windowX);
            boxX1 = Math.min(featureX1, windowX1);
        }

        if (genomicState.selection && "genes" === this.config.type && feature.name !== undefined) {
            // TODO -- for gtex, figure out a better way to do this
            geneColor = genomicState.selection.colorForGene(feature.name);
        }


        textFitsInBox = (boxX1 - boxX) > ctx.measureText(feature.name).width;

        if ((feature.name !== undefined && feature.name.toUpperCase() === selectedFeatureName) ||
            ((textFitsInBox || geneColor) && this.displayMode !== "SQUISHED" && feature.name !== undefined)) {
            geneFontStyle = {
                font: '10px PT Sans',
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

            // TODO: This is for compatibility with JuiceboxJS. The transform param is currently
            // TODO: not supported.
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
     * Monitors track drag events, updates label position to ensure that they're always visible.
     * @param track
     */
    function monitorTrackDrag(track) {
        var onDragEnd = function () {
            if (!track.trackView || !track.trackView.tile || track.displayMode === "SQUISHED") {
                return;
            }
            track.trackView.update();
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
     *
     * @param variant
     * @param bpStart  genomic location of the left edge of the current canvas
     * @param xScale  scale in base-pairs per pixel
     * @param pixelHeight  pixel height of the current canvas
     * @param ctx  the canvas 2d context
     */
    function renderVariant(variant, bpStart, xScale, pixelHeight, ctx) {

        var coord = calculateFeatureCoordinates(variant, bpStart, xScale),
            py = 20,
            h = 10,
            style;

        switch (variant.genotype) {
            case "HOMVAR":
                style = this.homvarColor;
                break;
            case "HETVAR":
                style = this.hetvarColor;
                break;
            default:
                style = this.color;
        }

        ctx.fillStyle = style;
        ctx.fillRect(coord.px, py, coord.pw, h);
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

        var coord = calculateFeatureCoordinates(feature, bpStart, xScale),
            py = 5, h = 10; // defaults borrowed from renderFeature above

        var rowHeight = (this.displayMode === "EXPANDED") ? this.squishedCallHeight : this.expandedCallHeight;

        // console.log("row height = " + rowHeight);

        if (this.displayMode === "SQUISHED" && feature.row != undefined) {
            py = rowHeight * feature.row;
        }
        else if (this.displayMode === "EXPANDED" && feature.row != undefined) {
            py = rowHeight * feature.row;
        }

        var cy = py + 0.5 * rowHeight;
        var top_y = cy - 0.5 * rowHeight;
        var bottom_y = cy + 0.5 * rowHeight;

        //igv.Canvas.strokeLine.call(ctx, coord.px, cy, coord.px1, cy); // center line for introns

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
            py = 20,
            h = 10,
            colorArrLength = this.snpColors.length,
            colorPriority;

            switch(this.colorBy) {
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
            var funcArray = theFunc.split(',');
            // possible func values
            var codingNonSynonSet = new Set(['nonsense', 'missense', 'stop-loss', 'frameshift', 'cds-indel']),
                codingSynonSet = new Set(['coding-synon']),
                spliceSiteSet = new Set(['splice-3', 'splice-5']),
                untranslatedSet = new Set(['untranslated-5', 'untranslated-3']),
                priorities;
            // locusSet = new Set(['near-gene-3', 'near-gene-5']);
            // intronSet = new Set(['intron']);

            priorities = funcArray.map(function(func) {
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

            return priorities.reduce(function(a,b) {
                return Math.max(a,b);
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
