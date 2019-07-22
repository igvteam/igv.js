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

    "use strict";

    const DEFAULT_VISIBILITY_WINDOW = 1000000;
    const MAX_PIXEL_HEIGHT = 30000;
    const strColors = ["rgb(150,150,150)", "rgb(255,0,0)", "rgb(255,255,0)", "rgb(0,0,255)", "rgb(0,255,0)", "rgb(128,0,128)"];

    const type = "variant";

    let VariantTrack;

    if (!igv.trackFactory) {
        igv.trackFactory = {};
    }

    igv.trackFactory[type] = function (config, browser) {

        if (!VariantTrack) {
            defineClass();
        }

        return new VariantTrack(config, browser);
    }


    function defineClass() {

        VariantTrack = igv.extend(igv.TrackBase,

            function (config, browser) {

                this.type = type;

                this.visibilityWindow = config.visibilityWindow;

                igv.TrackBase.call(this, config, browser);

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
                this.visibilityWindow = config.visibilityWindow;

                this.featureSource = new igv.FeatureSource(config, browser.genome);

                this.homrefColor = config.homrefColor || "rgb(200, 200, 200)"
                this.homvarColor = config.homvarColor || "rgb(17,248,254)";
                this.hetvarColor = config.hetvarColor || "rgb(34,12,253)";

                this.sortDirection = "ASC";

                this.nRows = 1;  // Computed dynamically
                this.groupBy = "None";
            });

        VariantTrack.prototype.postInit = async function () {

            const header = await this.getFileHeader();   // cricital, don't remove
            if (this.callSets) {
                const length = this.callSets.length;
                this.visibilityWindow = Math.max(100, DEFAULT_VISIBILITY_WINDOW - length * (DEFAULT_VISIBILITY_WINDOW / 100));

            }
            else {
                this.visibilityWindow = DEFAULT_VISIBILITY_WINDOW;
            }
            return this;

        }

        VariantTrack.prototype.getFileHeader = async function () {

            if (this.header) {
                return this.header;
            }
            else if (typeof this.featureSource.getFileHeader === "function") {

                const header = await this.featureSource.getFileHeader()
                if (header) {

                    // Header (from track line).  Set properties,unless set in the config (config takes precedence)
                    if (header.name && !this.config.name) {
                        this.name = header.name;
                    }
                    if (header.color && !this.config.color) {
                        this.color = "rgb(" + header.color + ")";
                    }

                    this.callSets = header.callSets;
                    this.callSetGroups = ['None'];
                    this.callSets.None = header.callSets;

                }
                this.header = header;
                return header;
            }

            else {
                return undefined;
            }

        }

        VariantTrack.prototype.getCallsetsLength = function () {
            return this.callSets.length;
        }

        VariantTrack.prototype.getFeatures = async function (chr, bpStart, bpEnd) {

            if (this.header === undefined) {
                this.header = await this.getFileHeader();
            }
            return this.featureSource.getFeatures(chr, bpStart, bpEnd, this.visibilityWindow);

        }


        /**
         * The required height in pixels required for the track content.   This is not the visible track height, which
         * can be smaller (with a scrollbar) or larger.
         *
         * @param features
         * @returns {*}
         */
        VariantTrack.prototype.computePixelHeight = function (features) {

            const callSets = this.callSets;
            const nCalls = callSets ? this.getCallsetsLength() : 0;

            // Adjust call height if required for max canvas size.
            if (nCalls > 0) {
                let maxCallHeight = MAX_PIXEL_HEIGHT / nCalls;
                this.squishedCallHeight = Math.min(this.squishedCallHeight, maxCallHeight);
                this.expandedCallHeight = Math.min(this.expandedCallHeight, maxCallHeight);
            }


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
                const vGap = (this.displayMode === 'EXPANDED') ? this.expandedVGap : this.squishedVGap;
                const nRows = maxRow + 1;
                const h = 10 + nRows * (this.variantHeight + vGap);
                this.nRows = nRows;  // Needed in draw function

                const groupsLength = Object.keys(callSets).length;
                const groupGap = (this.displayMode === 'EXPANDED') ? this.expandedGroupGap : this.squishedGroupGap;
                const groupSpace = (groupsLength - 1) * groupGap;
                const callHeight = (this.displayMode === "EXPANDED" ? this.expandedCallHeight : this.squishedCallHeight);
                return h + vGap + groupSpace + (nCalls + 1) * (callHeight + vGap);

            }

        };

        VariantTrack.prototype.draw = function (options) {

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
                px, px1, pw, py, h, style, i, variant, call, callSet, j, k, group, allRef, allVar, callSets,
                callSetGroups, nCalls,
                firstAllele, secondAllele, lowColorScale, highColorScale, period, callsDrawn, len, variantColors;

            this.variantBandHeight = 10 + this.nRows * (this.variantHeight + vGap);

            callSets = this.callSets;
            callSetGroups = this.callSetGroups;
            nCalls = this.getCallsetsLength();

            igv.graphics.fillRect(ctx, 0, options.pixelTop, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

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

        /**
         * Return "popup data" for feature @ genomic location.  Data is an array of key-value pairs
         */
        VariantTrack.prototype.popupData = function (clickState, featureList) {

            if (!featureList) featureList = this.clickedFeatures(clickState);

            const genomicLocation = clickState.genomicLocation
            const genomeID = this.browser.genome.id
            const popupData = []

            for (let variant of featureList) {

                //var row, callHeight, callSets, callSetGroups, cs, call;

                if (popupData.length > 0) {
                    popupData.push('<HR>')
                }

                if ("COLLAPSED" == self.displayMode) {
                    Array.prototype.push.apply(popupData, variant.popupData(genomicLocation, this.type));
                }

                else {
                    const yOffset = clickState.y
                    const vGap = (this.displayMode === 'EXPANDED') ? this.expandedVGap : this.squishedVGap
                    const groupGap = (this.displayMode === 'EXPANDED') ? this.expandedGroupGap : this.squishedGroupGap

                    if (yOffset <= this.variantBandHeight) {  // Variant
                        const row = (Math.floor)((yOffset - 10) / (this.variantHeight + vGap));
                        if (variant.row === row) {
                            Array.prototype.push.apply(popupData, variant.popupData(genomicLocation, genomeID), this.type);
                        }
                    }
                    else { // Genotype
                        const callSets =  this.callSets;
                        const callSetGroups = this.callSetGroups;

                        if (callSets && variant.calls) {

                            const callHeight = ("SQUISHED" === this.displayMode ? this.squishedCallHeight : this.expandedCallHeight);
                            var totalCalls = 0;

                            let row
                            for (let group = 0; group < callSetGroups.length; group++) {
                                var groupName = callSetGroups[group];
                                var groupCalls = callSets[groupName].length;
                                if (yOffset <= this.variantBandHeight + vGap + (totalCalls + groupCalls) *
                                    (callHeight + vGap) + (group * groupGap)) {
                                    row = Math.floor((yOffset - (this.variantBandHeight + vGap + totalCalls * (callHeight + vGap)
                                        + (group * groupGap))) / (callHeight + vGap));
                                    break;
                                }
                                totalCalls += groupCalls;
                            }

                            if (row >= 0) {
                                const cs = callSets[groupName][row];
                                const call = variant.calls[cs.id];
                                Array.prototype.push.apply(popupData, extractGenotypePopupData(call, variant, genomeID));
                            }
                        }
                    }
                }

            }

            return popupData;

        };

        /**
         * Genotype popup text.
         * @param call
         * @param variant
         * @returns {Array}
         */
        function extractGenotypePopupData(call, variant, genomeId) {

            var gt = '', popupData, i, allele, numRepeats = '', alleleFrac = '';
            let cravatLinks = [];
            popupData = [];

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
                let ref = variant.referenceBases;
                call.genotype.forEach(function (i) {
                    if (i === 0) {
                        gt += variant.referenceBases;
                    }
                    else {
                        let alt = variant.alternateBases[i - 1];
                        gt += alt;
                    }
                });
            }


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

            if (cravatLinks.length > 0) {
                popupData.push("<HR/>");
                popupData = popupData.concat(cravatLinks);
            }

            return popupData;
        }

        VariantTrack.prototype.contextMenuItemList = function (clickState) {

            const self = this;
            const menuItems = [];

            if (this.groupBy !== 'None' && igv.sampleInformation.hasAttributes()) {
                menuItems.push({
                    label: 'Sort groups',
                    click: function () {
                        try {
                            self.callSetGroups.sort(function (a, b) {
                                return a - b;
                            });
                        } catch (err) {
                            self.callSetGroups.sort();
                        }
                        self.trackView.repaintViews();
                    }
                })
            }

            const featureList = this.clickedFeatures(clickState);

            if (this.callSets && featureList && featureList.length > 0) {

                featureList.forEach(function (variant) {

                    if ('str' === variant.type) {

                        menuItems.push({
                            label: 'Sort by allele length',
                            click: function () {
                                sortCallSetsByAlleleLength(self.callSets, variant, self.sortDirection);
                                self.sortDirection = (self.sortDirection === "ASC") ? "DESC" : "ASC";
                                self.trackView.repaintViews();
                            }
                        });

                    }

                });
            }


            function sortCallSetsByAlleleLength(callSets, variant, direction) {
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


            return menuItems;

        };

        VariantTrack.prototype.groupCallSets = function (attribute) {

            var callSetResults = createGroups(attribute, this.callSets);
            this.callSets = callSetResults[0];
            this.callSetGroups = callSetResults[1];

            this.groupBy = attribute;
            this.trackView.repaintViews();

            function createGroups(attribute, callSets) {
                var groupedCallSets = {}, callSetGroups = [], group, attr, key,
                    result = [];
                Object.keys(callSets).forEach(function (i) {

                    group = callSets[i];
                    group.forEach(function (callSet) {

                        key = 'None';

                        if (attribute !== 'None') {
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

                result.push(groupedCallSets);
                result.push(callSetGroups);
                return result;
            }
        };



        VariantTrack.prototype.menuItemList = function () {

            var self = this,
                menuItems = [],
                mapped;


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
                        object: igv.createCheckbox(lut[displayMode], displayMode === self.displayMode),
                        click: function () {
                            self.displayMode = displayMode;
                            self.trackView.repaintViews();
                        }
                    });
            });


            if (igv.sampleInformation.hasAttributes()) {

                menuItems.push({object: $('<div class="igv-track-menu-border-top">')});

                var attributes = igv.sampleInformation.getAttributeNames();

                attributes.push("None");

                attributes.forEach(function (attribute) {
                    // var label = attribute.replace(/([A-Z])/g, " $1");
                    var label = attribute.charAt(0).toUpperCase() + attribute.slice(1);
                    menuItems.push({
                        object: igv.createCheckbox(label, attribute === self.groupBy),
                        click: function () {
                            self.groupCallSets(attribute);
                        }
                    });
                });
            }

            // if (igv.sampleInformation.getAttributeNames().indexOf("familyId") !== -1) {
            //     menuItems.push(igv.trackMenuItem(this.trackView, "Filter by Family ID", "Family IDs", this.filters.join(","),
            //         function () {
            //             var value;
            //
            //             value = self.trackView.browser.inputDialog.$input.val().trim();
            //
            //             if (undefined !== value) {
            //                 self.filterByFamily(value);
            //                 self.trackView.repaintViews();
            //             }
            //
            //         }, true));
            // }

            return menuItems;

        };
    }

    return igv;

})
(igv || {});