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

import $ from "../vendor/jquery-3.3.1.slim.js";
import FeatureSource from '../feature/featureSource.js';
import TrackBase from "../trackBase.js";
import IGVGraphics from "../igv-canvas.js";
import {createCheckbox} from "../igv-icons.js";
import {StringUtils} from "../../node_modules/igv-utils/src/index.js";
import {PaletteColorTable, ColorTable} from "../util/colorPalletes.js";

const isString = StringUtils.isString;


const DEFAULT_VISIBILITY_WINDOW = 1000000;
const TOP_MARGIN = 10;

class VariantTrack extends TrackBase {

    constructor(config, browser) {
        super(config, browser);
    }

    init(config) {

        super.init(config);

        this.visibilityWindow = config.visibilityWindow;
        this.displayMode = config.displayMode || "EXPANDED";    // COLLAPSED | EXPANDED | SQUISHED
        this.labelDisplayMode = config.labelDisplayMode;
        this.expandedVariantHeight = config.expandedVariantHeight || config.variantHeight || 10;
        this.squishedVariantHeight = config.squishedVariantHeight || 2;
        this.squishedCallHeight = config.squishedCallHeight || 1;
        this.expandedCallHeight = config.expandedCallHeight || 10;
        this.expandedVGap = config.expandedVGap !== undefined ? config.expandedVGap : 2;
        this.squishedVGap = config.squishedVGap !== undefined ? config.squishedVGap : 1;
        this.expandedGroupGap = config.expandedGroupGap || 10;
        this.squishedGroupGap = config.squishedGroupGap || 5;
        this.featureHeight = config.featureHeight || 14;
        this.visibilityWindow = config.visibilityWindow;
        this.featureSource = FeatureSource(config, this.browser.genome);
        this.noGenotypeColor = config.noGenotypeColor || "rgb(200,180,180)"
        this.noCallColor = config.noCallColor || "rgb(225, 225, 225)";
        this.nonRefColor = config.nonRefColor || "rgb(200, 200, 215)";
        this.mixedColor = config.mixedColor || "rgb(200, 220, 200)";
        this.homrefColor = config.homrefColor || "rgb(200, 200, 200)";
        this.homvarColor = config.homvarColor || "rgb(17,248,254)";
        this.hetvarColor = config.hetvarColor || "rgb(34,12,253)";
        this.sortDirection = "ASC";
        this.type = config.type || "variant"
        this.variantColorBy = config.variantColorBy;   // Can be undefined => default
        this._color = config.color;
        this.showGenotypes = config.showGenotypes === undefined ? true : config.showGenotypes;

        // The number of variant rows are computed dynamically, but start with "1" by default
        this.variantRowCount(1);

    }

    async postInit() {

        this.header = await this.getHeader();   // cricital, don't remove'
        if (undefined === this.visibilityWindow && this.config.indexed !== false) {
            const fn = this.config.url instanceof File ? this.config.url.name : this.config.url;
            if (isString(fn) && fn.toLowerCase().includes("gnomad")) {
                this.visibilityWindow = 1000;  // these are known to be very dense
            } else if (this.callSets) {
                const length = this.callSets.length;
                this.visibilityWindow = Math.max(1000, DEFAULT_VISIBILITY_WINDOW - length * (DEFAULT_VISIBILITY_WINDOW / 100));
            } else {
                this.visibilityWindow = DEFAULT_VISIBILITY_WINDOW;
            }
        }
        return this;

    }

    supportsWholeGenome() {
        return this.config.indexed === false && this.config.supportsWholeGenome !== false
    }

    get color() {
        return this._color;
    }

    set color(c) {
        this._color = c;
        this.variantColorBy = undefined;
    }

    async getHeader() {

        if (!this.header) {
            if (typeof this.featureSource.getHeader === "function") {
                const header = await this.featureSource.getHeader()
                if (header) {
                    this.callSets = header.callSets || [];
                }
                this.header = header;
            }
            this.sampleNames = this.callSets ? this.callSets.map(cs => cs.name) : [];
        }

        return this.header;
    }

