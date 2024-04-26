import FeatureSource from './featureSource.js'
import TDFSource from "../tdf/tdfSource.js"
import TrackBase from "../trackBase.js"
import BWSource from "../bigwig/bwSource.js"
import IGVGraphics from "../igv-canvas.js"
import {IGVColor, StringUtils} from "../../node_modules/igv-utils/src/index.js"
import $ from "../vendor/jquery-3.3.1.slim.js"
import {createCheckbox} from "../igv-icons.js"

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
        if ("all" !== chr && this.summarize && ("mean" === windowFunction || "min" === windowFunction || "max" === windowFunction)) {
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

            items.push({label: 'Flip y-axis', click})
        }

        if(this.featureSource.windowFunctions) {
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
            const object = $(createCheckbox(wf, this.windowFunction === wf))

            function clickHandler() {
                this.windowFunction = wf
                this.trackView.updateViews()
            }

            menuItems.push({object, click: clickHandler})
        }

        return menuItems
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
        const posColor = this.color || DEFAULT_COLOR

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

                    const x = (f.start - bpStart) / bpPerPixel
                    if (isNaN(x)) continue

                    let y = yScale(f.value)

                    const rectEnd = Math.ceil((f.end - bpStart) / bpPerPixel)
                    const width = Math.max(this.config.lineWidth || 3, rectEnd - x)
                    let color = ""
                    if (f.hasOwnProperty("color")){
                        color = f.color
                    }
                    else{
                        let c = (f.value < 0 && this.altColor) ? this.altColor : posColor
                        color = (typeof c === "function") ? c(f.value) : c
                    }
                    if (this.graphType === "points") {
                        const pointSize = this.config.pointSize || 3
                        const px = x + width / 2
                        IGVGraphics.fillCircle(ctx, px, y, pointSize / 2, {"fillStyle": color, "strokeStyle": color})

                    } else if(this.graphType === "line"){
                        IGVGraphics.strokeLine(ctx, x, y, x + width, y, {"fillStyle": color, "strokeStyle": color})
                        if (f.value > this.dataRange.max) {
                            IGVGraphics.fillCircle(ctx, px, pointSize / 2, pointSize / 2, 3, {fillStyle: this.overflowColor})
                        } else if (f.value < this.dataRange.min) {
                            IGVGraphics.fillCircle(ctx, px, pixelHeight - pointSize / 2, pointSize / 2, 3, {fillStyle: this.overflowColor})
                        }

                    } else {

                        const height = Math.min(pixelHeight, y - y0)
                        IGVGraphics.fillRect(ctx, x, y0, width, height, {fillStyle: color})

                        if (f.value > this.dataRange.max) {
                            IGVGraphics.fillRect(ctx, x, 0, width, 3, {fillStyle: this.overflowColor})
                        } else if (f.value < this.dataRange.min) {
                            IGVGraphics.fillRect(ctx, x, pixelHeight - 3, width, 3, {fillStyle: this.overflowColor})
                        }

                    }
                    lastPixelEnd = x + width
                    lastY = y
                }

                // If the track includes negative values draw a baseline
                if (this.dataRange.min < 0) {
                    const ratio = this.dataRange.max / (this.dataRange.max - this.dataRange.min)
                    const basepx = this.flipAxis ? (1 - ratio) * options.pixelHeight : ratio * options.pixelHeight
                    IGVGraphics.strokeLine(ctx, 0, basepx, options.pixelWidth, basepx, {strokeStyle: this.baselineColor})
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

    paintAxis(ctx, pixelWidth, pixelHeight) {

        IGVGraphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"})
        var font = {
            'font': 'normal 10px Arial',
            'textAlign': 'right',
            'strokeStyle': "black"
        }

        const yScale = (this.dataRange.max - this.dataRange.min) / pixelHeight
        const n = Math.ceil((this.dataRange.max - this.dataRange.min) * 10 / pixelHeight)
        if(this.config.hasOwnProperty("axis")){
            for(let p = 0; p < this.config.axis.length; p++){
                const yp = pixelHeight - Math.round((this.config.axis[p] - this.dataRange.min) / yScale)
                IGVGraphics.strokeLine(ctx, 45, yp, 50, yp, font) // Offset dashes up by 2 pixel
                IGVGraphics.fillText(ctx, this.config.axis[p] , 44, yp + 4, font) // Offset numbers down by 2 pixels;
            }
            if(this.config.axis.length > 0){
                let y0 = pixelHeight - Math.round((this.config.axis[0] - this.dataRange.min) / yScale)
                let y1 = pixelHeight - Math.round((this.config.axis[this.config.axis.length - 1] - this.dataRange.min) / yScale)
                IGVGraphics.strokeLine(ctx, 49, y0, 49, y1, font)
            }
        }else{
            for (let p = this.dataRange.min; p < this.dataRange.max; p += n) {
                const yp = pixelHeight - Math.round((p - this.dataRange.min) / yScale)
                IGVGraphics.strokeLine(ctx, 45, yp, 50, yp, font) // Offset dashes up by 2 pixel
                IGVGraphics.fillText(ctx, Math.floor(p), 44, yp + 4, font) // Offset numbers down by 2 pixels;
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

    supportsWholeGenome() {
        return !this.config.indexURL && this.config.supportsWholeGenome !== false
    }

    /**
     * Return color for feature.
     * @param feature
     * @returns {string}
     */

    getColorForFeature(f) {
        let c = (f.value < 0 && this.altColor) ? this.altColor : this.color || DEFAULT_COLOR
        return (typeof c === "function") ? c(f.value) : c
    }

    /**
     * Called when the track is removed.  Do any needed cleanup here
     */
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

    // Assume features are sorted by position.  Wig features cannot overlap.  Note, UCSC "reductionLevel" == bpPerPixel
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
        summaryFeatures.push({chr, start, end, value, description})
    }

    let currentBinData
    for (let f of features) {

        // Loop through bins this feature overlaps, updating the weighted sum for each bin or min/max,
        // depending on window function
        let startBin = Math.floor((f.start - startBP) / binSize)
        const endBin = Math.floor((f.end - startBP) / binSize)

        if (!currentBinData) {
            // First time
            if (endBin > startBin) {
                // Fill bins up to "endBin"
                const start = startBP + startBin * binSize
                const end = startBP + endBin * binSize
                summaryFeatures.push({chr, start, end, value: f.value})
            }
            currentBinData = new SummaryBinData(endBin, f.value)

        } else {

            if (startBin === currentBinData.bin) {
                currentBinData.add(f.value)
                startBin++
            }

            if (endBin > currentBinData.bin) {

                finishBin(currentBinData)

                // filler
                if (endBin > startBin) {
                    const start = startBP + startBin * binSize
                    const end = startBP + endBin * binSize
                    summaryFeatures.push({chr, start, end, value: f.value})
                }

                currentBinData = new SummaryBinData(endBin, f.value)
            }
        }
    }
    finishBin(currentBinData)

    // Consolidate
    const c = []
    let lastFeature = summaryFeatures[0]
    for (let f of summaryFeatures) {
        if (lastFeature.value === f.value) {
            lastFeature.end = f.end
        } else {
            c.push(lastFeature)
            lastFeature = f
        }
    }
    c.push(lastFeature)

    return c

}

class SummaryBinData {
    constructor(bin, value) {
        this.bin = bin
        this.sumData = value
        this.count = 1
        this.min = value
        this.max = value
    }

    add(value) {
        this.sumData += value
        this.max = Math.max(value, this.max)
        this.min = Math.min(value, this.min)
        this.count++
    }

    get mean() {
        return this.sumData / this.count
    }
}

export default WigTrack
export {summarizeData}
