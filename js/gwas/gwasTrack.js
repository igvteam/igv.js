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
import {BinnedColorScale, ConstantColorScale} from "../util/colorScale.js"
import {doAutoscale} from "../util/igvUtils.js"
import GWASColors from "./gwasColors.js"
import {ColorTable} from "../util/colorPalletes.js"
import {StringUtils} from "../../node_modules/igv-utils/src/index.js"

const DEFAULT_POPOVER_WINDOW = 100000000

//const type = "gwas";

class GWASTrack extends TrackBase {

    constructor(config, browser) {

        super(config, browser)
    }

    init(config) {

        super.init(config)

        this.useChrColors = config.useChrColors === undefined ? true : config.useChrColors
        this.trait = config.trait
        this.posteriorProbability = config.posteriorProbability
        this.valueProperty = "bed" === config.format ? "score" : "value"
        this.height = config.height || 100   // The preferred height
        this.autoscale = config.autoscale
        this.autoscalePercentile = config.autoscalePercentile === undefined ? 98 : config.autoscalePercentile
        this.background = config.background    // No default
        this.divider = config.divider || "rgb(225,225,225)"
        this.dotSize = config.dotSize || 3
        this.popoverWindow = (config.popoverWindow === undefined ? DEFAULT_POPOVER_WINDOW : config.popoverWindow)

        // Color settings
        if (this.useChrColors) {
            this.colorScale = new ColorTable(config.colorTable || GWASColors)
        } else if (config.color) {
            this.colorScale = new ConstantColorScale(config.color)
        } else {
            this.colorScale =
                new BinnedColorScale(config.colorScale ||
                    {
                        thresholds: [5e-8, 5e-4, 0.5],
                        colors: ["rgb(255,50,50)", "rgb(251,100,100)", "rgb(251,170,170)", "rgb(227,238,249)"],
                    })
        }

        this.featureSource = FeatureSource(config, this.browser.genome)
    }

    async postInit() {

        if (typeof this.featureSource.getHeader === "function") {
            this.header = await this.featureSource.getHeader()
            if (this.disposed) return   // This track was removed during async load
        }

        // Set properties from track line
        if (this.header) {
            this.setTrackProperties(this.header)   // setTrackProperties defined in TrackBase
        }

        // Set initial range if specfied, unless autoscale == true
        if (!this.autoscale) {
            if (this.posteriorProbability) {
                this.dataRange = {
                    min: this.config.min === undefined ? 0 : this.config.min,
                    max: this.config.max === undefined ? 1 : this.config.max
                }
            } else {
                this.dataRange = {
                    min: this.config.min === undefined ? 0 : this.config.min,
                    max: this.config.max === undefined ? 25 : this.config.max
                }
            }
        }

        this._initialColor = this.color || this.constructor.defaultColor
        this._initialAltColor = this.altColor || this.constructor.defaultColor

        return this

    }


    get supportsWholeGenome() {
        return true
    }

    async getFeatures(chr, start, end) {
        const visibilityWindow = this.visibilityWindow
        return this.featureSource.getFeatures({chr, start, end, visibilityWindow})
    }

    draw(options) {

        const featureList = options.features
        const ctx = options.context
        const pixelWidth = options.pixelWidth
        const pixelHeight = options.pixelHeight
        if (this.background) {
            IGVGraphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': this.background})
        }
        IGVGraphics.strokeLine(ctx, 0, pixelHeight - 1, pixelWidth, pixelHeight - 1, {'strokeStyle': this.divider})

        if (featureList) {

            const bpPerPixel = options.bpPerPixel
            const bpStart = options.bpStart
            const bpEnd = bpStart + pixelWidth * bpPerPixel + 1
            for (let variant of featureList) {
                const pos = variant.start
                if (pos < bpStart) continue
                if (pos > bpEnd) break

                let val
                if (this.posteriorProbability) {
                    val = variant[this.valueProperty]
                } else {
                    const pvalue = variant[this.valueProperty]
                    if (!pvalue) continue
                    val = -Math.log10(pvalue)
                }

                const colorKey = this.useChrColors ?
                    variant._f ? variant._f.chr : variant.chr :
                    val

                const color = this.colorScale.getColor(colorKey)
                const yScale = (this.dataRange.max - this.dataRange.min) / pixelHeight
                const px = Math.round((pos - bpStart) / bpPerPixel)
                const py = Math.max(this.dotSize, pixelHeight - Math.round((val - this.dataRange.min) / yScale))

                if (color) {
                    IGVGraphics.setProperties(ctx, {fillStyle: color, strokeStyle: "black"})
                }
                IGVGraphics.fillCircle(ctx, px, py, this.dotSize)
                variant.px = px
                variant.py = py
            }
        }
    }

