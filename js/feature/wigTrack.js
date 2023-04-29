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

import FeatureSource from './featureSource.js'
import TDFSource from "../tdf/tdfSource.js"
import TrackBase from "../trackBase.js"
import BWSource from "../bigwig/bwSource.js"
import IGVGraphics from "../igv-canvas.js"
import paintAxis from "../util/paintAxis.js"
import {IGVColor, StringUtils} from "../../node_modules/igv-utils/src/index.js"
import MenuUtils from "../ui/menuUtils.js"

class WigTrack extends TrackBase {

    static defaults = {
        height: 50,
        color: 'rgb(150, 150, 150)',
        altColor: 'rgb(150, 150, 150)',
        flipAxis: false,
        logScale: false,
        windowFunction: 'mean',
        graphType: 'bar',
        autoscale: true,
        normalize: undefined,
        scaleFactor: undefined
    }

    constructor(config, browser) {
        super(config, browser)
    }

    init(config) {

        super.init(config)

        this.type = "wig"
        this.featureType = 'numeric'
        this.paintAxis = paintAxis

        const format = config.format ? config.format.toLowerCase() : config.format
        if (config.featureSource) {
            this.featureSource = config.featureSource
            delete config.featureSource
        } else if ("bigwig" === format) {
            this.featureSource = new BWSource(config, this.browser.genome)
            this.resolutionAware = true
        } else if ("tdf" === format) {
            this.featureSource = new TDFSource(config, this.browser.genome)
            this.resolutionAware = true
        } else {
            this.featureSource = FeatureSource(config, this.browser.genome)
            this.resolutionAware = false
        }


        // Override autoscale default
        if(config.max === undefined || config.autoscale === true) {
            this.autoscale = true
        } else {
            this.dataRange = {
                min: config.min || 0,
                max: config.max
            }
        }
    }

    async postInit() {
        const header = await this.getHeader()
        if (this.disposed) return   // This track was removed during async load
        if (header) this.setTrackProperties(header)
    }

    async getFeatures(chr, start, end, bpPerPixel) {
        const features = await this.featureSource.getFeatures({
            chr,
            start,
            end,
            bpPerPixel,
            visibilityWindow: this.visibilityWindow,
            windowFunction: this.windowFunction
        })
        if (this.normalize && this.featureSource.normalizationFactor) {
            const scaleFactor = this.featureSource.normalizationFactor
            for (let f of features) {
                f.value *= scaleFactor
            }
        }
        if (this.scaleFactor) {
            const scaleFactor = this.scaleFactor
            for (let f of features) {
                f.value *= scaleFactor
            }
        }
        return features
    }

    menuItemList() {
        let items = []

        if (this.flipAxis !== undefined) {
            items.push('<hr>')
            items.push({
                label: "Flip y-axis",
                click: () => {
                    this.flipAxis = !this.flipAxis
                    this.trackView.repaintViews()
                }
            })
        }

        items = items.concat(MenuUtils.numericDataMenuItems(this.trackView))

        return items
    }

    async getHeader() {

        if (typeof this.featureSource.getHeader === "function") {
            this.header = await this.featureSource.getHeader()
        }
        return this.header
    }

    // TODO: refactor to igvUtils.js
    getScaleFactor(min, max, height, logScale) {
        const scale = logScale ? height / (Math.log10(max + 1) - (min <= 0 ? 0 : Math.log10(min + 1))) : height / (max - min)
        return scale
    }

    computeYPixelValue(yValue, yScaleFactor) {
        return (this.flipAxis ? (yValue - this.dataRange.min) : (this.dataRange.max - yValue)) * yScaleFactor
    }

    computeYPixelValueInLogScale(yValue, yScaleFactor) {
        let maxValue = this.dataRange.max
        let minValue = this.dataRange.min
        if (maxValue <= 0) return 0 // TODO:
        if (minValue <= -1) minValue = 0
        minValue = (minValue <= 0) ? 0 : Math.log10(minValue + 1)
        maxValue = Math.log10(maxValue + 1)
        yValue = Math.log10(yValue + 1)
        return ((this.flipAxis ? (yValue - minValue) : (maxValue - yValue)) * yScaleFactor)
    }

