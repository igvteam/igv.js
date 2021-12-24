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

import FeatureSource from '../feature/featureSource.js'
import TrackBase from "../trackBase.js"
import IGVGraphics from "../igv-canvas.js"
import {IGVMath} from "../../node_modules/igv-utils/src/index.js"
import MenuUtils from "../ui/menuUtils.js"
import GtexUtils from "./gtexUtils.js"

class EqtlTrack extends TrackBase {

    constructor(config, browser) {

        super(config, browser)
    }

    init(config) {
        super.init(config)

        this.name = config.name
        this.pValueField = config.pValueField || "pValue"
        this.geneField = config.geneField || "geneSymbol"
        this.snpField = config.snpField || "snp"

        const min = config.minLogP || config.min
        const max = config.maxLogP || config.max
        this.dataRange = {
            min: min || 3.5,
            max: max || 25
        }
        if (!max) {
            this.autoscale = true
        } else {
            this.autoscale = config.autoscale
        }
        this.autoscalePercentile = (config.autoscalePercentile === undefined ? 98 : config.autoscalePercentile)


        this.background = config.background    // No default
        this.divider = config.divider || "rgb(225,225,225)"
        this.dotSize = config.dotSize || 2
        this.height = config.height || 100
        this.autoHeight = false
        this.disableButtons = config.disableButtons

        // Limit visibility window to 2 mb,  gtex server gets flaky beyond that
        this.visibilityWindow = config.visibilityWindow === undefined ?
            2000000 : config.visibilityWindow >= 0 ? Math.min(2000000, config.visibilityWindow) : 2000000

        this.featureSource = FeatureSource(config, this.browser.genome)

        GtexUtils.gtexLoaded = true
    }

    paintAxis(ctx, pixelWidth, pixelHeight) {

        const yScale = (this.dataRange.max - this.dataRange.min) / pixelHeight

        const font = {
            'font': 'normal 10px Arial',
            'textAlign': 'right',
            'strokeStyle': "black"
        }

        IGVGraphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"})

        // Determine a tick spacing such that there is at least 10 pixels between ticks

        const n = Math.ceil((this.dataRange.max - this.dataRange.min) * 10 / pixelHeight)

        for (let p = 4; p <= this.dataRange.max; p += n) {

            // TODO: Dashes may not actually line up with correct scale. Ask Jim about this

            const ref = 0.85 * pixelWidth
            const x1 = ref - 5
            const x2 = ref
            const y = pixelHeight - (p - this.dataRange.min) / yScale

            IGVGraphics.strokeLine(ctx, x1, y, x2, y, font) // Offset dashes up by 2 pixel

            if (y > 8) {
                IGVGraphics.fillText(ctx, p, x1 - 1, y + 2, font)
            } // Offset numbers down by 2 pixels;
        }

        font['textAlign'] = 'center'

        IGVGraphics.fillText(ctx, "-log10(pvalue)", pixelWidth / 4, pixelHeight / 2, font, {rotate: {angle: -90}})

    };

    async getFeatures(chr, start, end) {

        const pValueField = this.pValueField
        const visibilityWindow = this.visibilityWindow
        const features = await this.featureSource.getFeatures({chr, start, end, visibilityWindow})
        features.forEach(function (f) {
            f.value = f[pValueField]
        })
        return features
    }

    draw(options) {

        const ctx = options.context

        const pixelWidth = options.pixelWidth
        const pixelHeight = options.pixelHeight

        if (this.background) {
            IGVGraphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': this.background})
        }
        IGVGraphics.strokeLine(ctx, 0, pixelHeight - 1, pixelWidth, pixelHeight - 1, {'strokeStyle': this.divider})

        const drawEqtls = (drawSelected) => {

            const radius = drawSelected ? 2 * this.dotSize : this.dotSize
            const bpStart = options.bpStart
            const yScale = (this.dataRange.max - this.dataRange.min) / pixelHeight
            const selection = options.referenceFrame.selection

            for (let eqtl of options.features) {

                const px = (eqtl.start - bpStart + 0.5) / options.bpPerPixel
                if (px < 0) continue
                else if (px > pixelWidth) break

                const snp = eqtl.snp.toUpperCase()
                const geneName = eqtl[this.geneField].toUpperCase()

                const isSelected = selection &&
                    (selection.snp === snp || selection.gene === geneName)

                if (!drawSelected || isSelected) {

                    // Add eqtl's gene to the selection if this is the selected snp.
                    // TODO -- this should not be done here in the rendering code.
                    if (selection && selection.snp === snp) {
                        selection.addGene(geneName)
                    }

                    var mLogP = -Math.log(eqtl[this.pValueField]) / Math.LN10
                    if (mLogP >= this.dataRange.min) {
                        let capped
                        if (mLogP > this.dataRange.max) {
                            mLogP = this.dataRange.max
                            capped = true
                        } else {
                            capped = false

                        }

                        const py = Math.max(0 + radius, pixelHeight - Math.round((mLogP - this.dataRange.min) / yScale))
                        eqtl.px = px
                        eqtl.py = py
                        eqtl.radius = radius

                        let color
                        if (drawSelected && selection) {
                            color = selection.colorForGene(geneName)
                            IGVGraphics.setProperties(ctx, {fillStyle: color, strokeStyle: "black"})
                        } else {
                            color = capped ? "rgb(150, 150, 150)" : "rgb(180, 180, 180)"
                            IGVGraphics.setProperties(ctx, {fillStyle: color, strokeStyle: color})
                        }

                        IGVGraphics.fillCircle(ctx, px, py, radius)
                        IGVGraphics.strokeCircle(ctx, px, py, radius)
                    }
                }
            }
        }

        // Draw in two passes, with "selected" eqtls drawn last
        drawEqtls(false)
        drawEqtls(true)

    }

    /**
     * Return "popup data" for feature @ genomic location.  Data is an array of key-value pairs
     */
    popupData(clickState) {

        let features = clickState.viewport.getCachedFeatures()
        if (!features || features.length === 0) return []

        const tolerance = 3
        const tissue = this.name
        const popupData = []

        for (let feature of features) {
            // Hit test --use square vs circle for efficiency (no sqrt)
            if (Math.abs(feature.px - clickState.canvasX) < (feature.radius + tolerance) &&
                Math.abs(feature.py - clickState.canvasY) < (feature.radius + tolerance)) {

                if (popupData.length > 0) {
                    popupData.push('<hr/>')
                }
                popupData.push(
                    {name: "snp id", value: feature.snp},
                    {name: "gene id", value: feature.geneId},
                    {name: "gene name", value: feature.geneName},
                    {name: "p value", value: feature.pValue},
                    {name: "tissue", value: tissue})

            }
        }

        return popupData
    }

    menuItemList() {
        return MenuUtils.numericDataMenuItems(this.trackView)
    }

    doAutoscale(featureList) {

        if (featureList.length > 0) {

            var values = featureList
                .map(function (eqtl) {
                    return -Math.log(eqtl.value) / Math.LN10
                })

            this.dataRange.max = IGVMath.percentile(values, this.autoscalePercentile)
        } else {
            // No features -- default
            const max = this.config.maxLogP || this.config.max
            this.dataRange.max = max || 25
        }

        return this.dataRange
    }

}

export default EqtlTrack
