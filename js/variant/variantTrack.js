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

    var DEFAULT_VISIBILITY_WINDOW = 100000;
    var sortDirection = "ASC";
    var strColors = ["rgb(150,150,150)", "rgb(255,0,0)", "rgb(255,255,0)", "rgb(0,0,255)", "rgb(0,255,0)", "rgb(128,0,128)"];

    igv.VariantTrack = function (config) {


        this.visibilityWindow = config.visibilityWindow === undefined ? 'compute' : config.visibilityWindow;

        igv.configTrack(this, config);

        this.displayMode = config.displayMode || "EXPANDED";    // COLLAPSED | EXPANDED | SQUISHED
        this.labelDisplayMode = config.labelDisplayMode;

        this.variantHeight = config.variantHeight || 10;
        this.squishedCallHeight = config.squishedCallHeight || 1;
        this.expandedCallHeight = config.expandedCallHeight || 10;
        this.expandedVGap = config.expandedVGap !== undefined ? config.expandedVGap : 2;
        this.squishedVGap = config.squishedVGap !== undefined ? config.squishedVGap : 1;

        this.expandedGroupGap = config.expandedGroupGap || 10;
        this.squishedGroupGap = config.squishedGroupGap || 5;

        this.featureHeight = config.featureHeight || 14;

        this.featureSource = new igv.FeatureSource(config);

        this.homrefColor = config.homrefColor || "rgb(200, 200, 200)"
        this.homvarColor = config.homvarColor || "rgb(17,248,254)";
        this.hetvarColor = config.hetvarColor || "rgb(34,12,253)";

        this.nRows = 1;  // Computed dynamically
        this.groupBy = "NONE";
    };


    igv.VariantTrack.prototype.getFileHeader = function () {
        var self = this;

        if (typeof self.featureSource.getFileHeader === "function") {

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

                        self.callSets = {};
                        self.callSetGroups = ['NONE'];
                        self.callSets.NONE = header.callSets;

                        if ('compute' === self.visibilityWindow) {
                            computeVisibilityWindow.call(self);
                        }
                    }
                    return header;

                })
        }
        else {
            return Promise.resolve(null);
        }

    }

    function getCallsetsLength() {
        var length = 0,
            callSets = this.callSets;
        Object.keys(callSets).forEach(function (key) {
            if (callSets[key]) length += callSets[key].length;
        });
        return length;
    }


    function computeVisibilityWindow() {

        if (this.callSets) {
            var length = getCallsetsLength.call(this);
            if (length < 10) {
                this.visibilityWindow = DEFAULT_VISIBILITY_WINDOW;
            }
            else {
                this.visibilityWindow = 1000 + ((2500 / length) * 40);
            }
        }
        else {
            this.visibilityWindow = DEFAULT_VISIBILITY_WINDOW;
        }

        this.featureSource.visibilityWindow = this.visibilityWindow;


    }

    igv.VariantTrack.prototype.getFeatures = function (chr, bpStart, bpEnd) {
        return this.featureSource.getFeatures(chr, bpStart, bpEnd);
    }


    /**
     * The required height in pixels required for the track content.   This is not the visible track height, which
     * can be smaller (with a scrollbar) or larger.
     *
     * @param features
     * @returns {*}
     */
    igv.VariantTrack.prototype.computePixelHeight = function (features) {

        var callSets = this.callSets,
            nCalls = callSets ? getCallsetsLength.call(this) : 0,
            callHeight = (this.displayMode === "EXPANDED" ? this.expandedCallHeight : this.squishedCallHeight),
            vGap = (this.displayMode === 'EXPANDED') ? this.expandedVGap : this.squishedVGap,
            groupGap = (this.displayMode === 'EXPANDED') ? this.expandedGroupGap : this.squishedGroupGap,
            groupsLength = Object.keys(callSets).length,
            groupSpace = (groupsLength-1) * groupGap,
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

            h = 10 + nRows * (this.variantHeight + vGap);
            this.nRows = nRows;  // Needed in draw function


            // if ((nCalls * nRows * this.expandedCallHeight) > 2000) {
            //     this.expandedCallHeight = Math.max(1, 2000 / (nCalls * nRows));
            // }

            return h + vGap + groupSpace + (nCalls - groupsLength + 1) * (callHeight + vGap);
            //return h + vGap + nCalls * nRows * (this.displayMode === "EXPANDED" ? this.expandedCallHeight : this.squishedCallHeight);

        }

    };

    igv.VariantTrack.prototype.draw = function (options) {

        var self = this,
            featureList = options.features,
            ctx = options.context,
            bpPerPixel = options.bpPerPixel,
            bpStart = options.bpStart,
            pixelWidth = options.pixelWidth,
            pixelHeight = options.pixelHeight,
            bpEnd = bpStart + pixelWidth * bpPerPixel + 1,
            callHeight = ("EXPANDED" === this.displayMode ? this.expandedCallHeight : this.squishedCallHeight),
            vGap = (this.displayMode === 'EXPANDED') ? this.expandedVGap : this.squishedVGap,
            groupGap = (this.displayMode === 'EXPANDED') ? this.expandedGroupGap : this.squishedGroupGap,
            px, px1, pw, py, h, style, i, variant, call, callSet, j, k, group, allRef, allVar, callSets, callSetGroups, nCalls,
            firstAllele, secondAllele, lowColorScale, highColorScale, period, callsDrawn, len, variantColors;

        this.variantBandHeight = 10 + this.nRows * (this.variantHeight + vGap);

        callSets = this.callSets;
        callSetGroups = this.callSetGroups;
        nCalls = getCallsetsLength.call(this);

        igv.graphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

        if (callSets && nCalls > 0 && "COLLAPSED" !== this.displayMode) {
            igv.graphics.strokeLine(ctx, 0, this.variantBandHeight, pixelWidth, this.variantBandHeight, {strokeStyle: 'rgb(224,224,224) '});
        }

        if (featureList) {

            for (i = 0, len = featureList.length; i < len; i++) {

                variant = featureList[i];
                if (variant.end < bpStart) continue;
                if (variant.start > bpEnd) break;

                py = 10 + ("COLLAPSED" === this.displayMode ? 0 : variant.row * (this.variantHeight + vGap));
                h = this.variantHeight;

                // Compute pixel width.   Minimum width is 3 pixels,  if > 5 pixels create gap between variants
                px = Math.round((variant.start - bpStart) / bpPerPixel);
                px1 = Math.round((variant.end - bpStart) / bpPerPixel);
                pw = Math.max(1, px1 - px);
                if (pw < 3) {
                    pw = 3;
                    px -= 1;
                } else if (pw > 5) {
                    px += 1;
                    pw -= 2;
                }

                if ('str' === variant.type) {
                    ctx.fillStyle = getSTRColor(variant);
                } else {
                    ctx.fillStyle = this.color;
                }
                ctx.fillRect(px, py, pw, h);


                if (nCalls > 0 && variant.calls && "COLLAPSED" !== this.displayMode) {

                    h = callHeight;

                    if ('str' === variant.type) {
                        lowColorScale = new igv.GradientColorScale(
                            {
                                low: variant.minAltLength, lowR: 135, lowG: 206,
                                lowB: 250,
                                high: variant.referenceBases.length,
                                highR: 150,
                                highG: 150,
                                highB: 150
                            }
                        );
                        highColorScale = new igv.GradientColorScale(
                            {
                                low: variant.referenceBases.length,
                                lowR: 150,
                                lowG: 150,
                                lowB: 150,
                                high: variant.maxAltLength,
                                highR: 255,
                                highG: 69,
                                highB: 0
                            }
                        );
                    }

                    callsDrawn = 0;
                    for (j = 0; j < callSetGroups.length; j++) {
                        group = callSets[callSetGroups[j]];
                        for (k = 0; k < group.length; k++) {
                            callSet = group[k];
                            call = variant.calls[callSet.id];
                            if (call) {

                                py = self.variantBandHeight + vGap + (callsDrawn + variant.row) * (h + vGap) + (j * groupGap);

                                if ('str' === variant.type) {

                                    if (!isNaN(call.genotype[0])) {
                                        firstAllele = getAlleleString(call, variant, 0);
                                        secondAllele = getAlleleString(call, variant, 1);

                                        // gradient color scheme based on allele length
                                        ctx.fillStyle = getFillColor(firstAllele);
                                        ctx.fillRect(px, py, pw, h / 2);
                                        ctx.fillStyle = getFillColor(secondAllele);
                                        ctx.fillRect(px, py + h / 2, pw, h / 2);
                                        if (self.displayMode === 'EXPANDED') {
                                            ctx.beginPath();
                                            ctx.moveTo(px, py + h / 2);
                                            ctx.lineTo(px + pw, py + h / 2);
                                            ctx.strokeStyle = '#000';
                                            ctx.stroke();
                                        }

                                    } else {
                                        ctx.strokeStyle = "#B0B0B0";
                                    }


                                } else {
                                    // Not STR -- color by zygosity

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
                                        ctx.fillStyle = this.hetvarColor;
                                    }

                                    ctx.fillRect(px, py, pw, h);
                                }
                            }
                            callsDrawn++;
                        }
                    }
                }
            }
        }
        else {
            console.log("No feature list");
        }

        function getFillColor(allele) {
            if (allele.length < variant.referenceBases.length) {
                return lowColorScale.getColor(allele.length);
            } else if (allele.length > variant.referenceBases.length) {
                return highColorScale.getColor(allele.length);
            } else {
                return "rgb(150,150,150)"; // gray for reference length
            }
        }

        function getSTRColor(variant) {

            var period, idx = 0;
            if (variant.info["PERIOD"]) {
                period = parseInt(variant.info["PERIOD"]);
                idx = Math.max(0, Math.min(period, strColors.length - 1));
            }
            return strColors[idx];

        }

    };

    function getAlleleString(call, variant, alleleNum) {
        if (alleleNum <= 0) alleleNum = 0;
        else alleleNum = 1;
        return (call.genotype[alleleNum] > 0) ? variant.alleles[call.genotype[alleleNum] - 1] : variant.referenceBases;
    }

    function sortCallSets(callSets, variant, direction) {
        var d = (direction === "DESC") ? 1 : -1;
        Object.keys(callSets).forEach(function (property) {
            callSets[property].sort(function (a, b) {
                var aNan = isNaN(variant.calls[a.id].genotype[0]);
                var bNan = isNaN(variant.calls[b.id].genotype[0]);
                if (aNan && bNan) {
                    return 0;
                } else if (aNan) {
                    return 1;
                } else if (bNan) {
                    return -1;
                } else {
                    var a0 = getAlleleString(variant.calls[a.id], variant, 0);
                    var a1 = getAlleleString(variant.calls[a.id], variant, 1);
                    var b0 = getAlleleString(variant.calls[b.id], variant, 0);
                    var b1 = getAlleleString(variant.calls[b.id], variant, 1);
                    var result = Math.max(b0.length, b1.length) - Math.max(a0.length, a1.length);
                    if (result === 0) {
                        result = Math.min(b0.length, b1.length) - Math.min(a0.length, a1.length);
                    }
                    return d * result;
                }
            });
        });
    }

    igv.VariantTrack.prototype.altClick = function (genomicLocation, referenceFrame, event) {

        var chr = referenceFrame.chrName,
            tolerance = Math.floor(2 * referenceFrame.bpPerPixel),  // We need some tolerance around genomicLocation, start with +/- 2 pixels
            featureList = this.featureSource.featureCache.queryFeatures(chr, genomicLocation - tolerance, genomicLocation + tolerance),
            self = this;

        if (this.callSets && featureList && featureList.length > 0) {

            featureList.forEach(function (variant) {


                if ((variant.start <= genomicLocation + tolerance) &&
                    (variant.end > genomicLocation - tolerance)) {
                    // var content = igv.formatPopoverText(['Ascending', 'Descending', 'Repeat Number']);
                    //igv.popover.presentContent(event.pageX, event.pageY, [$asc, $desc]);

                    sortCallSets(self.callSets, variant, sortDirection);
                    sortDirection = (sortDirection === "ASC") ? "DESC" : "ASC";
                    self.trackView.update();
                }
            });
        }
    };

    /**
     * Return "popup data" for feature @ genomic location.  Data is an array of key-value pairs
     */
    igv.VariantTrack.prototype.popupData = function (config) {

        var genomicLocation = config.genomicLocation,
            xOffset = config.x,
            yOffset = config.y,
            referenceFrame = config.viewport.genomicState.referenceFrame;

        // We use the featureCache property rather than method to avoid async load.  If the
        // feature is not already loaded this won't work,  but the user wouldn't be mousing over it either.
        if (this.featureSource.featureCache) {

            var chr = referenceFrame.chrName,
                tolerance = Math.floor(2 * referenceFrame.bpPerPixel),  // We need some tolerance around genomicLocation, start with +/- 2 pixels
                featureList = this.featureSource.featureCache.queryFeatures(chr, genomicLocation - tolerance, genomicLocation + tolerance),
                vGap = (this.displayMode === 'EXPANDED') ? this.expandedVGap : this.squishedVGap,
                groupGap = (this.displayMode === 'EXPANDED') ? this.expandedGroupGap : this.squishedGroupGap,
                popupData = [],
                self = this, group;

            if (featureList && featureList.length > 0) {

                featureList.forEach(function (variant) {

                    var row, callHeight, callSets, cs, call;

                    if ((variant.start <= genomicLocation + tolerance) &&
                        (variant.end > genomicLocation - tolerance)) {

                        if (popupData.length > 0) {
                            popupData.push('<HR>')
                        }

                        if ("COLLAPSED" == self.displayMode) {
                            Array.prototype.push.apply(popupData, variant.popupData(genomicLocation, self.type));
                        }
                        else {
                            if (yOffset <= self.variantBandHeight) {
                                // Variant
                                row = (Math.floor)((yOffset - 10 ) / (self.variantHeight + vGap));
                                if (variant.row === row) {
                                    Array.prototype.push.apply(popupData, variant.popupData(genomicLocation), self.type);
                                }
                            }
                            else {
                                // Call
                                callSets = self.callSets;
                                if (callSets && variant.calls) {
                                    callHeight = ("SQUISHED" === self.displayMode ? self.squishedCallHeight : self.expandedCallHeight);
                                    // console.log("call height: ", callHeight);
                                    // console.log("nRows: ", self.nRows);
                                    var totalCalls = 0;
                                    for (group = 0; group < self.callSetGroups.length; group++) {
                                        var groupName = self.callSetGroups[group];
                                        var groupCalls = callSets[groupName].length;
                                        if (yOffset <= self.variantBandHeight + vGap + (totalCalls + groupCalls) *
                                            (callHeight + vGap) + (group * groupGap)) {
                                            row = Math.floor((yOffset - (self.variantBandHeight + vGap + totalCalls * (callHeight + vGap)
                                                + (group * groupGap))) / (callHeight + vGap));
                                            break;
                                        }
                                        totalCalls += groupCalls;
                                    }
                                    // row = Math.floor((yOffset - self.variantBandHeight - vGap - i*groupGap) / (callHeight + vGap));
                                    if (row >= 0) {
                                        cs = callSets[groupName][row];
                                        call = variant.calls[cs.id];
                                        Array.prototype.push.apply(popupData, extractPopupData(call, variant));
                                    }
                                }
                            }
                        }
                    }
                });
            }
            return popupData;
        }
    };

    /**
     * Default popup text function
     * @param call
     * @param variant
     * @returns {Array}
     */
    function extractPopupData(call, variant) {

        var gt = '', popupData, i, allele, numRepeats = '', alleleFrac = '';

        if ('str' === variant.type) {

            var info = variant.info;
            var alt_ac = (info.AC) ? info.AC.split(',') : undefined;
            if (!isNaN(call.genotype[0])) {
                for (i = 0; i < call.genotype.length; i++) {
                    allele = getAlleleString(call, variant, i);
                    gt += allele;
                    numRepeats += (allele.length / info.PERIOD).toString();
                    var ac = (call.genotype[i] === 0) ? info.REFAC : alt_ac[call.genotype[i] - 1];
                    alleleFrac += (parseInt(ac) / parseInt(info.AN)).toFixed(3);
                    if (i < call.genotype.length - 1) {
                        gt += " | ";
                        numRepeats += " | ";
                        alleleFrac += " | ";
                    }
                }
            }
        } else {

            // Not STR

            call.genotype.forEach(function (i) {
                if (i === 0) {
                    gt += variant.referenceBases;
                }
                else {
                    gt += variant.alternateBases[i - 1];
                }
            });
        }

        popupData = [];

        if (call.callSetName !== undefined) {
            popupData.push({name: 'Name', value: call.callSetName});
        }
        popupData.push({name: 'Genotype', value: gt});
        if (numRepeats) {
            popupData.push({name: 'Repeats', value: numRepeats});
        }
        if (alleleFrac) {
            popupData.push({name: 'Allele Fraction', value: alleleFrac});
        }
        if (call.phaseset !== undefined) {
            popupData.push({name: 'Phase set', value: call.phaseset});
        }
        if (call.genotypeLikelihood !== undefined) {
            popupData.push({name: 'genotypeLikelihood', value: call.genotypeLikelihood.toString()});
        }

        var attr = igv.sampleInformation.getAttributes(call.callSetName);
        if (attr) {
            Object.keys(attr).forEach(function (attrName) {
                var displayText = attrName.replace(/([A-Z])/g, " $1");
                displayText = displayText.charAt(0).toUpperCase() + displayText.slice(1);
                popupData.push({name: displayText, value: attr[attrName]});
            });
        }

        var infoKeys = Object.keys(call.info);
        if (infoKeys.length) {
            popupData.push("<hr>");
        }
        infoKeys.forEach(function (key) {
            popupData.push({name: key, value: call.info[key]});
        });

        return popupData;
    }

    igv.VariantTrack.prototype.popupMenuItemList = function (config) {
        var menuItems = [];
        var self = this;

        if (this.groupBy !== 'NONE' && igv.sampleInformation.hasAttributes()) {
            menuItems.push({
                name: 'Sort groups',
                click: function () {
                    try {
                        self.callSetGroups.sort(function (a, b) {
                            return a - b;
                        });
                    } catch (err) {
                        self.callSetGroups.sort();
                    }
                    self.trackView.update();
                    config.popover.hide();
                }
            })
        }


        var referenceFrame = config.viewport.genomicState.referenceFrame,
            genomicLocation = config.genomicLocation,
            chr = referenceFrame.chrName,
            tolerance = Math.floor(2 * referenceFrame.bpPerPixel),  // We need some tolerance around genomicLocation, start with +/- 2 pixels
            featureList = this.featureSource.featureCache.queryFeatures(chr, genomicLocation - tolerance, genomicLocation + tolerance);

        if (this.callSets && featureList && featureList.length > 0) {

            featureList.forEach(function (variant) {


                if ((variant.start <= genomicLocation + tolerance) &&  (variant.end > genomicLocation - tolerance)) {

                    if ('str' === variant.type) {

                        menuItems.push({
                            name: 'Sort by allele length',
                            click: function () {
                                sortCallSets(self.callSets, variant, sortDirection);
                                sortDirection = (sortDirection === "ASC") ? "DESC" : "ASC";
                                self.trackView.update();
                                config.popover.hide();
                            }
                        });

                    }
                }
            });
        }

        return menuItems;

    };

    igv.VariantTrack.prototype.groupCallSets = function (attribute) {

        var self = this,
            groupedCallSets = {},
            callSetGroups = [],
            group, attr, key;

        Object.keys(this.callSets).forEach(function (i) {

            group = self.callSets[i];
            group.forEach(function (callSet) {

                key = 'NONE';

                if (attribute !== 'NONE') {
                    attr = igv.sampleInformation.getAttributes(callSet.name);
                    if (attr && attr[attribute]) {
                        key = attr[attribute];
                    }
                }

                if (!groupedCallSets.hasOwnProperty(key)) {
                    groupedCallSets[key] = [];
                    callSetGroups.push(key);
                }

                groupedCallSets[key].push(callSet);
            })
        });

        // group families in order: father, mother, then children
        if ("familyId" === attribute) {
            Object.keys(groupedCallSets).forEach(function (i) {
                group = groupedCallSets[i];
                group.sort(function (a, b) {
                    var attrA = igv.sampleInformation.getAttributes(a.name);
                    var attrB = igv.sampleInformation.getAttributes(b.name);
                    if (attrA["fatherId"] === "0" && attrA["motherId"] === "0") {
                        if (attrB["fatherId"] === "0" && attrB["motherId"] === "0") {
                            if (attrA["sex"] === "1") {
                                if (attrB["sex"] === "1") {
                                    return 0;
                                } else {
                                    return -1;
                                }
                            } else if (attrB["sex"] === "1") {
                                return 1;
                            } else {
                                return parseInt(attrB["sex"]) - parseInt(attrA["sex"]);
                            }
                        } else {
                            return -1;
                        }
                    } else if (attrB["fatherId"] === "0" && attrB["motherId"] === "0") {
                        return 1;
                    } else {
                        if (attrA["sex"] === "1") {
                            if (attrB["sex"] === "1") {
                                return 0;
                            } else {
                                return -1;
                            }
                        } else if (attrB["sex"] === "1") {
                            return 1;
                        } else {
                            return parseInt(attrB["sex"]) - parseInt(attrA["sex"]);
                        }
                    }
                });
            });
        }

        this.callSets = groupedCallSets;
        this.callSetGroups = callSetGroups;
        this.groupBy = attribute;
        this.trackView.update();
    };

    igv.VariantTrack.prototype.menuItemList = function (popover) {

        var self = this,
            menuItems = [],
            mapped;

        mapped = ["COLLAPSED", "SQUISHED", "EXPANDED"].map(function (displayMode, index) {

            return {

                object: $(displayModeMarkup(index, displayMode, self.displayMode)),
                click: function () {
                    popover.hide();
                    self.displayMode = displayMode;
                    self.trackView.update();
                }
            };
        });

        menuItems = menuItems.concat(mapped);

        if (igv.sampleInformation.hasAttributes()) {
            var $groupBy = {
                object: $('<div class="igv-track-menu-border-top">Group By:</div>')
            };

            menuItems.push($groupBy);

            var attrs = {};
            var attributes = igv.sampleInformation.getAttributeNames();

            attributes.forEach(function (attribute) {
                var result = attribute.replace(/([A-Z])/g, " $1");
                result = result.charAt(0).toUpperCase() + result.slice(1);
                attrs[attribute] = result;
            });

            attributes.push("NONE");
            attrs.NONE = 'None';

            var mappedAttrs = _.map(attributes, function (attr, index) {
                return {
                    object: $(groupByMarkup(attr, self.groupBy, attrs)),
                    click: function () {
                        popover.hide();
                        self.groupCallSets(attr);
                    }
                }
            });

            menuItems = menuItems.concat(mappedAttrs);
        }

        function groupByMarkup(buttonVal, selfVal, lut) {
            
            if (buttonVal === selfVal) {
                return '<div><i class="fa fa-check fa-check-shim"></i>' + lut[buttonVal] + '</div>'
            } else {
                return '<div><i class="fa fa-check fa-check-shim fa-check-hidden"></i>' + lut[buttonVal] + '</div>';
            }
        }

        function displayModeMarkup(index, displayMode, selfDisplayMode) {

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

    return igv;

})
(igv || {});