    draw(options) {

        const features = options.features
        const ctx = options.context
        const bpPerPixel = options.bpPerPixel
        const bpStart = options.bpStart
        const pixelWidth = options.pixelWidth
        const pixelHeight = options.pixelHeight
        const bpEnd = bpStart + pixelWidth * bpPerPixel + 1
        const posColor = this.color || WigTrack.defaults.color

        let baselineColor
        if (typeof posColor === "string" && posColor.startsWith("rgb(")) {
            baselineColor = IGVColor.addAlpha(posColor, 0.1)
        }
        let lastNegValue = 1
        const scaleFactor = this.getScaleFactor(this.dataRange.min, this.dataRange.max, options.pixelHeight, this.logScale)
        const yScale = (yValue) => this.logScale
            ? this.computeYPixelValueInLogScale(yValue, scaleFactor)
            : this.computeYPixelValue(yValue, scaleFactor)

        if (features && features.length > 0) {

            if (this.dataRange.min === undefined) this.dataRange.min = 0

            // Max can be less than min if config.min is set but max left to autoscale.   If that's the case there is
            // nothing to paint.
            if (this.dataRange.max > this.dataRange.min) {

                let lastPixelEnd = -1
                let lastY
                const y0 = yScale(0)
                for (let f of features) {

                    if (f.end < bpStart) continue
                    if (f.start > bpEnd) break

                    const x = Math.floor((f.start - bpStart) / bpPerPixel)
                    if (isNaN(x)) continue

                    let y = yScale(f.value)

                    const rectEnd = Math.ceil((f.end - bpStart) / bpPerPixel)
                    const width = Math.max(1, rectEnd - x)

                    const color = this.getColorForFeature(f)

                    if (this.graphType === "points") {
                        const pointSize = this.config.pointSize || 3
                        const px = x + width / 2
                        IGVGraphics.fillCircle(ctx, px, y, pointSize / 2, {"fillStyle": color, "strokeStyle": color})

                    } else if (this.graphType === "line") {
                        if (lastY != undefined) {
                            IGVGraphics.strokeLine(ctx, lastPixelEnd, lastY, x, y, {
                                "fillStyle": color,
                                "strokeStyle": color
                            })
                        }
                        IGVGraphics.strokeLine(ctx, x, y, x + width, y, {"fillStyle": color, "strokeStyle": color})
                    } else {
                        const height = y - y0
                        IGVGraphics.fillRect(ctx, x, y0, width, height, {fillStyle: color})

                    }
                    lastPixelEnd = x + width
                    lastY = y
                }

                // If the track includes negative values draw a baseline
                if (this.dataRange.min < 0) {
                    const basepx = (this.dataRange.max / (this.dataRange.max - this.dataRange.min)) * options.pixelHeight
                    IGVGraphics.strokeLine(ctx, 0, basepx, options.pixelWidth, basepx, {strokeStyle: baselineColor})
                }
            }
        }

        // Draw guidelines
        if (this.config.hasOwnProperty('guideLines')) {
            for (let line of this.config.guideLines) {
                if (line.hasOwnProperty('color') && line.hasOwnProperty('y') && line.hasOwnProperty('dotted')) {
                    let y = yScale(line.y)
                    let props = {
                        'strokeStyle': line['color'],
                        'strokeWidth': 2
                    }
                    if (line['dotted']) IGVGraphics.dashedLine(options.context, 0, y, options.pixelWidth, y, 5, props)
                    else IGVGraphics.strokeLine(options.context, 0, y, options.pixelWidth, y, props)
                }
            }
        }
    }

    popupData(clickState, features) {

        if (features === undefined) features = this.clickedFeatures(clickState)

        if (features && features.length > 0) {

            const genomicLocation = clickState.genomicLocation
            const popupData = []

            // Sort features based on distance from click
            features.sort(function (a, b) {
                const distA = Math.abs((a.start + a.end) / 2 - genomicLocation)
                const distB = Math.abs((b.start + b.end) / 2 - genomicLocation)
                return distA - distB
            })

            // Display closest 10
            const displayFeatures = features.length > 10 ? features.slice(0, 10) : features

            // Resort in ascending order
            displayFeatures.sort(function (a, b) {
                return a.start - b.start
            })

            for (let selectedFeature of displayFeatures) {
                if (selectedFeature) {
                    if (popupData.length > 0) {
                        popupData.push('<hr/>')
                    }
                    let posString = (selectedFeature.end - selectedFeature.start) === 1 ?
                        StringUtils.numberFormatter(selectedFeature.start + 1)
                        : StringUtils.numberFormatter(selectedFeature.start + 1) + "-" + StringUtils.numberFormatter(selectedFeature.end)
                    popupData.push({name: "Position:", value: posString})
                    popupData.push({
                        name: "Value:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;",
                        value: StringUtils.numberFormatter(selectedFeature.value)
                    })
                }
            }
            if (displayFeatures.length < features.length) {
                popupData.push("<hr/>...")
            }

            return popupData

        } else {
            return []
        }
    }

    get supportsWholeGenome() {
        return !this.config.indexURL && this.config.supportsWholeGenome !== false
    }

    /**
     * Return color for feature.
     * @param feature
     * @returns {string}
     */

    getColorForFeature(f) {
        let c = (f.value < 0 && this.altColor) ? this.altColor : this.color || WigTrack.defaults.color
        return (typeof c === "function") ? c(f.value) : c
    }

    /**
     * Called when the track is removed.  Do any needed cleanup here
     */
    dispose() {
        this.trackView = undefined
    }

}


export default WigTrack
