import $ from "../vendor/jquery-3.3.1.slim.js"
import FeatureSource from "../feature/featureSource.js"
import TrackBase from "../trackBase.js"
import IGVGraphics from "../igv-canvas.js"
import ShoeboxColorScale from "./shoeboxColorScale.js"


class ShoeboxTrack extends TrackBase {

    static defaults = {
        height: 300,
        rowHeight: 3,
        max: 3000,
        visibilityWindow: 10000
    }

    constructor(config, browser) {
        super(config, browser)
    }

    init(config) {
        super.init(config)

        this.type = "shoebox"
        this.height = config.height || 300
        this.rowHeight = config.rowHeight || 3
        this.max = config.max || 3000
        this.colorScale = new ShoeboxColorScale({min: 0, max: 3000, color: this.color})


        // Hardcoded -- todo get from track line
        this.sampleKeys = []
        for (let i = 1; i <= 100; i++) {
            this.sampleKeys.push(i)
        }

        // Create featureSource
        const configCopy = Object.assign({}, this.config)
        configCopy.format = 'shoebox'   // bit of a hack
        this.featureSource = FeatureSource(configCopy, this.browser.genome)
    }

    async postInit() {
        if (typeof this.featureSource.getHeader === "function") {
            this.header = await this.featureSource.getHeader()
            if (this.disposed) return   // This track was removed during async load
        }
        // Set properties from track line
        if (this.header) {
            this.setTrackProperties(this.header)
        }

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

        // Data range
        let object = $('<div>')
        object.text('Set data range')

        function dialogPresentationHandler() {

            if (this.trackView.track.selected) {
                this.browser.dataRangeDialog.configure(this.trackView.browser.getSelectedTrackViews())
            } else {
                this.browser.dataRangeDialog.configure(this.trackView)
            }
            this.browser.dataRangeDialog.present($(this.browser.columnContainer))
        }

        menuItems.push({object, dialog: dialogPresentationHandler})

        return menuItems
    }

    setDataRange({min, max}) {
        this.dataRange.min = min
        this.dataRange.max = max
        this.trackView.repaintViews()
    }

    hasSamples() {
        return true   // by definition
    }

    getSamples() {
        return {
            names: this.sampleKeys,
            height: this.rowHeight,
            yOffset: 0
        }
    }

    async getFeatures(chr, start, end, bpPerPixel) {
        const visibilityWindow = this.visibilityWindow
        return this.featureSource.getFeatures({chr, start, end, bpPerPixel, visibilityWindow})
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
                const xLeft = Math.round((f.start - bpStart) / bpPerPixel)
                const xRight = Math.round((f.end - bpStart) / bpPerPixel)
                const w = xRight - xLeft

                // Loop through value array

                for (let i = f.values.length - 1; i >= 0; i--) {

                    const v = f.values[i]

                    if(v >= this.dataRange.min) {

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


export default ShoeboxTrack
