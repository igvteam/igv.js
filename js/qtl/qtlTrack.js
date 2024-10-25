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
import {searchFeatures} from "../search.js"

class QTLTrack extends TrackBase {

    constructor(config, browser) {

        super(config, browser)
    }

    init(config) {
        super.init(config)

        this.type = "qtl"
        this.name = config.name

        const min = config.minLogP || config.min
        const max = config.maxLogP || config.max
        this.dataRange = {
            min: min !== undefined ? min :  3.5,
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
        this.disableButtons = config.disableButtons

        this.featureSource = FeatureSource(config, this.browser.genome)
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
        const visibilityWindow = this.visibilityWindow
        const features = await this.featureSource.getFeatures({chr, start, end, visibilityWindow})
        return features
    }

    draw(options) {

        const {context, referenceFrame, pixelWidth, pixelHeight} = options

        if (this.background) {
            IGVGraphics.fillRect(context, 0, 0, pixelWidth, pixelHeight, {'fillStyle': this.background})
        }
        IGVGraphics.strokeLine(context, 0, pixelHeight - 1, pixelWidth, pixelHeight - 1, {'strokeStyle': this.divider})

        referenceFrame.feature && referenceFrame.feature.match(/RS[0-9]+/)

        const drawEqtls = (drawSelected) => {

            const radius = drawSelected ? 2 * this.dotSize : this.dotSize
            const bpStart = options.bpStart
            const yScale = (this.dataRange.max - this.dataRange.min) / pixelHeight

            for (let eqtl of options.features) {

                const px = (eqtl.start - bpStart + 0.5) / options.bpPerPixel
                if (px < 0) continue
                else if (px > pixelWidth) break

                const phenotype = eqtl.phenotype
                let isSelected
                // 3 modes, specific qtl, snp, or phenotype (e.g. gene) focused.
                if (this.browser.qtlSelections.qtl) {
                    isSelected = compareQTLs(this.browser.qtlSelections.qtl, eqtl)
                } else if (this.browser.qtlSelections.snps.size > 0) {
                    isSelected = this.browser.qtlSelections.hasSnp(eqtl.snp) &&
                        this.browser.qtlSelections.hasPhenotype(phenotype)
                } else {
                    isSelected = this.browser.qtlSelections.hasPhenotype(phenotype)
                }

                if (!drawSelected || isSelected) {

                    var mLogP = -Math.log(eqtl.pValue) / Math.LN10
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
                        if (drawSelected && isSelected) {
                            color = this.browser.qtlSelections.colorForGene(phenotype)
                            IGVGraphics.setProperties(context, {fillStyle: color, strokeStyle: "black"})
                        } else {
                            color = capped ? "rgb(150, 150, 150)" : "rgb(180, 180, 180)"
                            IGVGraphics.setProperties(context, {fillStyle: color, strokeStyle: color})
                        }

                        IGVGraphics.fillCircle(context, px, py, radius)
                        IGVGraphics.strokeCircle(context, px, py, radius)
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
    popupData(clickState, features) {

        if (features === undefined) features = clickState.viewport.cachedFeatures
        if (!features || features.length === 0) return []

        const tolerance = 3
        const tissue = this.name
        const popupData = []

        for (let feature of this._clickedFeatures(clickState, features)) {
            if (popupData.length > 0) {
                popupData.push('<hr/>')
            }
            if (typeof feature.popupData === 'function') {
                popupData.push(...feature.popupData(clickState))
            } else {
                popupData.push(
                    {name: "snp id", value: feature.snp},
                    {name: "gene id", value: feature.gencodeId},
                    {name: "gene name", value: feature.geneSymbol},
                    {name: "p value", value: feature.pValue},
                    {name: "tissue", value: tissue})
            }
        }
        return popupData
    }

    _clickedFeatures(clickState, features) {
        const dist = (f, cs) => {
            return Math.sqrt((f.px - cs.canvasX) * (f.px - cs.canvasX) + (f.py - cs.canvasY) * (f.py - cs.canvasY))
        }

        const tolerance = 6
        const candidateFeatures = features.filter(feature => dist(feature, clickState) < tolerance)

        if (candidateFeatures.length > 1) {
            candidateFeatures.sort((a, b) => dist(a, clickState) - dist(b, clickState))
            const firstD = dist(candidateFeatures[0], clickState)
            return candidateFeatures.filter(f => dist(f, clickState) <= firstD)
        } else {
            return candidateFeatures
        }

    }

    contextMenuItemList(clickState) {

        const menuData = []

        // We use the cached features rather than method to avoid async load.  If the
        // feature is not already loaded this won't work,  but the user wouldn't be mousing over it either.
        const features = clickState.viewport.cachedFeatures
        if (features) {
            const clickedFeatures = this._clickedFeatures(clickState, features)
            if (clickedFeatures.length > 0) {
                menuData.push({
                    label: `Highlight associated features`,
                    click: async () => {
                        this.browser.qtlSelections.clear()
                        for (let f of clickedFeatures) {
                            this.browser.qtlSelections.qtl = f
                            this.browser.qtlSelections.addPhenotype(f.phenotype)
                        }
                        this.browser.repaintViews()
                    }
                })
                menuData.push('<hr\>')
            }
        }
        return menuData

    }

    menuItemList() {
        const menuItems = []
        menuItems.push(...this.numericDataMenuItems())
        menuItems.push('<hr/>')

        function dialogPresentationHandler(ev) {

            this.browser.inputDialog.present({
                label: 'Search for snp or phenotype',
                value: '',
                callback: async (term) => {

                    if (term) {
                        term = term.trim().toUpperCase()

                        // Find qtls from this track matching either snp or phenotype
                        const matching = f => {
                            return ((f.phenotype && f.phenotype.toUpperCase()) === term || (f.snp && f.snp.toUpperCase() === term)) &&
                                -Math.log(f.pValue) / Math.LN10 > this.dataRange.min
                        }
                        let matchingFeatures = await this.featureSource.findFeatures(matching)
                        if (matchingFeatures.length == 0) {
                            // Possibly move to another genomic locus containing the search term
                            const found = await this.browser.search(term)
                            if (found) {
                                matchingFeatures = await this.featureSource.findFeatures(matching)
                            }
                        }

                        // Add found features to qtlSelections and compute spanned genomic region.  Currently
                        // this only works for cis-QTLs
                        let chr, start, end
                        if (matchingFeatures.length > 0) {
                            this.browser.qtlSelections.clear()
                            const genes = new Set()
                            chr = matchingFeatures[0].chr
                            start = matchingFeatures[0].start
                            end = matchingFeatures[0].end
                            for (let qtl of matchingFeatures) {
                                if (qtl.snp && qtl.snp.toUpperCase() === term) {
                                    this.browser.qtlSelections.addSnp(qtl.snp)
                                }
                                this.browser.qtlSelections.addPhenotype(qtl.phenotype)
                                genes.add(qtl.phenotype)

                                if (qtl.chr === chr) {
                                    start = Math.min(start, qtl.start)
                                    end = Math.max(end, qtl.end)
                                } else {
                                    // TODO split screen?
                                }
                            }


                            // possibly Expand region to bring phenotype in view
                            const canonicalChrName = this.browser.genome.getChromosomeName(chr)
                            for (let term of genes) {
                                const feature = await searchFeatures(this.browser, term)
                                if (feature) {
                                    if (canonicalChrName === this.browser.genome.getChromosomeName(feature.chr)) {
                                        start = Math.min(start, feature.start)
                                        end = Math.max(end, feature.end)
                                    } else {
                                        // TODO split screen?
                                    }
                                }
                            }

                            const flanking = Math.floor(0.1 * (end - start))
                            start = Math.max(0, start - flanking)
                            end += flanking

                            await this.browser.search(`${chr}:${start}-${end}`)
                        }
                    }
                }
            }, ev)
        }

        menuItems.push({label: 'Search for...', dialog: dialogPresentationHandler})

        return menuItems
    }

    doAutoscale(featureList) {

        let max = this.config.max || 25 // default
        if(featureList.length > 0) {
            const values = featureList.map(eqtl => -Math.log(eqtl.pValue) / Math.LN10)
            values.sort((a, b) => a-b)
            const k = Math.floor(values.length * (this.autoscalePercentile / 100))
            max = values[k]
        }
        this.dataRange.max = Math.max(max, 10)
        return this.dataRange
    }

}


function compareQTLs(a, b) {
    return a.chr === b.chr && a.start === b.start && a.pValue === b.pValue
}

export default QTLTrack
