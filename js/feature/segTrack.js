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

import $ from "../vendor/jquery-3.3.1.slim.js"
import FeatureSource from './featureSource.js'
import TrackBase from "../trackBase.js"
import IGVGraphics from "../igv-canvas.js"
import {IGVMath} from "../../node_modules/igv-utils/src/index.js"
import {createCheckbox} from "../igv-icons.js"
import {GradientColorScale} from "../util/colorScale.js"
import {ColorTable} from "../util/colorPalletes.js"

class SegTrack extends TrackBase {

    constructor(config, browser) {
        super(config, browser)
    }

    init(config) {
        super.init(config)

        this.type = config.type || "seg"
        if (this.type === 'maf') this.type = 'mut'
        this.isLog = config.isLog
        this.displayMode = config.displayMode || "EXPANDED" // EXPANDED | SQUISHED
        this.height = config.height || 300
        this.maxHeight = config.maxHeight || 500
        this.squishedRowHeight = config.sampleSquishHeight || config.squishedRowHeight || 2
        this.expandedRowHeight = config.sampleExpandHeight || config.expandedRowHeight || 13
        this.sampleHeight = this.squishedRowHeight      // Initial value, will get overwritten when rendered

        if (config.color) {
            this.color = config.color
        } else {
            // Color scales for "seg" (copy number) tracks.
            this.posColorScale = config.posColorScale ||
                new GradientColorScale({
                    low: 0.1,
                    lowR: 255,
                    lowG: 255,
                    lowB: 255,
                    high: 1.5,
                    highR: 255,
                    highG: 0,
                    highB: 0
                })
            this.negColorScale = config.negColorScale ||
                new GradientColorScale({
                    low: -1.5,
                    lowR: 0,
                    lowG: 0,
                    lowB: 255,
                    high: -0.1,
                    highR: 255,
                    highG: 255,
                    highB: 255
                })

            // Default color table for mutation (mut and maf) tracks
            if (this.type === "mut") {
                this.colorTable = new ColorTable(config.colorTable || MUT_COLORS)
            }
        }

        this.sampleKeys = []
        this.sampleNames = new Map()
        if (config.samples) {
            // Explicit setting, keys == names
            for (let s of config.samples) {
                this.sampleKeys.push(s)
                this.sampleNames.set(s, s)
            }
            this.explicitSamples = true
        }

        //   this.featureSource = config.sourceType === "bigquery" ?
        //       new igv.BigQueryFeatureSource(this.config) :
        this.featureSource = FeatureSource(this.config, this.browser.genome)

        this.initialSort = config.sort
    }

    async postInit() {
        if (typeof this.featureSource.getHeader === "function") {
            this.header = await this.featureSource.getHeader()
        }
        // Set properties from track line
        if (this.header) {
            this.setTrackProperties(this.header)
        }
    }


    menuItemList() {

        const menuItems = []
        const lut =
            {
                "SQUISHED": "Squish",
                "EXPANDED": "Expand",
                "FILL": "Fill"
            }

        menuItems.push('<hr/>')
        menuItems.push("DisplayMode:")

        const displayOptions = this.type === 'seg' ? ["SQUISHED", "EXPANDED", "FILL"] : ["SQUISHED", "EXPANDED"]

        for (let displayMode of displayOptions) {

            const checkBox = createCheckbox(lut[displayMode], displayMode === this.displayMode)
            menuItems.push(
                {
                    object: $(checkBox),
                    click: () => {
                        this.displayMode = displayMode
                        this.config.displayMode = displayMode
                        this.trackView.checkContentHeight()
                        this.trackView.repaintViews()
                        this.trackView.moveScroller(this.trackView.sampleNameViewport.trackScrollDelta)
                    }
                })
        }

        return menuItems

    }

    hasSamples() {
        return true   // SEG, MUT, and MAF tracks have samples by definition
    }

    getSamples() {
        return {
            names: this.sampleKeys.map(key => this.sampleNames.get(key)),
            height: this.sampleHeight,
            yOffset: 0
        }
    }

    async getFeatures(chr, start, end) {
        const features = await this.featureSource.getFeatures({chr, start, end})
        if (this.initialSort) {
            const sort = this.initialSort
            this.sortSamples(sort.chr, sort.start, sort.end, sort.direction, features)
            this.initialSort = undefined  // Sample order is sorted,
        }
        return features
    }


