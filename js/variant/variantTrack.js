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

import $ from "../vendor/jquery-3.3.1.slim.js"
import FeatureSource from '../feature/featureSource.js'
import TrackBase from "../trackBase.js"
import IGVGraphics from "../igv-canvas.js"
import {createCheckbox} from "../igv-icons.js"
import {ColorTable, PaletteColorTable} from "../util/colorPalletes.js"
import {attributeNames, emptySpaceReplacement, sampleDictionary} from "../sample/sampleInfo.js"
import {makeVCFChords, sendChords} from "../jbrowse/circularViewUtils.js"
import {FileUtils, StringUtils, IGVColor} from "../../node_modules/igv-utils/src/index.js"
import CNVPytorTrack from "../cnvpytor/cnvpytorTrack.js"
import {sortBySampleName} from "../sample/sampleUtils.js"

const isString = StringUtils.isString

const DEFAULT_COLOR = "rgb(0,0,150)"
const DEFAULT_VISIBILITY_WINDOW = 1000000
const TOP_MARGIN = 10
const STANDARD_FIELDS = new Map([["REF", "referenceBases"], ["ALT", "alternateBases"], ["QUAL", "quality"], ["FILTER", "filter"]])


class VariantTrack extends TrackBase {

    static defaults = {
        displayMode: "EXPANDED",
        sortDirection: "ASC",
        showGenotypes: true,
        expandedVariantHeight: 10,
        squishedVariantHeight: 2,
        squishedCallHeight: 1,
        expandedCallHeight: 10,
        expandedVGap: 2,
        squishedVGap: 1,
        expandedGroupGap: 10,
        squishedGroupGap: 5,
        featureHeight: 14,
        color: "rgb(0,0,150)",
        noGenotypeColor: "rgb(200,180,180)",
        noCallColor: "rgb(225, 225, 225)",
        nonRefColor: "rgb(200, 200, 215)",
        mixedColor: "rgb(200, 220, 200)",
        homrefColor: "rgb(200, 200, 200)",
        homvarColor: "rgb(17,248,254)",
        hetvarColor: "rgb(34,12,253)",
        colorBy: undefined,
        visibilityWindow: undefined,
        labelDisplayMode: undefined,
        type: "variant"
    }

    #sortDirections = new Map()

    constructor(config, browser) {
        super(config, browser)
    }

    init(config) {

        super.init(config)

        if (config.variantHeight) {
            // Override for backward compatibility
            this.expandedVariantHeight = config.variantHeight
        }

        this.featureSource = FeatureSource(config, this.browser.genome)

        this._initColorBy = config.colorBy
        if (config.colorTable) {
            this.colorTables = new Map()
            this.colorTables.set(config.colorBy, new ColorTable(config.colorTable))
        }
        this._color = config.color
        this._strokecolor = config.strokecolor
        this._context_hook = config.context_hook

        // The number of variant rows are computed dynamically, but start with "1" by default
        this.nVariantRows = 1

        // Explicitly set samples -- used to select a subset of samples from a dataset
        if (config.samples) {
            // Explicit setting, keys == names
            for (let s of config.samples) {
                this.sampleKeys = config.samples
            }1
        }

        if(config.sort) {
            this.initialSort = config.sort
        }
    }

    async postInit() {

        this.header = await this.getHeader()
        if (this.disposed) return   // This track was removed during async load

        if (this.header && !this.sampleKeys) {
            this.sampleKeys = this.header.sampleNameMap ? Array.from(this.header.sampleNameMap.keys()) : []
        }
        if (undefined === this.visibilityWindow && this.config.indexed !== false) {
            const fn = FileUtils.isFile(this.config.url) ? this.config.url.name : this.config.url
            if (isString(fn) && fn.toLowerCase().includes("gnomad")) {
                this.visibilityWindow = 1000  // these are known to be very dense
            } else if (typeof this.featureSource.defaultVisibilityWindow === 'function') {
                this.visibilityWindow = await this.featureSource.defaultVisibilityWindow()
            } else {
                this.visibilityWindow = DEFAULT_VISIBILITY_WINDOW
            }
        }

        return this
    }