    paintAxis(ctx, pixelWidth, pixelHeight) {

        IGVGraphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"})
        var font = {
            'font': 'normal 10px Arial',
            'textAlign': 'right',
            'strokeStyle': "black"
        }

        const yScale = (this.dataRange.max - this.dataRange.min) / pixelHeight
        if (this.posteriorProbability) {
            const n = 0.1
            for (let p = this.dataRange.min; p < this.dataRange.max; p += n) {
                const yp = pixelHeight - Math.round((p - this.dataRange.min) / yScale)
                IGVGraphics.strokeLine(ctx, 45, yp - 2, 50, yp - 2, font) // Offset dashes up by 2 pixel
                IGVGraphics.fillText(ctx, p.toFixed(1), 44, yp + 2, font) // Offset numbers down by 2 pixels;
            }
        } else {
            const n = Math.ceil((this.dataRange.max - this.dataRange.min) * 10 / pixelHeight)
            for (let p = this.dataRange.min; p < this.dataRange.max; p += n) {
                const yp = pixelHeight - Math.round((p - this.dataRange.min) / yScale)
                IGVGraphics.strokeLine(ctx, 45, yp, 50, yp, font) // Offset dashes up by 2 pixel
                IGVGraphics.fillText(ctx, Math.floor(p), 44, yp + 4, font) // Offset numbers down by 2 pixels;
            }
        }

        font['textAlign'] = 'center'
        if (this.posteriorProbability) {
            IGVGraphics.fillText(ctx, "PPA", pixelWidth / 2, pixelHeight / 2, font, {rotate: {angle: -90}})
        } else {
            IGVGraphics.fillText(ctx, "-log10(pvalue)", pixelWidth / 2, pixelHeight / 2, font, {rotate: {angle: -90}})
        }
    }

    popupData(clickState, features) {

        if (features === undefined) features = clickState.viewport.cachedFeatures

        let data = []
        const track = clickState.viewport.trackView.track

        if (features) {
            let count = 0
            for (let f of features) {
                const xDelta = Math.abs(clickState.canvasX - f.px)
                const yDelta = Math.abs(clickState.canvasY - f.py)
                if (xDelta < this.dotSize && yDelta < this.dotSize) {
                    if (count > 0) {
                        data.push("<HR/>")
                    }
                    if (count == 5) {
                        data.push("...")
                        break
                    }
                    f = f._f || f     // Extract "real" feature from potential psuedo feature (e.g. whole genome)
                    if (typeof f.popupData === 'function') {
                        data = data.concat(f.popupData())
                    } else {
                        const value = f[this.valueProperty]
                        const chr = f.chr
                        const pos = StringUtils.numberFormatter(f.start + 1)
                        data.push({name: 'chromosome', value: chr})
                        data.push({name: 'position', value: pos})
                        data.push({name: 'name', value: f.name})
                        if (track.posteriorProbability) {
                            data.push({name: 'posterior probability', value: value})
                        } else {
                            data.push({name: 'pValue', value: value})
                        }
                    }
                    count++
                }
            }
        }

        return data
    }

    menuItemList() {
        return this.numericDataMenuItems()
    }

    doAutoscale(featureList) {

        if (featureList.length > 0) {
            // posterior probabilities are treated without modification, but we need to take a negative logarithm of P values
            const valueProperty = this.valueProperty
            const posterior = this.posteriorProbability
            const features =
                featureList.map(function (feature) {
                    const v = feature[valueProperty]
                    return {value: posterior ? v : -Math.log(v) / Math.LN10}
                })
            this.dataRange = doAutoscale(features)

        } else {
            // No features -- pick something reasonable for PPAs and p-values
            if (this.posteriorProbability) {
                this.dataRange = {min: this.config.min || 0, max: this.config.max || 1}
            } else {
                this.dataRange = {min: this.config.max || 25, max: this.config.min || 0}
            }
        }

        return this.dataRange
    }

}

export default GWASTrack

