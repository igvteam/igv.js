import FeatureSource from './featureSource.js'
import TDFSource from "../tdf/tdfSource.js"
import TrackBase from "../trackBase.js"
import BWSource from "../bigwig/bwSource.js"
import IGVGraphics from "../igv-canvas.js"
import paintAxis from "../util/paintAxis.js"
import { IGVColor, StringUtils } from "../../node_modules/igv-utils/src/index.js"
import $ from "../vendor/jquery-3.3.1.slim.js"
import { createCheckbox } from "../igv-icons.js"

const DEFAULT_COLOR = 'rgb(150, 150, 150)'

class WigTrack extends TrackBase {

    static defaults = {
        height: 50,
        flipAxis: false,
        logScale: false,
        windowFunction: 'mean',
        graphType: 'bar',
        normalize: undefined,
        scaleFactor: undefined,
        overflowColor: `rgb(255, 32, 255)`,
        baselineColor: 'lightGray',
        summarize: true
    }

    constructor(config, browser) {
        super(config, browser)
    }

    init(config) {
        super.init(config)

        this.type = "wig"
        this.featureType = 'numeric'
        this.resolutionAware = true
        this.paintAxis = paintAxis

        const format = config.format ? config.format.toLowerCase() : config.format
        if (config.featureSource) {
            this.featureSource = config.featureSource
            delete config.featureSource
        } else if ("bigwig" === format) {
            this.featureSource = new BWSource(config, this.browser.genome)
        } else if ("tdf" === format) {
            this.featureSource = new TDFSource(config, this.browser.genome)
        } else {
            this.featureSource = FeatureSource(config, this.browser.genome)
        }

        // Override autoscale default
        if (config.max === undefined || config.autoscale === true) {
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
        const windowFunction = this.windowFunction

        const features = await this.featureSource.getFeatures({
            chr,
            start,
            end,
            bpPerPixel,
            visibilityWindow: this.visibilityWindow,
            windowFunction
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

        // Summarize features to current resolution.  This needs to be done here, rather than in the "draw" function,
        // for group autoscale to work.
        if (this.summarize && ("mean" === windowFunction || "min" === windowFunction || "max" === windowFunction)) {
            return summarizeData(features, start, bpPerPixel, windowFunction)
        } else {
            return features
        }
    }

    menuItemList() {
        const items = []

        if (this.flipAxis !== undefined) {
            items.push('<hr>')

            function click() {
                this.flipAxis = !this.flipAxis
                this.trackView.repaintViews()
            }

            items.push({ label: 'Flip y-axis', click })
        }

        if (this.featureSource.windowFunctions) {
            items.push(...this.wigSummarizationItems())
        }

        items.push(...this.numericDataMenuItems())

        return items
    }

    wigSummarizationItems() {
        const windowFunctions = this.featureSource.windowFunctions

        const menuItems = []
        menuItems.push('<hr/>')
        menuItems.push("<div>Windowing function</div>")
        for (const wf of windowFunctions) {
            const object = createCheckbox(wf, this.windowFunction === wf)

            function clickHandler() {
                this.windowFunction = wf
                this.trackView.updateViews()
            }

            menuItems.push({ object, click: clickHandler })
        }

        return menuItems
    }

    async getHeader() {
        if (typeof this.featureSource.getHeader === "function") {
            this.header = await this.featureSource.getHeader()
        }
        return this.header
    }

    getScaleFactor(min, max, height, logScale) {
        return logScale ? height / (Math.log10(max + 1) - (min <= 0 ? 0 : Math.log10(min + 1))) : height / (max - min)
    }

    computeYPixelValue(yValue, yScaleFactor) {
        return (this.flipAxis ? (yValue - this.dataRange.min) : (this.dataRange.max - yValue)) * yScaleFactor
    }

    computeYPixelValueInLogScale(yValue, yScaleFactor) {
        let { min, max } = this.dataRange
        if (max <= 0) return 0 // TODO: handle case where max is non-positive
        if (min <= -1) min = 0
        min = (min <= 0) ? 0 : Math.log10(min + 1)
        max = Math.log10(max + 1)
        yValue = Math.log10(yValue + 1)
        return (this.flipAxis ? (yValue - min) : (max - yValue)) * yScaleFactor
    }

    draw(options) {
        const { features, context: ctx, bpPerPixel, bpStart, pixelWidth, pixelHeight } = options
        const bpEnd = bpStart + pixelWidth * bpPerPixel + 1
        const posColor = this.color || DEFAULT_COLOR

        const scaleFactor = this.getScaleFactor(this.dataRange.min, this.dataRange.max, pixelHeight, this.logScale)
        const yScale = this.logScale ? yValue => this.computeYPixelValueInLogScale(yValue, scaleFactor) : yValue => this.computeYPixelValue(yValue, scaleFactor)

        if (features && features.length > 0) {
            if (this.dataRange.min === undefined) this.dataRange.min = 0

            if (this.dataRange.max > this.dataRange.min) {
                let lastPixelEnd = -1
                let lastY
                const y0 = yScale(0)

                features.forEach(f => {
                    if (f.end < bpStart || f.start > bpEnd) return

                    const x = (f.start - bpStart) / bpPerPixel
                    if (isNaN(x)) return

                    const y = yScale(f.value)
                    const rectEnd = (f.end - bpStart) / bpPerPixel
                    const width = rectEnd - x
                    const color = options.alpha ? IGVColor.addAlpha(this.getColorForFeature(f), options.alpha) : this.getColorForFeature(f)

                    if (this.graphType === "line") {
                        if (lastY !== undefined) {
                            IGVGraphics.strokeLine(ctx, lastPixelEnd, lastY, x, y, { fillStyle: color, strokeStyle: color })
                        }
                        IGVGraphics.strokeLine(ctx, x, y, x + width, y, { fillStyle: color, strokeStyle: color })
                    } else if (this.graphType === "points") {
                        const pointSize = this.config.pointSize || 3
                        const px = x + width / 2
                        IGVGraphics.fillCircle(ctx, px, y, pointSize / 2, { fillStyle: color, strokeStyle: color })

                        if (f.value > this.dataRange.max) {
                            IGVGraphics.fillCircle(ctx, px, pointSize / 2, pointSize / 2, 3, { fillStyle: this.overflowColor })
                        } else if (f.value < this.dataRange.min) {
                            IGVGraphics.fillCircle(ctx, px, pixelHeight - pointSize / 2, pointSize / 2, 3, { fillStyle: this.overflowColor })
                        }

                    } else {
                        // Default graph type (bar)
                        const height = Math.min(pixelHeight, y - y0)
                        IGVGraphics.fillRect(ctx, x, y0, width, height, { fillStyle: color })
                        if (f.value > this.dataRange.max) {
                            IGVGraphics.fillRect(ctx, x, 0, width, 3, { fillStyle: this.overflowColor })
                        } else if (f.value < this.dataRange.min) {
                            IGVGraphics.fillRect(ctx, x, pixelHeight - 3, width, 3, { fillStyle: this.overflowColor })
                        }
                    }
                    lastPixelEnd = x + width
                    lastY = y
                })

                if (this.dataRange.min < 0) {
                    const ratio = this.dataRange.max / (this.dataRange.max - this.dataRange.min)
                    const basepx = this.flipAxis ? (1 - ratio) * pixelHeight : ratio * pixelHeight
                    IGVGraphics.strokeLine(ctx, 0, basepx, pixelWidth, basepx, { strokeStyle: this.baselineColor })
                }
            }
        }

        if (this.config.hasOwnProperty('guideLines')) {
            this.config.guideLines.forEach(line => {
                if (line.hasOwnProperty('color') && line.hasOwnProperty('y') && line.hasOwnProperty('dotted')) {
                    const y = yScale(line.y)
                    const props = {
                        strokeStyle: line.color,
                        strokeWidth: 2
                    }
                    if (line.dotted) IGVGraphics.dashedLine(ctx, 0, y, pixelWidth, y, 5, props)
                    else IGVGraphics.strokeLine(ctx, 0, y, pixelWidth, y, props)
                }
            })
        }
    }

    popupData(clickState, features = this.clickedFeatures(clickState)) {
        if (features.length === 0) return []

        const genomicLocation = clickState.genomicLocation
        const popupData = []

        features.sort((a, b) => {
            const distA = Math.abs((a.start + a.end) / 2 - genomicLocation)
            const distB = Math.abs((b.start + b.end) / 2 - genomicLocation)
            return distA - distB
        })

        const displayFeatures = features.length > 10 ? features.slice(0, 10) : features

        displayFeatures.sort((a, b) => a.start - b.start)

        displayFeatures.forEach(selectedFeature => {
            if (selectedFeature) {
                if (popupData.length > 0) {
                    popupData.push('<hr/>')
                }
                const posString = (selectedFeature.end - selectedFeature.start) === 1 ?
                    StringUtils.numberFormatter(Math.floor(selectedFeature.start) + 1) :
                    `${StringUtils.numberFormatter(Math.floor(selectedFeature.start) + 1)}-${StringUtils.numberFormatter(Math.floor(selectedFeature.end))}`
                popupData.push({ name: "Position:", value: posString })
                popupData.push({ name: "Value:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", value: StringUtils.numberFormatter(selectedFeature.value.toFixed(4)) })
            }
        })

        if (displayFeatures.length < features.length) {
            popupData.push("<hr/>...")
        }

        return popupData
    }

    get supportsWholeGenome() {
        return !this.config.indexURL && this.config.supportsWholeGenome !== false
    }

    getColorForFeature(f) {
        const c = (f.value < 0 && this.altColor) ? this.altColor : this.color || DEFAULT_COLOR
        return (typeof c === "function") ? c(f.value) : c
    }

    dispose() {
        this.trackView = undefined
    }

}

/**
 * Summarize wig data in bins of size "bpPerPixel" with the given window function.
 *
 * @param features  wig (numeric) data -- features cannot overlap, and are in ascending order by start position
 * @param startBP  bp start position for computing binned data
 * @param bpPerPixel  bp per pixel (bin)
 * @param windowFunction mean, min, or max
 * @returns {*|*[]}
 */
function summarizeData(features, startBP, bpPerPixel, windowFunction = "mean") {
    if (bpPerPixel <= 1 || !features || features.length === 0) {
        return features
    }

    const chr = features[0].chr
    const binSize = bpPerPixel
    const summaryFeatures = []

    const finishBin = (bin) => {
        const start = startBP + bin.bin * binSize
        const end = start + binSize
        let value
        switch (windowFunction) {
            case "mean":
                value = bin.sumData / bin.count
                break
            case "max":
                value = bin.max
                break
            case "min":
                value = bin.min
                break
            default:
                throw Error(`Unknown window function: ${windowFunction}`)
        }
        const description = `${windowFunction} of ${bin.count} values`
        summaryFeatures.push({ chr, start, end, value, description })
    }

    let currentBinData
    for (let f of features) {
        let startBin = Math.floor((f.start - startBP) / binSize)
        const endBin = Math.floor((f.end - startBP) / binSize)

        if (currentBinData && startBin === currentBinData.bin) {
            currentBinData.add(f)
            startBin++
        }

        if (!currentBinData || endBin > currentBinData.bin) {
            if (currentBinData) {
                finishBin(currentBinData)
            }

            if (endBin > startBin) {
                const end = startBP + endBin * binSize
                summaryFeatures.push({ chr, start: f.start, end, value: f.value })
            }

            currentBinData = new SummaryBinData(endBin, f)
        }

    }
    if (currentBinData) {
        finishBin(currentBinData)
    }

    const c = []
    let lastFeature = summaryFeatures[0]
    summaryFeatures.forEach(f => {
        if (lastFeature.value === f.value && f.start <= lastFeature.end) {
            lastFeature.end = f.end
        } else {
            c.push(lastFeature)
            lastFeature = f
        }
    })
    c.push(lastFeature)

    return c
}

class SummaryBinData {
    constructor(bin, feature) {
        this.bin = bin
        this.sumData = feature.value
        this.count = 1
        this.min = feature.value
        this.max = feature.value
    }

    add(feature) {
        this.sumData += feature.value
        this.max = Math.max(feature.value, this.max)
        this.min = Math.min(feature.value, this.min)
        this.count++
    }

    get mean() {
        return this.sumData / this.count
    }
}

export default WigTrack
export { summarizeData }