    draw({context, renderSVG, pixelTop, pixelWidth, pixelHeight, features, bpPerPixel, bpStart}) {

        IGVGraphics.fillRect(context, 0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"})

        if (features && features.length > 0) {

            this.checkForLog(features)

            // New segments could conceivably add new samples
            this.updateSampleKeys(features)

            // Create a map for fast id -> row lookup
            const samples = {}
            this.sampleKeys.forEach(function (id, index) {
                samples[id] = index
            })

            let border
            switch (this.displayMode) {
                case "FILL":
                    this.sampleHeight = pixelHeight / this.sampleKeys.length
                    border = 0
                    break

                case "SQUISHED":
                    this.sampleHeight = this.squishedRowHeight
                    border = 0
                    break
                default:   // EXPANDED
                    this.sampleHeight = this.expandedRowHeight
                    border = 1
            }
            const rowHeight = this.sampleHeight


            // this.featureMap = new Map()

            for (let segment of features) {
                segment.pixelRect = undefined   // !important, reset this in case segment is not drawn
            }

            const pixelBottom = pixelTop + pixelHeight
            const bpEnd = bpStart + pixelWidth * bpPerPixel + 1
            const xScale = bpPerPixel

            this.sampleYStart = undefined
            for (let f of features) {

                if (f.end < bpStart) continue
                if (f.start > bpEnd) break

                const sampleKey = f.sampleKey || f.sample
                f.row = samples[sampleKey]
                const y = f.row * rowHeight + border

                if (undefined === this.sampleYStart) {
                    this.sampleYStart = y
                }

                const bottom = y + rowHeight

                if (bottom < pixelTop || y > pixelBottom) {
                    continue
                }

                const segmentStart = Math.max(f.start, bpStart)
                // const segmentStart = segment.start;
                let x = Math.round((segmentStart - bpStart) / xScale)

                const segmentEnd = Math.min(f.end, bpEnd)
                // const segmentEnd = segment.end;
                const x1 = Math.round((segmentEnd - bpStart) / xScale)
                let w = Math.max(1, x1 - x)

                let color
                if (this.color) {
                    if (typeof this.color === "function") {
                        color = this.color(f)
                    } else {
                        color = this.color
                    }
                } else if (this.colorTable) {
                    color = this.colorTable.getColor(f.value.toLowerCase())
                }

                let h
                if ("mut" === this.type) {
                    h = rowHeight - 2 * border
                    if (w < 3) {
                        w = 3
                        x -= 1
                    }
                } else {
                    // Assume seg track
                    let value = f.value
                    if (!this.isLog) {
                        value = IGVMath.log2(value / 2)
                    }
                    if (value < -0.1) {
                        color = this.negColorScale.getColor(value)
                    } else if (value > 0.1) {
                        color = this.posColorScale.getColor(value)
                    } else {
                        color = "white"
                    }

                    let sh = rowHeight
                    if (rowHeight < 0.25) {
                        const f = 0.1 + 2 * Math.abs(value)
                        sh = Math.min(1, f * rowHeight)
                    }
                    h = sh - 2 * border
                }


                f.pixelRect = {x, y, w, h}

                // Use for diagnostic rendering
                // context.fillStyle = randomRGB(180, 240)
                // context.fillStyle = randomGrey(200, 255)
                context.fillStyle = color
                context.fillRect(x, y, w, h)
            }

        } else {
            //console.log("No feature list");
        }

    }


    checkForLog(features) {
        if (this.isLog === undefined) {
            this.isLog = false
            for (let feature of features) {
                if (feature.value < 0) {
                    this.isLog = true
                    return
                }
            }
        }
    }

    /**
     * Optional method to compute pixel height to accomodate the list of features.  The implementation below
     * has side effects (modifiying the samples hash).  This is unfortunate, but harmless.
     *
     * Note displayMode "FILL" is handled by the viewport
     *
     * @param features
     * @returns {number}
     */
    computePixelHeight(features) {
        if (!features) return 0
        const sampleHeight = ("SQUISHED" === this.displayMode) ? this.squishedRowHeight : this.expandedRowHeight
        this.updateSampleKeys(features)
        return this.sampleKeys.length * sampleHeight
    }

    /**
     * Sort samples by the average value over the genomic range in the direction indicated (1 = ascending, -1 descending)
     */
    async sortSamples(chr, start, end, direction, featureList) {

        if (!featureList) {
            featureList = await this.featureSource.getFeatures({chr, start, end})
        }
        if (!featureList) return

        this.updateSampleKeys(featureList)

        const scores = {}
        const d2 = (direction === "ASC" ? 1 : -1)

        const sortSeg = () => {
            // Compute weighted average score for each sample
            const bpLength = end - start + 1
            for (let segment of featureList) {
                if (segment.end < start) continue
                if (segment.start > end) break
                const min = Math.max(start, segment.start)
                const max = Math.min(end, segment.end)
                const f = (max - min) / bpLength
                const sampleKey = segment.sampleKey || segment.sample
                const s = scores[sampleKey] || 0
                scores[sampleKey] = s + f * segment.value
            }

            // Now sort sample names by score
            this.sampleKeys.sort(function (a, b) {
                let s1 = scores[a]
                let s2 = scores[b]
                if (!s1) s1 = d2 * Number.MAX_VALUE
                if (!s2) s2 = d2 * Number.MAX_VALUE
                if (s1 === s2) return 0
                else if (s1 > s2) return d2
                else return d2 * -1
            })
        }

        const sortMut = () => {
            // Compute weighted average score for each sample
            for (let segment of featureList) {
                if (segment.end < start) continue
                if (segment.start > end) break
                const sampleKey = segment.sampleKey || segment.sample
                if (!scores.hasOwnProperty(sampleKey) || segment.value.localeCompare(scores[sampleKey]) > 0) {
                    scores[sampleKey] = segment.value
                }
            }
            // Now sort sample names by score
            this.sampleKeys.sort(function (a, b) {
                let sa = scores[a] || ""
                let sb = scores[b] || ""
                return d2 * (sa.localeCompare(sb))
            })
        }

        if ("mut" === this.type) {
            sortMut()
        } else {
            sortSeg()
        }

        this.trackView.repaintViews()

    }

    clickedFeatures(clickState, features) {

        const allFeatures = super.clickedFeatures(clickState, features)
        const y = clickState.y
        return allFeatures.filter(function (feature) {
            const rect = feature.pixelRect
            return rect && y >= rect.y && y <= (rect.y + rect.h)
        })

    }

    popupData(clickState, featureList) {

        featureList = this.clickedFeatures(clickState)

        const items = []

        for (let feature of featureList) {

            // Double line divider between features
            if (items.length > 0) {
                items.push('<hr/>')
                items.push('<hr/>')
            }

            // hack for whole genome features, which save the original feature as "_f"
            const f = feature._f || feature

            const data = (typeof f.popupData === 'function') ?
                f.popupData(this.type, this.browser.genome.id) :
                this.extractPopupData(f)
            Array.prototype.push.apply(items, data)

        }

        return items
    }

    contextMenuItemList(clickState) {

        const referenceFrame = clickState.viewport.referenceFrame
        const genomicLocation = clickState.genomicLocation

        // Define a region 5 "pixels" wide in genomic coordinates
        const sortDirection = this.config.sort ?
            (this.config.sort.direction === "ASC" ? "DESC" : "ASC") :      // Toggle from previous sort
            "DESC"
        const bpWidth = referenceFrame.toBP(2.5)

        const sortHandler = (sort) => {
            const viewport = clickState.viewport
            const features = viewport.getCachedFeatures()
            this.sortSamples(sort.chr, sort.start, sort.end, sort.direction, features)
        }

        const sortLabel = this.type === 'seg' ? 'Sort by value' : 'Sort by type'

        return [
            {
                label: sortLabel, click: (e) => {


                    const sort = {
                        direction: sortDirection,
                        chr: clickState.viewport.referenceFrame.chr,
                        start: genomicLocation - bpWidth,
                        end: genomicLocation + bpWidth

                    }

                    sortHandler(sort)

                    this.config.sort = sort

                }
            }]

    }

    supportsWholeGenome() {
        return (this.config.indexed === false || !this.config.indexURL) && this.config.supportsWholeGenome !== false
    }

    updateSampleKeys(featureList) {

        if (this.explicitSamples) return

        for (let feature of featureList) {
            const sampleKey = feature.sampleKey || feature.sample
            if (!this.sampleNames.has(sampleKey)) {
                this.sampleNames.set(sampleKey, feature.sample)
                this.sampleKeys.push(sampleKey)
            }
        }
    }
}

// Mut and MAF file default color table

const MUT_COLORS = {

    "indel": "rgb(0,200,0)",
    "targeted region": "rgb(236,155,43)",
    "truncating": "rgb(	150,0,0)",
    "non-coding transcript": "rgb(0,0,150)",

    // Colors from https://www.nature.com/articles/nature11404
    "synonymous": "rgb(109,165,95)",
    "silent": "rgb(109,135,80)",
    "missense_mutation": "rgb(72,130,187)",
    "missense": "rgb(72,130,187)",
    "splice site": "rgb(143,83,155)",
    "splice_region": "rgb(143,83,155)",
    "nonsense": "rgb(216, 57,81)",
    "nonsense_mutation": "rgb(216, 57,81)",
    "frame_shift_del": "rgb(226,135,65)",
    "frame_shift_ins": "rgb(226,135,65)",
    "in_frame_del": "rgb(247,235,94)",
    "in_frame_ins": "rgb(247,235,94)",
    "*other*": "rgb(159,91,50)"
    //
    // 3'Flank
    // 3'UTR
    // 5'Flank
    // 5'UTR
    // Frame_Shift_Del
    // Frame_Shift_Ins
    // IGR
    // In_Frame_Del
    // In_Frame_Ins
    // Intron
    // Missense_Mutation
    // Nonsense_Mutation
    // Nonstop_Mutation
    // RNA
    // Silent
    // Splice_Region
    // Splice_Site
    // Translation_Start_Site
    // Variant_Classification

}

export default SegTrack
