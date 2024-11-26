import FeatureSource from '../feature/featureSource.js'
import TrackBase from "../trackBase.js"
import IGVGraphics from "../igv-canvas.js"
import {isSimpleType} from "../util/igvUtils.js"
import paintAxis from "../util/paintAxis.js"
import MenuUtils from "../ui/menuUtils.js"
import {StringUtils} from "../../node_modules/igv-utils/src/index.js"

const X_PIXEL_DIFF_THRESHOLD = 1

class GCNVTrack extends TrackBase {

    constructor(config, browser) {
        super(config, browser)
    }

    init(config) {
        super.init(config)

        this.autoscale = config.autoscale || config.max === undefined
        this.dataRange = {
            min: config.min || 0,
            max: config.max
        }

        this.windowFunction = config.windowFunction || "mean"
        this.paintAxis = paintAxis
        this.graphType = config.graphType || "bar"

        //hack to avoid creating feature source multiple times.  If config.type is not set the file must be read
        //to determine type, which results in creation of a feature source.
        if (config._featureSource) {
            this.featureSource = config._featureSource
            delete config._featureSource
        } else {
            this.featureSource = FeatureSource(this.config, this.browser.genome)
        }

        // Visibility window hardcoded to -1  (== whole chromosome).  Draw method needs feature beyond current view,
        // when/if this is resolved visibilityWindow can be used.
        this.visibilityWindow = -1
        this.featureSource.visibilityWindow = this.visibilityWindow
    }

    async postInit() {

        if (typeof this.featureSource.getHeader === "function") {
            this.header = await this.featureSource.getHeader()
            if(this.disposed) return;   // This track was removed during async load
            this.sampleKeys = this.header.columnNames.slice(3)

            // Set generic properties from track line
            this.setTrackProperties(this.header)   // setTrackProperties defined in TrackBase

            // set option to highlight sample track line on click
            if (this.header.hasOwnProperty("clickToHighlight")) {
                let colour = this.header["clickToHighlight"]
                this.config.clickToHighlight = colour
                this.config.samplesClickedToHighlight = {}
            }

            // enables onlyHandleClicksForHighlightedSamples to be set from file header
            if (this.header.hasOwnProperty("onlyHandleClicksForHighlightedSamples")) {
                this.config.onlyHandleClicksForHighlightedSamples = true
            }

            // Special track line properties
            if (this.header.hasOwnProperty("highlight")) {
                this.config.highlightSamples = {}
                let v = this.header["highlight"]
                if (!Array.isArray(v)) v = [v]
                for (let h of v) {
                    const tokens = h.split(";")
                    if (tokens.length === 2) {
                        this.config.highlightSamples[tokens[0]] = tokens[1]
                    }

                }
            }
        }

        this._initialColor = this.color || this.constructor.defaultColor
        this._initialAltColor = this.altColor || this.constructor.defaultColor

    }

    menuItemList() {
        return this.numericDataMenuItems()
    }

    async getFeatures(chr, start, end) {
        const chrFeatures = await this.featureSource.getFeatures({
            chr,
            start: 0,
            end: Number.MAX_SAFE_INTEGER,
            visibilityWindow: this.visibilityWindow
        })
        let prevIndex = undefined
        let nextIndex = undefined
        for (let i = 1; i < chrFeatures.length - 1; i++) {
            if (prevIndex === undefined && chrFeatures[i].end > start) {
                prevIndex = i - 1
            }
            if (nextIndex === undefined && chrFeatures[i].start > end) {
                nextIndex = i + 1
                break
            }
        }
        if (prevIndex === undefined) prevIndex = 0
        if (nextIndex === undefined) nextIndex = chrFeatures.length
        return chrFeatures.slice(prevIndex, nextIndex)
    }