    getCallsetsLength() {
        return this.callSets.length;
    }

    async getFeatures(chr, start, end, bpPerPixel) {

        if (this.header === undefined) {
            this.header = await this.getHeader();
        }
        return this.featureSource.getFeatures({chr, start, end, bpPerPixel, visibilityWindow: this.visibilityWindow});
    }

    hasSamples() {
        return this.getCallsetsLength() > 0;
    }

    getSamples() {
        return {
            yOffset: this.sampleYOffset,
            names: this.sampleNames,
            height: this.sampleHeight
        }
    }

    /**
     * The required height in pixels required for the track content.   This is not the visible track height, which
     * can be smaller (with a scrollbar) or larger.
     *
     * @param features
     * @returns {*}
     */
    computePixelHeight(features) {

        if (!features || features.length == 0) return TOP_MARGIN;

        const nVariantRows = (this.displayMode === "COLLAPSED") ? 1 : this.nVariantRows;
        const vGap = (this.displayMode === "SQUISHED") ? this.squishedVGap : this.expandedVGap;
        const variantHeight = (this.displayMode === "SQUISHED") ? this.squishedVariantHeight : this.expandedVariantHeight;
        const callHeight = (this.displayMode === "SQUISHED") ? this.squishedCallHeight : this.expandedCallHeight;
        const nCalls = this.showGenotypes === false ? 0 : this.getCallsetsLength() * nVariantRows;
        const h = TOP_MARGIN + nVariantRows * (variantHeight + vGap);
        return h + vGap + (nCalls + 1) * (callHeight + vGap);

    }

    variantRowCount(count) {
        this.nVariantRows = count;
    }

