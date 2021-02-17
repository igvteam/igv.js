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
import {greyScale, randomColor, randomGrey, randomRGB, randomRGBConstantAlpha} from "../util/colorPalletes.js"

const isString = StringUtils.isString;


const DEFAULT_VISIBILITY_WINDOW = 1000000;
const topMargin = 10;

class VariantTrack extends TrackBase {

    constructor(config, browser) {
        super(config, browser);
    }

    init(config) {
        super.init(config);

        this.visibilityWindow = config.visibilityWindow;
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
        this.featureSource = FeatureSource(config, this.browser.genome);
        this.noCallColor = config.noCallColor || "rgb(245, 245, 245)";
        this.nonRefColor = config.nonRefColor || "rgb(200, 200, 215)";
        this.mixedColor = config.mixedColor || "rgb(200, 220, 200)";
        this.homrefColor = config.homrefColor || "rgb(200, 200, 200)";
        this.homvarColor = config.homvarColor || "rgb(17,248,254)";
        this.hetvarColor = config.hetvarColor || "rgb(34,12,253)";
        this.sortDirection = "ASC";
        this.type = config.type || "variant"

        this.nRows = 1;  // Computed dynamically
    }

    async postInit() {

        const header = await this.getHeader();   // cricital, don't remove'
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

    async getHeader() {

        if (this.header) {
            return this.header;
        } else if (typeof this.featureSource.getHeader === "function") {
            const header = await this.featureSource.getHeader()
            if (header) {
                this.callSets = header.callSets || [];
            }
            this.header = header;
            return header;
        } else {
            this.callSets = [];
            return undefined;
        }

    }

    getCallsetsLength () {
        return this.callSets.length;
    }

    async getFeatures(chr, start, end, bpPerPixel) {

        if (this.header === undefined) {
            this.header = await this.getHeader();
        }
        return this.featureSource.getFeatures({chr, start, end, bpPerPixel, visibilityWindow: this.visibilityWindow});

    }

    /**
     * The required height in pixels required for the track content.   This is not the visible track height, which
     * can be smaller (with a scrollbar) or larger.
     *
     * @param features
     * @returns {*}
     */
    computePixelHeight(features) {

        if (this.displayMode === "COLLAPSED") {
            this.nRows = 1;
            return topMargin + this.variantHeight;
        } else {

            var maxRow = 0;
            if (features) {
                for (let feature of features) {
                    if (feature.row && feature.row > maxRow) maxRow = feature.row;
                }
            }
            const vGap = (this.displayMode === 'EXPANDED') ? this.expandedVGap : this.squishedVGap;
            this.nRows = maxRow + 1;
            const h = topMargin + this.nRows * (this.variantHeight + vGap);
            this.variantBandHeight = h;

            const callHeight = (this.displayMode === "EXPANDED" ? this.expandedCallHeight : this.squishedCallHeight);
            const nCalls = this.getCallsetsLength() * this.nRows;
            return h + vGap + (nCalls + 1) * (callHeight + vGap);

        }

    };

    draw({ context, pixelWidth, pixelHeight, bpPerPixel, bpStart, pixelTop, features }) {

        IGVGraphics.fillRect(context, 0, pixelTop, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

        const callSets = this.callSets;
        const nCalls = this.getCallsetsLength();
        if (callSets && nCalls > 0 && "COLLAPSED" !== this.displayMode) {
            IGVGraphics.strokeLine(context, 0, this.variantBandHeight, pixelWidth, this.variantBandHeight, {strokeStyle: 'rgb(224,224,224) '});
        }

        if (features) {

            const drawnFeatures = []

            const callHeight = ("EXPANDED" === this.displayMode ? this.expandedCallHeight : this.squishedCallHeight)
            const vGap = (this.displayMode === 'EXPANDED') ? this.expandedVGap : this.squishedVGap
            const bpEnd = bpStart + pixelWidth * bpPerPixel + 1
            for (let variant of features) {
                if (variant.end < bpStart) continue;
                if (variant.start > bpEnd) break;

                const y = topMargin + ("COLLAPSED" === this.displayMode ? 0 : variant.row * (this.variantHeight + vGap));
                const h = this.variantHeight;

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

                if ("NONVARIANT" === variant.type) {
                    context.fillStyle = this.nonRefColor;
                } else if ("MIXED" === variant.type) {
                    context.fillStyle = this.mixedColor;
                } else {
                    context.fillStyle = this.color || this.defaultColor;
                }

                context.fillRect(x, y, w, h)

                variant.pixelRect = { x, y, w, h }
                drawnFeatures.push(variant)

                if (nCalls > 0 && variant.calls && "COLLAPSED" !== this.displayMode) {

                    let callsDrawn = 0;

                    for (let callSet of callSets) {
                        const call = variant.calls[callSet.id];
                        if (call) {
                            const py = this.variantBandHeight + vGap + (callsDrawn + variant.row) * (callHeight + vGap)
                            let allVar = true;  // until proven otherwise
                            let allRef = true;
                            let noCall = false;
                            for (let g of call.genotype) {
                                if ('.' === g) {
                                    noCall = true;
                                    break;
                                } else {
                                    if (g !== 0) allRef = false;
                                    if (g === 0) allVar = false;
                                }
                            }

                            if (noCall) {
                                context.fillStyle = this.noCallColor;
                            } else if (allRef) {
                                context.fillStyle = this.homrefColor;
                            } else if (allVar) {
                                context.fillStyle = this.homvarColor;
                            } else {
                                context.fillStyle = this.hetvarColor;
                            }

                            context.fillRect(x, py, w, callHeight)

                            callSet.pixelRect = { x, y:py, w, h:callHeight }
                            drawnFeatures.push(callSet)

                        }
                        callsDrawn++;
                    }

                }
            }

            if (drawnFeatures.length > 0) {
                this.trackView.sampleNameViewport.draw(drawnFeatures, pixelTop, pixelHeight)
            }

        } else {
            console.log("No feature list");
        }
    };

    /**
     * Return "popup data" for feature @ genomic location.  Data is an array of key-value pairs
     */
    popupData(clickState, featureList) {

        if (!featureList) featureList = this.clickedFeatures(clickState);

        const genomicLocation = clickState.genomicLocation
        const genomeID = this.browser.genome.id
        const popupData = []
        const sampleInformation = this.browser.sampleInformation;

        for (let variant of featureList) {

            if (popupData.length > 0) {
                popupData.push('<HR>')
            }

            if ("COLLAPSED" === this.displayMode) {
                Array.prototype.push.apply(popupData, variant.popupData(genomicLocation, this.type));
            } else {
                const yOffset = clickState.y
                const vGap = (this.displayMode === 'EXPANDED') ? this.expandedVGap : this.squishedVGap

                if (yOffset <= this.variantBandHeight) {  // Variant
                    const row = (Math.floor)((yOffset - topMargin) / (this.variantHeight + vGap));
                    if (variant.row === row) {
                        Array.prototype.push.apply(popupData, variant.popupData(genomicLocation, genomeID), this.type);
                    }
                } else { // Genotype

                    const callSets = this.callSets;
                    if (callSets && variant.calls) {
                        const callHeight = this.nRows * ("SQUISHED" === this.displayMode ? this.squishedCallHeight : this.expandedCallHeight);
                        const row = Math.floor((yOffset - this.variantBandHeight) / (callHeight + vGap))
                        if (row >= 0 && row < callSets.length) {
                            const cs = callSets[row];
                            const call = variant.calls[cs.id];
                            Array.prototype.push.apply(popupData, extractGenotypePopupData(call, variant, genomeID, sampleInformation));
                        }
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

            let gt = '';
            const altArray = variant.alternateBases.split(",")
            for (let allele of call.genotype) {
                if ('.' === allele) {
                    gt += 'No Call';
                    break;
                } else if (allele === 0) {
                    gt += variant.referenceBases;
                } else {
                    let alt = altArray[allele - 1].replace("<", "&lt;");
                    gt += alt;
                }
            }

            let popupData = [];
            if (call.callSetName !== undefined) {
                popupData.push({name: 'Name', value: call.callSetName});
            }
            popupData.push({name: 'Genotype', value: gt});
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
                popupData.push({name: key, value: call.info[key]});
            });

            let cravatLinks = [];                   // TODO -- where do these get calculated?
            if (cravatLinks.length > 0) {
                popupData.push("<HR/>");
                popupData = popupData.concat(cravatLinks);
            }

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
                    object: createCheckbox(lut[displayMode], displayMode === self.displayMode),
                    click: function () {
                        self.displayMode = displayMode;
                        self.trackView.checkContentHeight();
                        self.trackView.repaintViews();
                    }
                });
        });


        return menuItems;

    }
}

function drawVariantTrackSampleNames(ctx, features, canvasTop, height) {

    console.log(`draw variant track sample names - features(${ features.length })`)

    // ctx.canvas.height = height
    // ctx.canvas.style.top = `${ canvasTop }px`
    // ctx.translate(0, -canvasTop)
    //
    // for (let feature of features) {
    //     const { y, h } = feature.pixelRect
    //     IGVGraphics.fillRect(ctx, 0, y, ctx.canvas.width, h, { 'fillStyle': randomRGB(200, 255)})
    //     ctx.fillText(feature.names, 0, y + h)
    // }

}

export { drawVariantTrackSampleNames }

export default VariantTrack