    get supportsWholeGenome() {
        return !this.config.indexURL || this.config.supportsWholeGenome === true
    }

    get color() {
        return this._color || DEFAULT_COLOR
    }

    set color(c) {
        this._color = c
        this.colorBy = undefined
    }

    async getHeader() {
        if (!this.header) {
            if (typeof this.featureSource.getHeader === "function") {
                this.header = await this.featureSource.getHeader()
            }
        }
        return this.header
    }

    getSampleCount() {
        return this.sampleKeys ? this.sampleKeys.length : 0
    }

    async getFeatures(chr, start, end, bpPerPixel) {

        if (this.header === undefined) {
            this.header = await this.getHeader()
        }
        const features = await this.featureSource.getFeatures({
            chr,
            start,
            end,
            bpPerPixel,
            visibilityWindow: this.visibilityWindow
        })

        if (this.initialSort) {
            const sort = this.initialSort
            if (sort.option === undefined || sort.option.toUpperCase() === "GENOTYPE") {
                this.sortSamplesByGenotype(sort, features)
            } else if ("ATTRIBUTE" === sort.option.toUpperCase() && sort.attribute) {
                const sortDirection = "ASC" === sort.direction ? 1 : -1
                this.sortByAttribute(sort.attribute, sortDirection)
            }
            this.initialSort = undefined  // Sample order is sorted,
        }

        return features
    }

    hasSamples() {
        return this.getSampleCount() > 0
    }