    draw({context, pixelWidth, pixelHeight, bpPerPixel, bpStart, pixelTop, features}) {

        IGVGraphics.fillRect(context, 0, pixelTop, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

        const vGap = ("SQUISHED" === this.displayMode) ? this.squishedVGap : this.expandedVGap;
        const rc = ("COLLAPSED" === this.displayMode) ? 1 : this.nVariantRows;
        const variantHeight = ("SQUISHED" === this.displayMode) ? this.squishedVariantHeight : this.expandedVariantHeight;
        this.variantBandHeight = TOP_MARGIN + rc * (variantHeight + vGap);

        const callSets = this.callSets;
        const nCalls = this.getCallsetsLength();
        if (callSets && nCalls > 0 && this.showGenotypes !== false) {
            IGVGraphics.strokeLine(context, 0, this.variantBandHeight, pixelWidth, this.variantBandHeight, {strokeStyle: 'rgb(224,224,224) '});
        }

        if (features) {

            const callHeight = ("SQUISHED" === this.displayMode) ? this.squishedCallHeight : this.expandedCallHeight;
            const vGap = ("SQUISHED" === this.displayMode) ? this.squishedVGap : this.expandedVGap;
            const bpEnd = bpStart + pixelWidth * bpPerPixel + 1;

            // Loop through variants.  A variant == a row in a VCF file
            for (let variant of features) {

                if (variant.end < bpStart) continue;
                if (variant.start > bpEnd) break;

                const variantHeight = ("SQUISHED" === this.displayMode) ? this.squishedVariantHeight : this.expandedVariantHeight;
                const y = TOP_MARGIN + ("COLLAPSED" === this.displayMode ? 0 : variant.row * (variantHeight + vGap));
                const h = variantHeight;

                // Compute pixel width.   Minimum width is 3 pixels,  if > 5 pixels create gap between variants
                let x = Math.round((variant.start - bpStart) / bpPerPixel);
                let x1 = Math.round((variant.end - bpStart) / bpPerPixel);
                let w = Math.max(1, x1 - x);
                if (w < 3) {
                    w = 3;
                    x -= 1;
                } else if (w > 5) {
                    x += 1;
                    w -= 2;
                }
                context.fillStyle = this.getVariantColor(variant);
                context.fillRect(x, y, w, h)
                variant.pixelRect = {x, y, w, h}

                // Loop though the calls for this variant.  There will potentially be a call for each sample.
                if (nCalls > 0 && this.showGenotypes !== false) {

                    const nVariantRows = "COLLAPSED" === this.displayMode ? 1 : this.nVariantRows;
                    this.sampleYOffset = this.variantBandHeight + vGap;
                    this.sampleHeight = nVariantRows * (callHeight + vGap);  // For each sample, there is a call for each variant at this position

                    let sampleNumber = 0;
                    for (let callSet of callSets) {
                        const call = variant.calls[callSet.id];
                        if (call) {
                            const row = "COLLAPSED" === this.displayMode ? 0 : variant.row;
                            const py = this.sampleYOffset + sampleNumber * this.sampleHeight + row * (callHeight + vGap);
                            let allVar = true;  // until proven otherwise
                            let allRef = true;
                            let noCall = false;

                            if (call.genotype) {
                                for (let g of call.genotype) {
                                    if ('.' === g) {
                                        noCall = true;
                                        break;
                                    } else {
                                        if (g !== 0) allRef = false;
                                        if (g === 0) allVar = false;
                                    }
                                }
                            }

                            if (!call.genotype) {
                                context.fillStyle = this.noGenotypeColor;
                            } else if (noCall) {
                                context.fillStyle = this.noCallColor;
                            } else if (allRef) {
                                context.fillStyle = this.homrefColor;
                            } else if (allVar) {
                                context.fillStyle = this.homvarColor;
                            } else {
                                context.fillStyle = this.hetvarColor;
                            }

                            context.fillRect(x, py, w, callHeight)

                            callSet.pixelRect = {x, y: py, w, h: callHeight}
                        }
                        sampleNumber++;
                    }

                }
            }

        } else {
            console.log("No feature list");
        }
    };

    getVariantColor(variant) {

        let variantColor;

        if (this.variantColorBy) {
            const value = variant.info[this.variantColorBy];
            if (value) {
                return getVariantColorTable(this.variantColorBy).getColor(value);
            } else {
                return "gray";
            }
        } else if ("NONVARIANT" === variant.type) {
            variantColor = this.nonRefColor;
        } else if ("MIXED" === variant.type) {
            variantColor = this.mixedColor;
        } else if (this._color) {
            variantColor = (typeof this._color === "function") ? this._color(variant) : this._color;
        } else {
            variantColor = this.defaultColor;
        }
        return variantColor;
    }

    /**
     * Return "popup data" for feature @ genomic location.  Data is an array of key-value pairs
     */
    popupData(clickState, featureList) {

        featureList = this.clickedFeatures(clickState, featureList);

        const genomicLocation = clickState.genomicLocation
        const genomeID = this.browser.genome.id
        const sampleInformation = this.browser.sampleInformation;
        const vGap = (this.displayMode === 'EXPANDED') ? this.expandedVGap : this.squishedVGap;
        const callHeight = vGap + ("SQUISHED" === this.displayMode ? this.squishedCallHeight : this.expandedCallHeight);

        // Find the variant row (i.e. row assigned during feature packing)
        const yOffset = clickState.y;
        let row;
        let sampleRow;
        if (yOffset <= this.variantBandHeight) {
            // Variant
            const variantHeight = ("SQUISHED" === this.displayMode) ? this.squishedVariantHeight : this.expandedVariantHeight;
            row = (Math.floor)((yOffset - TOP_MARGIN) / (variantHeight + vGap));
            sampleRow = -1;
        } else {
            const sampleY = yOffset - this.variantBandHeight;
            sampleRow = Math.floor(sampleY / this.sampleHeight);
            row = Math.floor((sampleY - sampleRow * this.sampleHeight) / callHeight);
        }
        const rowVariants = featureList.filter(f => f.row === row);

        let popupData = []
        for (let variant of rowVariants) {

            if (popupData.length > 0) {
                popupData.push({html: '<hr style="border-top-width:2px ;border-color: #c9c3ba" />'})
            }

            if (yOffset <= this.variantBandHeight) {
                const v = variant.popupData(genomicLocation, genomeID);
                Array.prototype.push.apply(popupData, v);
            } else {
                // Callset
                const callSets = this.callSets;
                if (callSets && variant.calls) {
                    if (sampleRow >= 0 && sampleRow < callSets.length) {
                        const cs = callSets[sampleRow];
                        const call = variant.calls[cs.id];
                        Array.prototype.push.apply(popupData, extractGenotypePopupData(call, variant, genomeID, sampleInformation));
                    }
                }

            }
        }

        return popupData;

        /**
         * Genotype popup text.
         * @param call
         * @param variant
         * @returns {Array}
         */
        function extractGenotypePopupData(call, variant, genomeId, sampleInformation) {

            let popupData = [];
            if (call.callSetName !== undefined) {
                popupData.push({name: 'Name', value: call.callSetName});
            }

            if (call.genotype) {
                let gt = '';

                if (variant.alternateBases === ".") {
                    gt = "No Call";
                } else {
                    const altArray = variant.alternateBases.split(",")
                    for (let allele of call.genotype) {
                        if (gt.length > 0) {
                            gt += "|";
                        }
                        if ('.' === allele) {
                            gt += '.';
                        } else if (allele === 0) {
                            gt += variant.referenceBases;
                        } else {
                            let alt = altArray[allele - 1].replace("<", "&lt;");
                            gt += alt;
                        }
                    }
                }
                popupData.push({name: 'Genotype', value: gt});
            }


            if (call.phaseset !== undefined) {
                popupData.push({name: 'Phase set', value: call.phaseset});
            }
            if (call.genotypeLikelihood !== undefined) {
                popupData.push({name: 'genotypeLikelihood', value: call.genotypeLikelihood.toString()});
            }

            if (sampleInformation) {
                var attr = sampleInformation.getAttributes(call.callSetName);
                if (attr) {
                    Object.keys(attr).forEach(function (attrName) {
                        var displayText = attrName.replace(/([A-Z])/g, " $1");
                        displayText = displayText.charAt(0).toUpperCase() + displayText.slice(1);
                        popupData.push({name: displayText, value: attr[attrName]});
                    });
                }
            }

            var infoKeys = Object.keys(call.info);
            if (infoKeys.length) {
                popupData.push("<hr>");
            }
            infoKeys.forEach(function (key) {
                popupData.push({name: key, value: decodeURIComponent(call.info[key])});
            });

            return popupData;
        }

    }


// VariantTrack.prototype.contextMenuItemList = function (clickState) {
//
//     const self = this;
//     const menuItems = [];
//
//     const featureList = this.clickedFeatures(clickState);
//
//     if (this.callSets && featureList && featureList.length > 0) {
//
//         featureList.forEach(function (variant) {
//
//             if ('str' === variant.type) {
//
//                 menuItems.push({
//                     label: 'Sort by allele length',
//                     click: function () {
//                         sortCallSetsByAlleleLength(self.callSets, variant, self.sortDirection);
//                         self.sortDirection = (self.sortDirection === "ASC") ? "DESC" : "ASC";
//                         self.trackView.repaintViews();
//                     }
//                 });
//
//             }
//
//         });
//     }
//
//
//     function sortCallSetsByAlleleLength(callSets, variant, direction) {
//         var d = (direction === "DESC") ? 1 : -1;
//         Object.keys(callSets).forEach(function (property) {
//             callSets[property].sort(function (a, b) {
//                 var aNan = isNaN(variant.calls[a.id].genotype[0]);
//                 var bNan = isNaN(variant.calls[b.id].genotype[0]);
//                 if (aNan && bNan) {
//                     return 0;
//                 } else if (aNan) {
//                     return 1;
//                 } else if (bNan) {
//                     return -1;
//                 } else {
//                     var a0 = getAlleleString(variant.calls[a.id], variant, 0);
//                     var a1 = getAlleleString(variant.calls[a.id], variant, 1);
//                     var b0 = getAlleleString(variant.calls[b.id], variant, 0);
//                     var b1 = getAlleleString(variant.calls[b.id], variant, 1);
//                     var result = Math.max(b0.length, b1.length) - Math.max(a0.length, a1.length);
//                     if (result === 0) {
//                         result = Math.min(b0.length, b1.length) - Math.min(a0.length, a1.length);
//                     }
//                     return d * result;
//                 }
//             });
//         });
//     }
//
//
//     return menuItems;
//
// };

    menuItemList() {

        const menuItems = [];

        // color-by INFO attribute
        if (this.header.INFO) {
            //Code below will present checkboxes for all info fields of type "String".   Wait until this is requested
            //const stringInfoKeys = Object.keys(this.header.INFO).filter(key => "String" === this.header.INFO[key].Type);

            // For now stick to explicit info fields (well, exactly 1 for starters)
            const stringInfoKeys = this.header.INFO.SVTYPE ? ['SVTYPE', undefined] : [];

            if (stringInfoKeys.length > 0) {
                const $e = $('<div class="igv-track-menu-category igv-track-menu-border-top">');
                $e.text('Color by:');
                menuItems.push({name: undefined, object: $e, click: undefined, init: undefined});
                stringInfoKeys.sort();
                for (let item of stringInfoKeys) {
                    const selected = (this.variantColorBy === item);
                    const label = item ? item : 'None';
                    menuItems.push(this.colorByCB({key: item, label: label}, selected));
                }
            }
        }

        if (this.getCallsetsLength() > 0) {
            menuItems.push({object: $('<div class="igv-track-menu-border-top">')});
            menuItems.push({
                object: createCheckbox("Show Genotypes", this.showGenotypes),
                click: () => {
                    this.showGenotypes = !this.showGenotypes;
                    //adjustTrackHeight();
                    this.trackView.checkContentHeight();
                    this.trackView.repaintViews();
                }
            })
        }

        menuItems.push({object: $('<div class="igv-track-menu-border-top">')});
        for (let displayMode of ["COLLAPSED", "SQUISHED", "EXPANDED"]) {
            var lut =
                {
                    "COLLAPSED": "Collapse",
                    "SQUISHED": "Squish",
                    "EXPANDED": "Expand"
                };

            menuItems.push(
                {
                    object: createCheckbox(lut[displayMode], displayMode === this.displayMode),
                    click: () => {
                        this.displayMode = displayMode;
                        this.trackView.checkContentHeight();
                        this.trackView.repaintViews();
                    }
                });
        }


        return menuItems;
    }

    /**
     * Create a "color by" checkbox menu item, optionally initially checked
     * @param menuItem
     * @param showCheck
     * @returns {{init: undefined, name: undefined, click: clickHandler, object: (jQuery|HTMLElement|jQuery.fn.init)}}
     */
    colorByCB(menuItem, showCheck) {

        const $e = createCheckbox(menuItem.label, showCheck);
        const clickHandler = ev => {

            if (menuItem.key === this.variantColorBy) {
                this.variantColorBy = undefined;
                delete this.config.variantColorBy;
                this.trackView.repaintViews();
            } else {
                this.variantColorBy = menuItem.key;
                this.config.variantColorBy = menuItem.key;
                this.trackView.repaintViews();
            }

        };

        return {name: undefined, object: $e, click: clickHandler, init: undefined}
    }

    getState() {

        const config = super.getState();
        config.color = this._color;
        return config;

    }
}

let VARIANT_COLOR_TABLES;

function getVariantColorTable(key) {

    if (!VARIANT_COLOR_TABLES) VARIANT_COLOR_TABLES = new Map();

    if (!VARIANT_COLOR_TABLES.has(key)) {
        let tbl;
        switch (key) {
            case "SVTYPE" :
                tbl = new ColorTable({
                    'DEL': '#ff2101',
                    'INS': '#001888',
                    'DUP': '#028401',
                    'INV': '#008688',
                    'CNV': '#8931ff',
                    'BND': '#891100'
                })
                break;
            default:
                tbl = new PaletteColorTable("Set1");
        }
        VARIANT_COLOR_TABLES.set(key, tbl);
    }
    return VARIANT_COLOR_TABLES.get(key);

}

export default VariantTrack
