import $ from "../vendor/jquery-3.3.1.slim.js"
import FeatureSource from "../feature/featureSource.js"
import TrackBase from "../trackBase.js"
import IGVGraphics from "../igv-canvas.js"
import ShoeboxColorScale from "./shoeboxColorScale.js"
import paintAxis from "../util/paintAxis.js"

/**
 * Configurable properties
 * min, max   (viewlimits)  - min / max values of the color scale.  Alpha is linearly varied from 100% (min) to 0% (max)
 * color - base color before alpha is applied
 * rowHeight - height of each row
 */

class ShoeboxTrack extends TrackBase {

    static defaults = {
        height: 300,
        rowHeight: 3,
        min: 0.5,
        max: 3,
        scale: 1.0,
        visibilityWindow: 10000,
        supportHiDPI: false,
        startSize: 4,         // Footprint size for the first column of data (first row in track)
        stepSize: 2        // Stepsize for each row in bp for footprint radius
    }

    constructor(config, browser) {
        super(config, browser)
    }

    init(config) {

        super.init(config)

        this.type = "shoebox"

        if (config.max) {
            this.dataRange = {
                min: config.min || 0,
                max: config.max
            }
        }
        // Create featureSource
        const configCopy = Object.assign({}, this.config)
        configCopy.format = 'shoebox'   // bit of a hack
        this.featureSource = FeatureSource(configCopy, this.browser.genome)

        // this.paintAxis = paintAxis
    }


    async postInit() {

        if (typeof this.featureSource.getHeader === "function") {
            this.header = await this.featureSource.getHeader()
            if (this.disposed) return   // This track was removed during async load
        }
        // Set properties from track line
        if (this.header) {
            if (this.header.scale) {
                this.header.scale = Number.parseFloat(this.header.scale)
            }
            this.setTrackProperties(this.header)

            this.rowCount = this.header.firstFeature ? this.header.firstFeature.values.length : 100
        }

        // Must do the following after setting track properties as they can be overriden via a track line

        // Color settings
        const min = this.dataRange.min
        const max = this.dataRange.max
        this.colorScale = new ShoeboxColorScale({min, max, color: this.color})

        // This shouldn't be neccessary
        if (!this.scale) this.scale = 1.0

        this._initialColor = this.color || this.constructor.defaultColor
        this._initialAltColor = this.altColor || this.constructor.defaultColor

    }

    get color() {
        return this._color || "rgb(0,0,255)"
    }

    set color(color) {
        this._color = color
        if (this.colorScale) {
            this.colorScale.updateColor(color)
        }
    }


    menuItemList() {

        const menuItems = []

        menuItems.push('<hr/>')
        let object = $('<div>')
        object.text('Set row height')

        const browser = this.browser

        function dialogHandler(e) {

            const callback = () => {

                const number = parseInt(this.browser.inputDialog.value, 10)

                if (undefined !== number) {

                    browser.sampleNameViewportWidth = undefined   // TODO, a better way to trigger this

                    const tracks = []
                    if (this.trackView.track.selected) {
                        tracks.push(...(this.trackView.browser.getSelectedTrackViews().map(({track}) => track)))
                    } else {
                        tracks.push(this)
                    }

                    for (const track of tracks) {
                        track.rowHeight = number
                        if (track.rowHeight * track.rowCount < track.height) {
                            track.trackView.setTrackHeight(track.rowHeight * track.rowCount, true)
                        }
                        track.trackView.checkContentHeight()
                        track.trackView.repaintViews()
                    }
                }
            }

            const config =
                {
                    label: 'Row Height',
                    value: this.rowHeight,
                    callback
                }

            this.browser.inputDialog.present(config, e)
        }

        menuItems.push({object, dialog: dialogHandler})

        menuItems.push('<hr/>')

        // Data range
        object = $('<div>')
        object.text('Set data range')

        // Note -- menu item handlers must be functions, not arrow functions
        function dataRangeHandler() {
            if (this.trackView.track.selected) {
                this.browser.dataRangeDialog.configure(this.trackView.browser.getSelectedTrackViews())
            } else {
                this.browser.dataRangeDialog.configure(this.trackView)
            }
            this.browser.dataRangeDialog.present($(this.browser.columnContainer))
        }

        menuItems.push({object, dialog: dataRangeHandler})

        return menuItems
    }

