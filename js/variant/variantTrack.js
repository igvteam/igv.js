/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016 University of California San Diego
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

/**
 * Created by jrobinson on 4/15/16.
 */

var igv = (function (igv) {

    igv.VariantTrack = function (config) {

        igv.configTrack(this, config);

        this.displayMode = config.displayMode || "COLLAPSED";    // COLLAPSED | EXPANDED | SQUISHED
        this.labelDisplayMode = config.labelDisplayMode;

        this.variantHeight = config.variantHeight || 10;
        this.squishedCallHeight = config.squishedCallHeight || 1;
        this.expandedCallHeight = config.expandedCallHeight || 10;

        this.featureHeight = config.featureHeight || 14;

        this.featureSource = new igv.FeatureSource(config);

        this.homrefColor = "rgb(200, 200, 200)"
        this.homvarColor = "rgb(17,248,254)";
        this.hetColor = "rgb(34,12,253)";


        this.nRows = 1;  // Computed dynamically

    };

    igv.VariantTrack.prototype.getFileHeader = function () {
        var self = this;
        return new Promise(function (fulfill, reject) {
            if (typeof self.featureSource.getFileHeader === "function") {
                self.featureSource.getFileHeader().then(function (header) {

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

                }).catch(reject);
            }
            else {
                fulfill(null);
            }
        });
    }

    igv.VariantTrack.prototype.getFeatures = function (chr, bpStart, bpEnd) {

        var self = this;

        return new Promise(function (fulfill, reject) {

            self.featureSource.getFeatures(chr, bpStart, bpEnd).then(function (features) {
                fulfill(features);
            }).catch(reject);

        });
    }

    // TODO -- refactor this, its pretty awful
    function getCallSets() {
        return this.featureSource.reader.callSets;
    }


    /**
     * The required height in pixels required for the track content.   This is not the visible track height, which
     * can be smaller (with a scrollbar) or larger.
     *
     * @param features
     * @returns {*}
     */
    igv.VariantTrack.prototype.computePixelHeight = function (features) {

        var callSets = getCallSets.call(this),
            nCalls = callSets ? callSets.length : 0,
            nRows,
            h;

        if (this.displayMode === "COLLAPSED") {
            this.nRows = 1;
            return 10 + this.variantHeight;
        }
        else {
            var maxRow = 0;
            if (features && (typeof features.forEach === "function")) {
                features.forEach(function (feature) {
                    if (feature.row && feature.row > maxRow) maxRow = feature.row;

                });
            }
            nRows = maxRow + 1;

            h = 10 + nRows * this.variantHeight;
            this.nRows = nRows;  // Needed in draw function


            if ((nCalls * nRows * this.expandedCallHeight) > 2000) {
                this.expandedCallHeight = Math.max(1, 2000 / (nCalls * nRows));
            }


            return h + nCalls * nRows * (this.displayMode === "EXPANDED" ? this.expandedCallHeight : this.squishedCallHeight);

        }

    };

    igv.VariantTrack.prototype.draw = function (options) {

        var track = this,
            featureList = options.features,
            ctx = options.context,
            bpPerPixel = options.bpPerPixel,
            bpStart = options.bpStart,
            pixelWidth = options.pixelWidth,
            pixelHeight = options.pixelHeight,
            bpEnd = bpStart + pixelWidth * bpPerPixel + 1,
            variantBandHeight = 10 + (this.nRows * this.variantHeight),
            callHeight = ("EXPANDED" === this.displayMode ? this.expandedCallHeight : this.squishedCallHeight),
            px, px1, pw, py, h, style, i, variant, call, callSet, j, allRef, allVar;

        callSets = getCallSets.call(this);

        igv.graphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

        if (callSets && callSets.length > 0 && "COLLAPSED" !== this.displayMode) {
            igv.graphics.strokeLine(ctx, 0, variantBandHeight, pixelWidth, variantBandHeight, {strokeStyle: 'gray'});
        }

        if (featureList) {
            for (i = 0, len = featureList.length; i < len; i++) {
                variant = featureList[i];
                if (variant.end < bpStart) continue;
                if (variant.start > bpEnd) break;

                py = 10 + ("COLLAPSED" === this.displayMode ? 0 : variant.row * this.variantHeight);
                h = this.variantHeight;

                px = Math.round((variant.start - bpStart) / bpPerPixel);
                px1 = Math.round((variant.end - bpStart) / bpPerPixel);
                pw = Math.max(1, px1 - px);
                if (pw < 3) {
                    pw = 3;
                    px -= 1;
                }

                ctx.fillStyle = this.color;
                ctx.fillRect(px, py, pw, h);


                if (callSets && variant.calls && "COLLAPSED" !== this.displayMode) {

                    for (j = 0; j < callSets.length; j++) {
                        callSet = callSets[j];
                        call = variant.calls[callSet.id];
                        if (call) {

                            // Determine genotype
                            allVar = allRef = true;  // until proven otherwise
                            call.genotype.forEach(function (g) {
                                if (g != 0) allRef = false;
                                if (g == 0) allVar = false;
                            });

                            if (allRef) {
                                ctx.fillStyle = this.homrefColor;
                            } else if (allVar) {
                                ctx.fillStyle = this.homvarColor;
                            } else {
                                ctx.fillStyle = this.hetColor;
                            }

                            py = variantBandHeight + (j + variant.row) * callHeight;
                            ctx.fillRect(px, py, pw, h);
                        }
                    }
                }
            }
        }
        else {
            console.log("No feature list");
        }

    };

    /**
     * Return "popup data" for feature @ genomic location.  Data is an array of key-value pairs
     */
    igv.VariantTrack.prototype.popupData = function (genomicLocation, xOffset, yOffset) {

        // We use the featureCache property rather than method to avoid async load.  If the
        // feature is not already loaded this won't work,  but the user wouldn't be mousing over it either.
        if (this.featureSource.featureCache) {

            var chr = igv.browser.referenceFrame.chr,  // TODO -- this should be passed in
                tolerance = 2 * igv.browser.referenceFrame.bpPerPixel,  // We need some tolerance around genomicLocation, start with +/- 2 pixels
                featureList = this.featureSource.featureCache.queryFeatures(chr, genomicLocation - tolerance, genomicLocation + tolerance),
                row;

            if (this.displayMode != "COLLAPSED") {
                row = (Math.floor)(this.displayMode === "SQUISHED" ? yOffset / this.expandedCallHeight : yOffset / this.squishedCallHeight);
            }

            if (featureList && featureList.length > 0) {


                var popupData = [];
                featureList.forEach(function (feature) {
                    if (feature.end >= genomicLocation - tolerance &&
                        feature.start <= genomicLocation + tolerance) {

                        // If row number is specified use it
                        if (row === undefined || feature.row === undefined || row === feature.row) {
                            var featureData
                            if (feature.popupData) {
                                featureData = feature.popupData(genomicLocation);
                            }
                            else {
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

    igv.VariantTrack.prototype.popupMenuItems = function (popover) {

        var myself = this,
            menuItems = [],
            lut = {"COLLAPSED": "Collapse", "SQUISHED": "Squish", "EXPANDED": "Expand"},
            checkMark = '<i class="fa fa-check fa-check-shim"></i>',
            checkMarkNone = '<i class="fa fa-check fa-check-shim fa-check-hidden"></i>',
            trackMenuItem = '<div class=\"igv-track-menu-item\">',
            trackMenuItemFirst = '<div class=\"igv-track-menu-item igv-track-menu-border-top\">';

        menuItems.push(igv.colorPickerMenuItem(popover, this.trackView));

        ["COLLAPSED", "SQUISHED", "EXPANDED"].forEach(function (displayMode, index) {

            var chosen,
                str;

            chosen = (0 === index) ? trackMenuItemFirst : trackMenuItem;
            str = (displayMode === myself.displayMode) ? chosen + checkMark + lut[displayMode] + '</div>' : chosen + checkMarkNone + lut[displayMode] + '</div>';

            menuItems.push({
                object: $(str),
                click: function () {
                    popover.hide();
                    myself.displayMode = displayMode;
                    myself.trackView.update();
                }
            });

        });

        return menuItems;

    };


    return igv;

})
(igv || {});