    draw(options) {

        const {features, context, bpPerPixel, bpStart, pixelWidth, pixelHeight} = options

        ///let baselineColor;
        //if (typeof self.color === "string" && self.color.startsWith("rgb(")) {
        //    baselineColor = IGVColor.addAlpha(self.color, 0.1);
        //}

        const yScale = (yValue) => {
            return ((this.dataRange.max - yValue) / (this.dataRange.max - this.dataRange.min)) * pixelHeight
        }

        const getX = function (bpPosition) {
            let x = Math.floor((bpPosition - bpStart) / bpPerPixel)
            if (isNaN(x)) console.warn('isNaN(x). feature start ' + StringUtils.numberFormatter(bpPosition) +
                ' bp start ' + StringUtils.numberFormatter(bpStart))
            return x
        }

        const drawGuideLines = (options) => {
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

        if (features && features.length > 0) {

            if (this.dataRange.min === undefined) this.dataRange.min = 0

            // Max can be less than min if config.min is set but max left to autoscale. If that's the case there is
            // nothing to paint.
            if (this.dataRange.max > this.dataRange.min) {
                const highlightSamples = this.config.highlightSamples
                const onlyHandleClicksForHighlightedSamples = this.config.onlyHandleClicksForHighlightedSamples
                const clickToHighlight = this.config.clickToHighlight

                let previousEnd = -1
                let previousValues = {}

                let highlightConnectorLines = []
                let highlightFeatureLines = []

                // clickDetectorCache allows fast retrieval of whether a mouse click hits a rendered line segment
                // by storing lists of rendered line segments, keyed by their right x coordinate in canvas pixel space.
                // this cache is regenerated on every draw.
                this.clickDetectorCache = {}

                for (let feature of features) {
                    const x1 = getX(feature.start)
                    const x2 = getX(feature.end)
                    const previousX = previousEnd >= 0 ? getX(previousEnd) : x1

                    if (isNaN(x1) || isNaN(x2)) continue
                    // if ((x1 - previousX < X_PIXEL_DIFF_THRESHOLD) && (x2 - x1 < X_PIXEL_DIFF_THRESHOLD)) continue;

                    this.clickDetectorCache[x1] = []
                    this.clickDetectorCache[x2] = []
                    for (let i = 0; i < feature.values.length; i++) {
                        const sampleName = this.sampleKeys[i]
                        const value = feature.values[i]
                        const y = yScale(value)
                        if (x1 - previousX >= X_PIXEL_DIFF_THRESHOLD) {
                            const previousValue = previousValues[sampleName]
                            const previousY = yScale(previousValue)
                            const highlightColor = highlightSamples && highlightSamples[sampleName]


                            if (highlightColor) {
                                highlightConnectorLines.push([previousX, previousY, x1, y, highlightColor])
                            } else if (clickToHighlight && sampleName in this.config.samplesClickedToHighlight) {
                                highlightConnectorLines.push([previousX, previousY, x1, y, this.config.samplesClickedToHighlight[sampleName]])
                            } else {
                                IGVGraphics.strokeLine(context, previousX, previousY, x1, y, {strokeStyle: '#D9D9D9'})
                            }
                            if (!onlyHandleClicksForHighlightedSamples || sampleName in highlightSamples) {
                                this.clickDetectorCache[x1].push([previousX, previousY, x1, y, sampleName, highlightColor || 'gray'])
                            }
                        }

                        if (x2 - x1 >= X_PIXEL_DIFF_THRESHOLD) {
                            const highlightColor = highlightSamples && highlightSamples[sampleName]
                            if (highlightColor) {
                                highlightFeatureLines.push([x1, y, x2, y, highlightColor])
                            } else if (clickToHighlight && sampleName in this.config.samplesClickedToHighlight) {
                                highlightFeatureLines.push([x1, y, x2, y, this.config.samplesClickedToHighlight[sampleName]])
                            } else {
                                IGVGraphics.strokeLine(context, x1, y, x2, y, {strokeStyle: 'gray'})
                            }
                            if (!onlyHandleClicksForHighlightedSamples || sampleName in highlightSamples) {
                                this.clickDetectorCache[x2].push([x1, y, x2, y, sampleName, highlightColor || 'gray'])
                            }
                        }

                        previousValues[sampleName] = value

                        //IGVGraphics.fillCircle(ctx, px, y, pointSize / 2, {"fillStyle": color, "strokeStyle": color});
                        //IGVGraphics.fillRect(ctx, x, y, width, height, {fillStyle: color});
                    }
                    previousEnd = feature.end
                }

                for (let f of highlightConnectorLines) {
                    IGVGraphics.strokeLine(context, f[0], f[1], f[2], f[3], {strokeStyle: f[4], lineWidth: 1.3})
                }
                for (let f of highlightFeatureLines) {
                    IGVGraphics.strokeLine(context, f[0], f[1], f[2], f[3], {strokeStyle: f[4], lineWidth: 2})
                }

                /*
                // If the track includes negative values draw a baseline
                if (this.dataRange.min < 0) {
                    const basepx = (self.dataRange.max / (this.dataRange.max - this.dataRange.min)) * options.pixelHeight;
                    IGVGraphics.strokeLine(context, 0, basepx, options.pixelWidth, basepx, {strokeStyle: baselineColor});
                }
                */
            }
        }

        drawGuideLines(options)
    }

    doAutoscale(features) {

        let min, max
        if (features.length > 0) {
            min = Number.MAX_VALUE
            max = -Number.MAX_VALUE

            features.forEach(function (feature) {
                min = Math.min(min, ...feature.values)
                max = Math.max(max, ...feature.values)
            })

            min -= 0.01
            max += 0.01
        } else {
            // No features -- default
            min = 0
            max = 100
        }

        return {min: min, max: max}
    }

    clickedFeatures(clickState) {
        //console.warn('click', clickState.canvasX, clickState.canvasY, clickState)

        const BOUNDING_BOX_PADDING = 10
        const MIN_DISTANCE_TO_SEGMENT = 5

        const clickX = clickState.canvasX
        const clickY = clickState.canvasY

        let key = null
        for (key of Object.keys(this.clickDetectorCache)) {
            key = parseInt(key)
            if (key >= clickX) {
                break
            }
        }


        if (key) {
            let closestDistanceSoFar = Number.MAX_VALUE
            let closestResult = []
            const segments = this.clickDetectorCache[key]
            for (let segment of segments) {
                const x1 = segment[0]
                const x2 = segment[2]
                if (clickX < x1 || clickX > x2) return []

                const y1 = segment[1]
                const y2 = segment[3]

                if ((clickY < Math.min(y1, y2) - BOUNDING_BOX_PADDING) || (clickY > Math.max(y1, y2) + BOUNDING_BOX_PADDING)) continue

                const distance = distanceToLine(clickX, clickY, x1, y1, x2, y2)
                if (distance < closestDistanceSoFar) {
                    closestResult = [{'name': segment[4], 'color': segment[5]}]
                    closestDistanceSoFar = distance
                    //console.warn('closest:', 'name', segment[4], 'color', segment[5], distance);
                }
            }

            if (closestDistanceSoFar < MIN_DISTANCE_TO_SEGMENT) {
                // clickToHighlight set, add sample to dict of clicked lines
                if (this.config.clickToHighlight) {
                    if (closestResult[0]['name'] in this.config.samplesClickedToHighlight) {
                        // clicked sample already highlighted => remove if clicked again
                        delete this.config.samplesClickedToHighlight[closestResult[0]['name']]
                    } else if (this.config.clickToHighlight === 'any') {
                        var colourList = [
                            'red', 'darkblue', 'green', 'teal', 'olivedrab',
                            'orange', 'maroon', 'purple', 'blue', 'gold',
                        ]
                        var colour = colourList[Math.floor(Math.random() * (colourList.length + 1))]
                        this.config.samplesClickedToHighlight[closestResult[0]['name']] = colour
                    } else {
                        this.config.samplesClickedToHighlight[closestResult[0]['name']] = this.config.clickToHighlight
                    }
                    this.trackView.repaintViews()  // prompt redraw to change colour of clicked sample
                }
                return closestResult
            }
        }

        return []
    }

    popupData(clickState, features) {

        if(features === undefined) features = this.clickedFeatures(clickState)

        const items = []
        features.forEach(function (f) {
            for (let property of Object.keys(f)) {
                if (isSimpleType(f[property])) {
                    items.push({name: property, value: f[property]})
                }
            }
        })

        return items
    }

    get supportsWholeGenome() {
        return false
    }
}


function distanceToLine(x, y, ax, ay, bx, by) {
    /*
        Finds distance between point (x, y) and line defined by points (ax, ay) (bx, by)
        based on http://mathworld.wolfram.com/Point-LineDistance2-Dimensional.html
    */

    const bx_minus_ax = bx - ax
    const by_minus_ay = by - ay
    const v = Math.abs(bx_minus_ax * (ay - y) - (ax - x) * by_minus_ay)
    const r = Math.sqrt(bx_minus_ax * bx_minus_ax + by_minus_ay * by_minus_ay)

    const distance = r > 0 ? v / r : 0
    //console.warn('Check if', x, y, 'is within', ax, ay, bx, by, '. Distance from line: ', distance);

    return distance
}

export default GCNVTrack