    setDataRange({min, max}) {
        this.dataRange.min = min
        this.dataRange.max = max
        this.colorScale.setMinMax(min, max)
        this.trackView.repaintViews()
    }

    async getFeatures(chr, start, end, bpPerPixel) {
        const visibilityWindow = this.visibilityWindow
        const features = await this.featureSource.getFeatures({chr, start, end, bpPerPixel, visibilityWindow})

        return features
    }

    draw({context, pixelTop, pixelWidth, pixelHeight, features, bpPerPixel, bpStart}) {

        IGVGraphics.fillRect(context, 0, pixelTop, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"})

        if (features && features.length > 0) {

            const rowHeight = this.rowHeight
            const pixelBottom = pixelTop + pixelHeight
            const bpEnd = bpStart + pixelWidth * bpPerPixel + 1

            const h = rowHeight

            for (let f of features) {

                // Test for overlap with in-view region
                if (f.end < bpStart || f.start > bpEnd) continue

                // Pixel x values
                const xLeft = Math.floor((f.start - bpStart) / bpPerPixel)
                const xRight = Math.floor((f.end - bpStart) / bpPerPixel)
                const w = Math.max(1, xRight - xLeft)

                // Loop through value array
                for (let i = f.values.length - 1; i >= 0; i--) {

                    const v = f.values[i]                  // / this.scale

                    if (v >= this.dataRange.min) {

                        const row = f.values.length - 1 - i
                        const y = row * rowHeight
                        const bottom = y + rowHeight

                        if (bottom < pixelTop || y > pixelBottom) {
                            continue
                        }

                        const color = this.colorScale.getColor(v)
                        context.fillStyle = color
                        context.fillRect(xLeft, y, w, h)

                    }

                }
            }
        } else {
            //console.log("No feature list");
        }

    }

    paintAxis(ctx, pixelWidth, pixelHeight) {

        //IGVGraphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"})
        var font = {
            'font': 'normal 10px Arial',
            'textAlign': 'right',
            'strokeStyle': "black"
        }

        const max = this.startSize + (this.rowCount * this.stepSize)
        const min = this.startSize
        const yScale = (max - min) / pixelHeight

        const tickStep = 50
        for (let p = tickStep; p <= max; p += tickStep) {
            const yp = Math.max(10, pixelHeight - Math.round((p - min) / yScale))
            IGVGraphics.strokeLine(ctx, 35, yp , 40, yp , font)
            if(p > min ) {
                IGVGraphics.fillText(ctx, prettyPrint(p), 30, yp + 4, font) // Offset numbers down by 2 pixels;
            }
        }
        font['textAlign'] = 'center'
        font['font'] = 'normal 10px Arial'
            IGVGraphics.fillText(ctx, "Footprint size (bp)", 10, pixelHeight / 2, font, {rotate: {angle: -90}})
    }

    /**
     * Optional method to compute pixel height to accomodate the list of features.
     *
     * @param features
     * @returns {number}
     */
    computePixelHeight(features) {
        if (!features || features.length === 0) return 0
        return features[0].values.length * this.rowHeight
    }


    clickedFeatures(clickState) {

        const allFeatures = super.clickedFeatures(clickState)
        const y = clickState.y
        return allFeatures.filter(function (feature) {
            const rect = feature.pixelRect
            return rect && y >= rect.y && y <= (rect.y + rect.h)
        })
    }

    hoverText(clickState) {
        const features = this.clickedFeatures(clickState)
        if (features && features.length > 0) {
            return `${features[0].sample}: ${features[0].value}`
        }
    }

    popupData(clickState, featureList) {

        if (featureList === undefined) featureList = this.clickedFeatures(clickState)

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

    get supportsWholeGenome() {
        return false
    }

    getState() {

        const config = super.getState()
        config.colorScale = this.colorScale.toJson()
        return config

    }

}


function prettyPrint(number) {

    if (Number.isInteger(number)) {
        return number
    } else if (number % 1 === 0) {   // Number can be represented exactly as an integer
        return number
    } else if (Math.abs(number) >= 10) {
        return number.toFixed()
    } else if (Math.abs(number) >= 1) {
        return number.toFixed(1)
    } else if (Math.abs(number) >= 0.1) {
        return number.toFixed(2)
    } else {
        return number.toExponential(1)
    }
}

export default ShoeboxTrack