    /**
     * Required method of the sample name and info viewports
     */
    getSamples() {

        const vGap = ("SQUISHED" === this.displayMode) ? this.squishedVGap : this.expandedVGap
        const nVariantRows = "COLLAPSED" === this.displayMode ? 1 : this.nVariantRows
        const variantHeight = ("SQUISHED" === this.displayMode) ? this.squishedVariantHeight : this.expandedVariantHeight
        const callHeight = ("SQUISHED" === this.displayMode ? this.squishedCallHeight : this.expandedCallHeight)
        const height = nVariantRows * (callHeight + vGap)

        // Y Offset at which samples begin
        const yOffset = TOP_MARGIN + nVariantRows * (variantHeight + vGap)

        return {
            names: this.sampleKeys,
            yOffset,
            height
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

        if (!features || 0 === features.length) return TOP_MARGIN

        const nVariantRows = (this.displayMode === "COLLAPSED") ? 1 : this.nVariantRows
        const vGap = (this.displayMode === "SQUISHED") ? this.squishedVGap : this.expandedVGap
        const variantHeight = (this.displayMode === "SQUISHED") ? this.squishedVariantHeight : this.expandedVariantHeight
        const callHeight = (this.displayMode === "SQUISHED") ? this.squishedCallHeight : this.expandedCallHeight
        const nGenotypes = this.showGenotypes === false ? 0 : this.getSampleCount() * nVariantRows
        const h = TOP_MARGIN + nVariantRows * (variantHeight + vGap)
        return h + vGap + (nGenotypes + 1) * (callHeight + vGap)

    }

    variantRowCount(count) {
        this.nVariantRows = count
    }

    draw({context, pixelWidth, pixelHeight, bpPerPixel, bpStart, pixelTop, features}) {

        IGVGraphics.fillRect(context, 0, pixelTop, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"})

        const vGap = ("SQUISHED" === this.displayMode) ? this.squishedVGap : this.expandedVGap
        const rowCount = ("COLLAPSED" === this.displayMode) ? 1 : this.nVariantRows
        const variantHeight = ("SQUISHED" === this.displayMode) ? this.squishedVariantHeight : this.expandedVariantHeight
        this.variantBandHeight = TOP_MARGIN + rowCount * (variantHeight + vGap)

        let callSets = this.sampleColumns

        const hasSamples = this.hasSamples()
        if (callSets && hasSamples && this.showGenotypes !== false) {
            IGVGraphics.strokeLine(context, 0, this.variantBandHeight, pixelWidth, this.variantBandHeight, {strokeStyle: 'rgb(224,224,224) '})
        }

        if (features) {

            const callHeight = ("SQUISHED" === this.displayMode) ? this.squishedCallHeight : this.expandedCallHeight
            const vGap = ("SQUISHED" === this.displayMode) ? this.squishedVGap : this.expandedVGap
            const bpEnd = bpStart + pixelWidth * bpPerPixel + 1

            // Loop through variants.  A variant == a row in a VCF file
            for (let variant of features) {

                if (variant.end < bpStart) continue
                if (variant.start > bpEnd) break

                const variantHeight = ("SQUISHED" === this.displayMode) ? this.squishedVariantHeight : this.expandedVariantHeight
                const y = TOP_MARGIN + ("COLLAPSED" === this.displayMode ? 0 : variant.row * (variantHeight + vGap))
                const h = variantHeight

                // Compute pixel width.   Minimum width is 3 pixels,  if > 5 pixels create gap between variants
                let x = Math.round((variant.start - bpStart) / bpPerPixel)
                let x1 = Math.round((variant.end - bpStart) / bpPerPixel)
                let w = Math.max(1, x1 - x)
                if (w < 3) {
                    w = 3
                    x -= 1
                } else if (w > 5) {
                    x += 1
                    w -= 2
                }
                context.fillStyle = this.getColorForFeature(variant)
                context.fillRect(x, y, w, h)

                //only paint stroke if a color is defined
                let strokecolor = this.getVariantStrokecolor(variant)
                if (strokecolor) {
                    context.strokeStyle = strokecolor
                    context.strokeRect(x, y, w, h)
                }

                // call hook if _context_hook fn is defined
                this.callContextHook(variant, context, x, y, w, h)

                //variant.pixelRect = {x, y, w, h}

                // Loop though the samples for this variant.
                if (hasSamples && this.showGenotypes !== false) {

                    const nVariantRows = "COLLAPSED" === this.displayMode ? 1 : this.nVariantRows
                    this.sampleYOffset = this.variantBandHeight + vGap
                    this.sampleHeight = nVariantRows * (callHeight + vGap)  // For each sample, there is a call for each variant at this position

                    let sampleNumber = 0

                    for (let sample of this.sampleKeys) {

                        const index = this.header.sampleNameMap.get(sample)
                        const call = variant.calls[index]
                        if (call) {
                            const row = "COLLAPSED" === this.displayMode ? 0 : variant.row
                            const py = this.sampleYOffset + sampleNumber * this.sampleHeight + row * (callHeight + vGap)
                            let allVar = true  // until proven otherwise
                            let allRef = true
                            let noCall = false

                            if (call.genotype) {
                                for (let g of call.genotype) {
                                    if ('.' === g) {
                                        noCall = true
                                        break
                                    } else {
                                        if (g !== 0) allRef = false
                                        if (g === 0) allVar = false
                                    }
                                }
                            }

                            if (!call.genotype) {
                                context.fillStyle = this.noGenotypeColor
                            } else if (noCall) {
                                context.fillStyle = this.noCallColor
                            } else if (allRef) {
                                context.fillStyle = this.homrefColor
                            } else if (allVar) {
                                context.fillStyle = this.homvarColor
                            } else {
                                context.fillStyle = this.hetvarColor
                            }

                            context.fillRect(x, py, w, callHeight)

                            //callSet.pixelRect = {x, y: py, w, h: callHeight}
                        }
                        sampleNumber++
                    }

                }
            }

        } else {
            console.log("No feature list")
        }
    };


    getColorForFeature(variant) {

        const v = variant._f || variant
        let variantColor

        if (this.colorBy) {
            const colorBy = this.colorBy
            let value
            if (v.info.hasOwnProperty(colorBy)) {
                value = v.info[colorBy]
            } else if (STANDARD_FIELDS.has(colorBy)) {
                const key = STANDARD_FIELDS.get(colorBy)
                value = v[key]
            }
            variantColor = this.getVariantColorTable(colorBy).getColor(value)
            if (!variantColor) {
                variantColor = "gray"
            }

        } else if (this._color) {
            variantColor = (typeof this._color === "function") ? this._color(variant) : this._color
        } else if ("NONVARIANT" === v.type) {
            variantColor = this.nonRefColor
        } else if ("MIXED" === v.type) {
            variantColor = this.mixedColor
        } else {
            variantColor = this.color
        }

        if (v.isFiltered()) {
            variantColor = IGVColor.addAlpha(variantColor, 0.2)
        }

        return variantColor
    }


    getVariantStrokecolor(variant) {

        const v = variant._f || variant
        let variantStrokeColor

        if (this._strokecolor) {
            variantStrokeColor = (typeof this._strokecolor === "function") ? this._strokecolor(v) : this._strokecolor
        } else {
            variantStrokeColor = undefined
        }
        return variantStrokeColor
    }

    callContextHook(variant, context, x, y, w, h) {
        if (this._context_hook) {
            if (typeof this._context_hook === "function") {
                const v = variant._f || variant

                context.save()
                this._context_hook(v, context, x, y, w, h)
                context.restore()
            }
        }
    }

    clickedFeatures(clickState) {

        let featureList = super.clickedFeatures(clickState)

        const vGap = (this.displayMode === 'EXPANDED') ? this.expandedVGap : this.squishedVGap
        const callHeight = vGap + ("SQUISHED" === this.displayMode ? this.squishedCallHeight : this.expandedCallHeight)
        // Find the variant row (i.e. row assigned during feature packing)
        const yOffset = clickState.y
        if (yOffset <= this.variantBandHeight) {
            // Variant
            const variantHeight = ("SQUISHED" === this.displayMode) ? this.squishedVariantHeight : this.expandedVariantHeight
            const variantRow = Math.floor((yOffset - TOP_MARGIN) / (variantHeight + vGap))
            if ("COLLAPSED" !== this.displayMode) {
                featureList = featureList.filter(f => f.row === variantRow)
            }
        } else if (this.sampleKeys) {
            const sampleY = yOffset - this.variantBandHeight
            const sampleRow = Math.floor(sampleY / this.sampleHeight)
            if (sampleRow >= 0 && sampleRow < this.sampleKeys.length) {
                const variantRow = Math.floor((sampleY - sampleRow * this.sampleHeight) / callHeight)
                const variants = "COLLAPSED" === this.displayMode ? featureList : featureList.filter(f => f.row === variantRow)
                const sampleName = this.sampleKeys[sampleRow]
                const index = this.header.sampleNameMap.get(sampleName)
                featureList = variants.map(v => {
                    const call = v.calls[index]
                    // This is hacky, but it avoids expanding all calls in advance in case one is clicked, or
                    // alternatively storing backpoints to the variant for all calls.
                    call.genotypeString = expandGenotype(call, v)
                    return call
                })
            }
        }

        return featureList
    }


    /**
     * Return "popup data" for feature @ genomic location.  Data is an array of key-value pairs
     */
    popupData(clickState, featureList) {

        if (featureList === undefined) featureList = this.clickedFeatures(clickState)
        const genomicLocation = clickState.genomicLocation
        const genomeID = this.browser.genome.id
        const sampleInformation = this.browser.sampleInformation

        let popupData = []
        for (let v of featureList) {

            const f = v._f || v    // Get real variant from psuedo-variant, e.g. whole genome or SV mate

            if (popupData.length > 0) {
                popupData.push({html: '<hr style="border-top-width:2px ;border-color: #c9c3ba" />'})
            }

            if (typeof f.popupData === 'function') {
                const v = f.popupData(genomicLocation, genomeID)
                Array.prototype.push.apply(popupData, v)
            }
        }
        return popupData

    }


// VariantTrack.prototype.contextMenuItemList = function (clickState) {
//
//     const self = this;
//     const menuItems = [];
//
//     const featureList = this.clickedFeatures(clickState);
//
//     if (this.sampleColumns && featureList && featureList.length > 0) {
//
//         featureList.forEach(function (variant) {
//
//             if ('str' === variant.type) {
//
//                 menuItems.push({
//                     label: 'Sort by allele length',
//                     click: function () {
//                         sortCallSetsByAlleleLength(self.sampleColumns, variant, self.sortDirection);
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

        const menuItems = []

        // color-by INFO attribute
        if (this.header.INFO) {
            //Code below will present checkboxes for all info fields of type "String".   Wait until this is requested
            //const stringInfoKeys = Object.keys(this.header.INFO).filter(key => "String" === this.header.INFO[key].Type);

            // For now stick to explicit info fields (well, exactly 1 for starters)
            if (this.header.INFO) {
                //const stringInfoKeys = Object.keys(this.header.INFO).filter(key => this.header.INFO[key].Type === "String")
                const stringInfoKeys = this.header.INFO.SVTYPE ? ['SVTYPE'] : []
                if (this._initColorBy && this._initColorBy !== 'SVTYPE') {
                    stringInfoKeys.push(this._initColorBy)
                }
                if (stringInfoKeys.length > 0) {
                    menuItems.push('<hr/>')
                    const $e = $('<div class="igv-track-menu-category igv-track-menu-border-top">')
                    $e.text('Color by:')
                    menuItems.push({name: undefined, object: $e, click: undefined, init: undefined})
                    stringInfoKeys.sort()
                    for (let item of stringInfoKeys) {
                        const selected = (this.colorBy === item)
                        const label = item ? item : 'None'
                        menuItems.push(this.colorByCB({key: item, label: label}, selected))
                    }
                    menuItems.push(this.colorByCB({key: undefined, label: 'None'}, this.colorBy === undefined))
                    menuItems.push('<hr/>')
                }
            }
        }

        menuItems.push(sortBySampleName())
        menuItems.push('<hr/>')

        if (sampleDictionary) {

            menuItems.push("Sort by attribute:")
            for (const attribute of attributeNames) {

                if (this.sampleKeys.some(s => {
                    const attrs = this.browser.sampleInfo.getAttributes(s)
                    return attrs && attrs[attribute]
                })) {


                    const object = $('<div>')
                    object.html(`&nbsp;&nbsp;${attribute.split(emptySpaceReplacement).join(' ')}`)

                    function attributeSort() {
                        const sortDirection = this.#sortDirections.get(attribute) || 1
                        this.sortByAttribute(attribute, sortDirection)
                        this.config.sort = {
                            option: "ATTRIBUTE",
                            attribute: attribute,
                            direction: sortDirection > 0 ? "ASC" : "DESC"
                        }
                        this.#sortDirections.set(attribute, sortDirection * -1)
                    }

                    menuItems.push({object, click: attributeSort})
                }
            }
        }

        menuItems.push('<hr/>')

        if (this.getSampleCount() > 0) {
            menuItems.push({object: $('<div class="igv-track-menu-border-top">')})
            menuItems.push({
                object: $(createCheckbox("Show Genotypes", this.showGenotypes)),
                click: function showGenotypesHandler() {
                    this.showGenotypes = !this.showGenotypes
                    this.trackView.checkContentHeight()
                    this.trackView.repaintViews()
                    this.browser.sampleNameControl.performClickWithState(this.browser, this.showGenotypes)
                    this.browser.sampleInfoControl.performClickWithState(this.browser, this.showGenotypes)
                }
            })
        }

        menuItems.push({object: $('<div class="igv-track-menu-border-top">')})
        for (let displayMode of ["COLLAPSED", "SQUISHED", "EXPANDED"]) {
            var lut =
                {
                    "COLLAPSED": "Collapse",
                    "SQUISHED": "Squish",
                    "EXPANDED": "Expand"
                }

            menuItems.push(
                {
                    object: $(createCheckbox(lut[displayMode], displayMode === this.displayMode)),
                    click: function displayModeHandler() {
                        this.displayMode = displayMode
                        this.trackView.checkContentHeight()
                        this.trackView.repaintViews()
                    }
                })
        }

        // Experimental JBrowse circular view integration
        if (this.browser.circularView) {

            menuItems.push('<hr>')
            menuItems.push({
                label: 'Add SVs to circular view',
                click: function circularViewHandler() {
                    const inView = []
                    for (let viewport of this.trackView.viewports) {
                        this.sendChordsForViewport(viewport)
                    }
                }
            })
        }

        // Experimental CNVPytor support
        if (this.canCovertToPytor()) {
            menuItems.push('<hr>')
            menuItems.push({
                label: 'Convert to CNVpytor track',
                click: function cnvPytorHandler() {
                    this.convertToPytor()
                }
            })
        }

        return menuItems
    }


    contextMenuItemList(clickState) {

        const list = []

        if (this.hasSamples() && this.showGenotypes) {
            const referenceFrame = clickState.viewport.referenceFrame
            const genomicLocation = clickState.genomicLocation

            // We can't know genomic location intended with precision, define a buffer 5 "pixels" wide in genomic coordinates
            const bpWidth = referenceFrame.toBP(2.5)

            const direction = this.#sortDirections.get('genotype') || 1
            this.#sortDirections.set('genotype', direction * -1)  // Toggle for next sort

            list.push(
                {
                    label: 'Sort by genotype',
                    click: (e) => {

                        const sort = {
                            direction,
                            option: 'genotype',
                            chr: clickState.viewport.referenceFrame.chr,
                            start: Math.floor(genomicLocation - bpWidth),
                            end: Math.ceil(genomicLocation + bpWidth)

                        }
                        const viewport = clickState.viewport
                        const features = viewport.cachedFeatures
                        this.sortSamplesByGenotype(sort, features)

                        this.config.sort = sort
                    }
                }
            )
            list.push('<hr/>')
        }

        // Experimental JBrowse circular view integration
        if (this.browser.circularView) {

            const viewport = clickState.viewport
            list.push({
                label: 'Add SVs to Circular View',
                click: () => {
                    this.sendChordsForViewport(viewport)
                }
            })
            list.push('<hr/>')
        }

        return list

    }


    async sortSamplesByGenotype({chr, position, start, end, direction}, featureList) {

        if (start === undefined) start = position - 1
        if (end === undefined) end = position

        if (!featureList) {
            featureList = await this.featureSource.getFeatures({chr, start, end})
        }
        if (!featureList) return

        const scores = new Map()
        const d2 = (direction === "ASC" ? 1 : -1)

        // Compute score for each sample
        for (let variant of featureList) {
            if (variant.end < start) continue
            if (variant.start > end) break
            for (let call of variant.calls) {
                const sample = call.sample
                const callScore = call.zygosityScore()
                scores.set(sample, scores.has(sample) ? scores.get(sample) + callScore : callScore)
            }
        }

        // Now sort sample names by score
        this.sampleKeys.sort(function (a, b) {
            let sa = scores.get(a) || 0
            let sb = scores.get(b) || 0
            return d2 * (sa - sb)
        })

        this.trackView.repaintViews()
    }

    sortByAttribute(attribute, sortDirection) {

        this.config.sort = {
            option: "ATTRIBUTE",
            attribute: attribute,
            direction: sortDirection === 1 ? "ASC" : "DESC"
        }

        this.sampleKeys = this.browser.sampleInfo.getSortedSampleKeysByAttribute(this.sampleKeys, attribute, sortDirection)
        this.trackView.repaintViews()

    }


    sendChordsForViewport(viewport) {
        const refFrame = viewport.referenceFrame
        let inView
        if ("all" === refFrame.chr) {
            const all = this.featureSource.getAllFeatures()
            const arrays = Object.keys(all).map(k => all[k])
            inView = [].concat(...arrays)
        } else {
            inView = this.featureSource.featureCache.queryFeatures(refFrame.chr, refFrame.start, refFrame.end)

        }

        const chords = makeVCFChords(inView)
        sendChords(chords, this, refFrame, 0.5)
    }

    /**
     * Create a "color by" checkbox menu item, optionally initially checked
     * @param menuItem
     * @param showCheck
     * @returns {{init: undefined, name: undefined, click: clickHandler, object: (jQuery|HTMLElement|jQuery.fn.init)}}
     */
    colorByCB(menuItem, showCheck) {

        const $e = $(createCheckbox(menuItem.label, showCheck))

        function clickHandler() {

            if (menuItem.key === this.colorBy) {
                this.colorBy = undefined
                delete this.config.colorBy
                this.trackView.repaintViews()
            } else {
                this.colorBy = menuItem.key
                this.config.colorBy = menuItem.key
                this.trackView.repaintViews()
            }

        }

        return {name: undefined, object: $e, click: clickHandler, init: undefined}
    }

    getState() {

        const config = super.getState()
        if (this._color && typeof this._color !== "function") {
            config.color = this._color
        }
        return config

    }

    getVariantColorTable(key) {

        if (!this.colorTables) {
            this.colorTables = new Map()
        }

        if (!this.colorTables.has(key)) {
            let tbl
            switch (key) {
                case "SVTYPE" :
                    tbl = SV_COLOR_TABLE
                    break
                default:
                    tbl = new PaletteColorTable("Set1")
            }
            this.colorTables.set(key, tbl)
        }
        return this.colorTables.get(key)
    }

    ///////////// CNVPytor converstion support follows ////////////////////////////////////////////////////////////

    /**
     * This do-nothing method is neccessary to allow conversion to a CNVPytor track, which needs dom elements for an
     *     // axis.  The dom elements are created as a side effect of this function being defined
     */
    paintAxis() {
    }

    /**
     * Check conditions for pytor track
     * (1) 1 and only 1 genotype (callset)
     * (2) DP info field
     * (3) AD info field
     * (4) Not indexed -- must read entire file
     */
    canCovertToPytor() {

        if (this.config.indexURL) {
            return false
        }
        if (this.header) {
            return Object.keys(this.sampleKeys).length === 1 &&
                this.header.FORMAT &&
                this.header.FORMAT.AD &&
                this.header.FORMAT.DP
        } else {
            // Cant know until header is read
            return false
        }
    }

    async convertToPytor() {

        // Store state in case track is reverted
        this.variantState = {...this.config, ...this.getState()}
        this.variantState.trackHeight = this.height


        this.trackView.startSpinner()
        // The timeout is neccessary to give the spinner time to start.
        setTimeout(async () => {
            try {
                const newConfig = Object.assign({}, this.config)
                Object.setPrototypeOf(this, CNVPytorTrack.prototype)

                this.init(newConfig)
                await this.postInit()

                this.trackView.clearCachedFeatures()
                this.trackView.setTrackHeight(this.config.height || CNVPytorTrack.DEFAULT_TRACK_HEIGHT)
                this.trackView.checkContentHeight()
                this.trackView.updateViews()
                this.trackView.track.autoHeight = false


            } finally {
                this.trackView.stopSpinner()
            }
        }, 100)

    }
}


function expandGenotype(call, variant) {

    if (call.genotype) {
        let gt = ''
        if (variant.alternateBases === ".") {
            gt = "No Call"
        } else {
            const altArray = variant.alternateBases.split(",")
            for (let allele of call.genotype) {
                if (gt.length > 0) {
                    gt += " | "
                }
                if ('.' === allele) {
                    gt += '.'
                } else if (allele === 0) {
                    gt += variant.referenceBases
                } else {
                    let alt = altArray[allele - 1].replace("<", "&lt;")
                    gt += alt
                }
            }
        }
        return gt
    }
}


const SV_COLOR_TABLE = new ColorTable({
    'DEL': '#ff2101',
    'INS': '#001888',
    'DUP': '#028401',
    'INV': '#008688',
    'CNV': '#8931ff',
    'BND': '#891100',
    '*': '#002eff'
})


export default VariantTrack
