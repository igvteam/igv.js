/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2018 Regents of the University of California
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

import {isSimpleType} from "./util/igvUtils.js"
import {FeatureUtils, FileUtils, StringUtils} from "../node_modules/igv-utils/src/index.js"
import {createCheckbox} from "./igv-icons.js"
import {findFeatureAfterCenter} from "./feature/featureUtils.js"

const fixColor = (colorString) => {
    if (StringUtils.isString(colorString)) {
        return (colorString.indexOf(",") > 0 && !(colorString.startsWith("rgb(") || colorString.startsWith("rgba("))) ?
            `rgb(${colorString})` : colorString
    } else {
        return colorString
    }
}

/**
 * A collection of properties and methods shared by all (or most) track types.
 *
 * @param config
 * @param browser
 * @constructor
 */
class TrackBase {

    static defaultColor = 'rgb(150,150,150)'

    static defaults = {
        height: 50,
        autoHeight: false,
        visibilityWindow: undefined,   // Identifies property that should be copied from config
        color: undefined,  // Identifies property that should be copied from config
        altColor: undefined,  // Identifies property that should be copied from config
        supportHiDPI: true,
        selected: false
    }

    constructor(config, browser) {
        this.browser = browser
        this.init(config)
    }

    /**
     * Initialize track properties from the config object.  This method is typically overriden in subclasses, which
     * will call this implementation as super.init(config).
     *
     * @param config
     */
    init(config) {

        this.config = config

        if (config.displayMode) {
            config.displayMode = config.displayMode.toUpperCase()
        }

        // Base default settings
        const defaults = Object.assign({}, TrackBase.defaults)

        // Overide with class specific default settings
        if (this.constructor.defaults) {
            for (let key of Object.keys(this.constructor.defaults)) {
                defaults[key] = this.constructor.defaults[key]
            }
        }

        for (let key of Object.keys(defaults)) {
            this[key] = config.hasOwnProperty(key) ? config[key] : defaults[key]
            if ((key === 'color' || key === 'altColor') && this[key]) {
                this[key] = fixColor(this[key])
            }
        }

        // this._initialColor = this.color || this.constructor.defaultColor
        // this._initialAltColor = this.altColor || this.constructor.defaultColor

        if (config.name || config.label) {
            this.name = config.name || config.label
        } else if (FileUtils.isFile(config.url)) {
            this.name = config.url.name
        } else if (StringUtils.isString(config.url) && !config.url.startsWith("data:")) {
            this.name = FileUtils.getFilename(config.url)
        }

        this.url = config.url
        if (this.config.type) this.type = this.config.type
        this.id = this.config.id === undefined ? this.name : this.config.id
        this.order = config.order
        this.autoscaleGroup = config.autoscaleGroup
        this.removable = config.removable === undefined ? true : config.removable      // Defaults to true
        this.minHeight = config.minHeight || Math.min(25, this.height)
        this.maxHeight = config.maxHeight || Math.max(1000, this.height)

        if (config.onclick) {
            this.onclick = config.onclick
            config.onclick = undefined   // functions cannot be saved in sessions, clear it here.
        }

        if (config.description) {
            // Override description -- displayed when clicking on track label.  Convert to function if neccessary
            if (typeof config.description === 'function') {
                this.description = config.description
            } else {
                this.description = () => config.description
            }
        }

        // Support for mouse hover text.  This can be expensive, off by default.
        // this.hoverText = function(clickState) => return tool tip text
        if (config.hoverTextFields) {
            this.hoverText = hoverText.bind(this)
        } else if (typeof this.config.hoverText === 'function') {
            this.hoverText = this.config.hoverText
        }
    }

    async postInit(){

        console.log(`TrackBase - track(${ this.type }) - postInit()`)

        this._initialColor = this.color || this.constructor.defaultColor
        this._initialAltColor = this.altColor || this.constructor.defaultColor

        return this
    }

    get name() {
        return this._name
    }

    set name(name) {
        this._name = name
        if (this.trackView) {
            this.trackView.setTrackLabelName(name)
        }
    }

    clearCachedFeatures() {
        if (this.trackView) {
            this.trackView.clearCachedFeatures()
        }
    }

    updateViews() {
        if (this.trackView) {
            this.trackView.updateViews()
        }
    }

    repaintViews() {
        if (this.trackView) {
            this.trackView.repaintViews()
        }
    }

    /**
     * Used to create session object for bookmarking, sharing.  Only simple property values (string, number, boolean)
     * are saved.
     */
    getState() {

        const isJSONable = item => !(item === undefined || typeof item === 'function' || item instanceof Promise)

        // Create copy of config, minus transient properties (convention is name starts with '_').  Also, all
        // function properties are transient as they cannot be saved in json
        const state = {}

        const jsonableConfigKeys = Object.keys(this.config).filter(key => isJSONable(this.config[key]))

        for (const key of jsonableConfigKeys) {
            if (!key.startsWith("_")) {
                state[key] = this.config[key]
            }
        }

        // Update original config values with any changes
        for (let key of Object.keys(state)) {
            if (key.startsWith("_")) continue   // transient property
            const value = this[key]
            if (value !== undefined && (isSimpleType(value) || typeof value === "boolean" || key === "metadata")) {
                state[key] = value
            }
        }

        // If user has changed other properties from defaults update state.
        const defs = Object.assign({}, TrackBase.defaults)
        if (this.constructor.defaults) {
            for (let key of Object.keys(this.constructor.defaults)) {
                defs[key] = this.constructor.defaults[key]
            }
        }
        for (let key of Object.keys(defs)) {
            if (undefined !== this[key] && defs[key] !== this[key]) {
                state[key] = this[key]
            }
        }

        // Flatten dataRange if present
        if (!this.autoscale && this.dataRange) {
            state.min = this.dataRange.min
            state.max = this.dataRange.max
        }

        if (this.autoscaleGroup) {
            state.autoscaleGroup = this.autoscaleGroup
        }

        return state
    }

    get supportsWholeGenome() {
        return this.config.supportsWholeGenome === true
    }

    /**
     * Does the track support sample names.  Current sample aware tracks include VCF (with genotypes), MUT, MAF, and SEG
     * @returns {boolean}
     */
    hasSamples() {
        return false
    }

    getGenomeId() {
        return this.browser.genome ? this.browser.genome.id : undefined
    }

    /**
     * Set certain track properties, usually from a "track" line.  Not all UCSC properties are supported.
     *
     * Track configuration settings have precendence over track line properties, so if both are present ignore the
     * track line.
     *
     * @param properties
     */
    setTrackProperties(properties) {

        if (this.disposed) return   // This track was removed during async load

        const tracklineConfg = {}
        let tokens
        for (let key of Object.keys(properties)) {
            switch (key.toLowerCase()) {
                case "usescore":
                    tracklineConfg.useScore = (
                        properties[key] === 1 || properties[key] === "1" || properties[key] === "on" || properties[key] === true)
                    break
                case "visibility":
                    //0 - hide, 1 - dense, 2 - full, 3 - pack, and 4 - squish
                    switch (properties[key]) {
                        case "2":
                        case "3":
                        case "pack":
                        case "full":
                            tracklineConfg.displayMode = "EXPANDED"
                            break
                        case "4":
                        case "squish":
                            tracklineConfg.displayMode = "SQUISHED"
                            break
                        case "1":
                        case "dense":
                            tracklineConfg.displayMode = "COLLAPSED"
                    }
                    break
                case "color":
                case "altcolor":
                    tracklineConfg[key] = properties[key].startsWith("rgb(") ? properties[key] : "rgb(" + properties[key] + ")"
                    break
                case "featurevisiblitywindow":
                case "visibilitywindow":
                    tracklineConfg.visibilityWindow = Number.parseInt(properties[key])
                    break
                case "maxheightpixels":
                    tokens = properties[key].split(":")
                    if (tokens.length === 3) {
                        tracklineConfg.minHeight = Number.parseInt(tokens[2])
                        tracklineConfg.height = Number.parseInt(tokens[1])
                        tracklineConfg.maxHeight = Number.parseInt(tokens[0])
                    }
                    break
                case "viewlimits":
                    if (!this.config.autoscale && !this.config.max) {   //config has precedence
                        tokens = properties[key].split(":")
                        let min = 0
                        let max
                        if (tokens.length == 1) {
                            max = Number(tokens[0])
                        } else if (tokens.length == 2) {
                            min = Number(tokens[0])
                            max = Number(tokens[1])
                        }
                        if (Number.isNaN(max) || Number.isNaN(min)) {
                            console.warn(`Unexpected viewLimits value in track line: ${properties["viewLimits"]}`)
                        } else {
                            tracklineConfg.autoscale = false
                            tracklineConfg.dataRange = {min, max}
                            this.viewLimitMin = min
                            this.viewLimitMax = max
                        }
                    }
                case "name":
                    tracklineConfg[key] = properties[key]
                    break
                case "url":
                    tracklineConfg["infoURL"] = properties[key]
                    break
                case "type":
                    const v = properties[key]
                    if (UCSCTypeMappings.has(v)) {
                        tracklineConfg[key] = UCSCTypeMappings.get(v)
                    } else {
                        tracklineConfg[key] = v
                    }
                    break
                case "graphtype":
                    tracklineConfg["graphType"] = properties[key]
                    break
                default:
                    tracklineConfg[key] = properties[key]
            }
        }

        // Track configuration objects have precedence over track line properties in general.  The "name" property
        // is an exception if it was derived and not explicitly entered (that is derived from the web app from filename).
        for (let key of Object.keys(tracklineConfg)) {

            if (!this.config.hasOwnProperty(key) || (key === "name" && this.config._derivedName)) {
                let value = tracklineConfg[key]
                if ("true" === value) value = true
                if ("false" === value) value = false

                this[key] = value
                if (key === "height" && this.trackView) {
                    try {
                        const h = Number.parseInt(value)
                        this.trackView.setTrackHeight(h)
                    } catch (e) {
                        console.error(e)
                    }
                }
            }
        }
    }

    /**
     * Return the features clicked over.  Default implementation assumes an array of features and only considers
     * the genomic location.   Overriden by most subclasses.
     *
     * @param clickState
     * @returns {[]|*[]}
     */
    clickedFeatures(clickState) {

        // We use the cached features rather than method to avoid async load.  If the
        // feature is not already loaded this won't work,  but the user wouldn't be mousing over it either.
        const features = clickState.viewport.cachedFeatures

        if (!features || !Array.isArray(features) || features.length === 0) {
            return []
        }

        const genomicLocation = clickState.genomicLocation

        // When zoomed out we need some tolerance around genomicLocation
        const tolerance = (clickState.referenceFrame.bpPerPixel > 0.2) ? 3 * clickState.referenceFrame.bpPerPixel : 0.2
        const ss = genomicLocation - tolerance
        const ee = genomicLocation + tolerance
        return (FeatureUtils.findOverlapping(features, ss, ee))
    }

    /**
     * Default popup text function -- just extracts string and number properties in random order.
     * @param feature     * @returns {Array}
     */
    extractPopupData(feature, genomeId) {

        const filteredProperties = new Set(['row', 'color', 'chr', 'start', 'end', 'cdStart', 'cdEnd', 'strand', 'alpha'])
        const data = []

        let alleles, alleleFreqs
        for (let property in feature) {

            if (feature.hasOwnProperty(property) &&
                !filteredProperties.has(property) &&
                isSimpleType(feature[property])) {

                let value = feature[property]
                data.push({name: StringUtils.capitalize(property), value: value})

                if (property === "alleles") {
                    alleles = feature[property]
                } else if (property === "alleleFreqs") {
                    alleleFreqs = feature[property]
                }
            }
        }

        if (alleles && alleleFreqs) {

            if (alleles.endsWith(",")) {
                alleles = alleles.substr(0, alleles.length - 1)
            }
            if (alleleFreqs.endsWith(",")) {
                alleleFreqs = alleleFreqs.substr(0, alleleFreqs.length - 1)
            }

            let a = alleles.split(",")
            let af = alleleFreqs.split(",")
            if (af.length > 1) {
                let b = []
                for (let i = 0; i < af.length; i++) {
                    b.push({a: a[i], af: Number(af[i])})
                }
                b.sort(function (x, y) {
                    return x.af - y.af
                })

                let ref = b[b.length - 1].a
                if (ref.length === 1) {
                    for (let i = b.length - 2; i >= 0; i--) {
                        let alt = b[i].a
                        if (alt.length === 1) {
                            if (!genomeId) genomeId = this.getGenomeId()
                            const cravatLink = TrackBase.getCravatLink(feature.chr, feature.start + 1, ref, alt, genomeId)
                            console.log(cravatLink)
                            if (cravatLink) {
                                data.push('<hr/>')
                                data.push({html: cravatLink})
                                data.push('<hr/>')
                            }
                        }
                    }
                }
            }
        }

        if (feature.attributes) {
            for (let key of Object.keys(feature.attributes)) {
                data.push({name: key, value: feature.attributes[key]})
            }
        }

        // final chr position
        let posString = `${feature.chr}:${StringUtils.numberFormatter(feature.start + 1)}-${StringUtils.numberFormatter(feature.end)}`
        if (feature.strand) {
            posString += ` (${feature.strand})`
        }

        data.push({name: 'Location', value: posString})

        return data

    }


    /**
     * Default track description -- displayed on click of track label.  This can be overriden in the track
     * configuration, or in subclasses.
     */
    description() {

        const wrapKeyValue = (k, v) => `<div class="igv-track-label-popup-shim"><b>${k}: </b>${v}</div>`

        let str = '<div class="igv-track-label-popup">'
        if (this.url) {
            if (FileUtils.isFile(this.url)) {
                str += wrapKeyValue('Filename', this.url.name)
            } else {
                str += wrapKeyValue('URL', this.url)
            }
        } else {
            str = this.name
        }
        if (this.config) {
            if (this.config.metadata) {
                for (let key of Object.keys(this.config.metadata)) {
                    const value = this.config.metadata[key]
                    str += wrapKeyValue(key, value)
                }
            }

            // Add any config properties that are capitalized
            for (let key of Object.keys(this.config)) {
                if (key.startsWith("_")) continue   // transient property
                let first = key.substr(0, 1)
                if (first !== first.toLowerCase()) {
                    const value = this.config[key]
                    if (value && isSimpleType(value)) {
                        str += wrapKeyValue(key, value)
                    }
                }
            }

        }
        str += '</div>'
        return str
    }

    /**
     * Return color for a specific feature of this track.  This default implementation is overriden by subclasses*
     * @param f
     * @returns {*|string|string}
     */
    getColorForFeature(f) {
        return (typeof this.color === "function") ? this.color(feature) : this.color
    }

    numericDataMenuItems() {

        const menuItems = []

        // Data range or color scale

        if ("heatmap" !== this.graphType) {

            menuItems.push('<hr/>')

            const dialogPresentationHandler = e => {

                if (this.trackView.track.selected) {
                    this.browser.dataRangeDialog.configure(this.trackView.browser.getSelectedTrackViews())
                } else {
                    this.browser.dataRangeDialog.configure(this.trackView)
                }
                this.browser.dataRangeDialog.present(e)
            }

            menuItems.push({label: 'Set data range', dialog: dialogPresentationHandler})

            if (this.logScale !== undefined) {

                const logScaleHandler = () => {
                    this.logScale = !this.logScale
                    this.trackView.repaintViews()
                }

                menuItems.push({element: createCheckbox("Log scale", this.logScale), click: logScaleHandler})
            }

            const autoScaleHandler = () => {
                this.autoscaleGroup = undefined
                this.autoscale = !this.autoscale
                this.browser.updateViews()
            }

            menuItems.push({element: createCheckbox("Log scale", this.autoscale), click: autoScaleHandler})
        }

        return menuItems
    }

    setDataRange({min, max}) {

        this.dataRange = {min, max}
        this.autoscale = false
        this.autoscaleGroup = undefined
        this.trackView.repaintViews()
    }

    /**
     * Return the first feature in this track whose start position is > position
     * @param chr
     * @param position
     * @param direction
     * @returns {Promise<void>}
     */
    async nextFeatureAfter(chr, position, direction) {
        const viewport = this.trackView.viewports[0]
        let features = viewport.cachedFeatures
        if (features && Array.isArray(features) && features.length > 0) {
            // Check chromosome, all cached features will share a chromosome
            const chrName = this.browser.genome.getChromosomeName(features[0].chr)
            if (chrName === chr) {
                const next = findFeatureAfterCenter(features, position, direction)
                if (next) {
                    return next
                }
            }
        }

        if (typeof this.featureSource.nextFeature === 'function') {
            return this.featureSource.nextFeature(chr, position, direction, this.visibilityWindow)
        }
    }

    /**
     * Track has been permanently removed.  Release resources and other cleanup
     */
    dispose() {

        this.disposed = true

        // This should not be neccessary, but in case there is some unknown reference holding onto this track object,
        // for example in client code, release any resources here.
        for (let key of Object.keys(this)) {
            this[key] = undefined
        }
    }

    static getCravatLink(chr, position, ref, alt, genomeID) {

        if ("hg38" === genomeID || "GRCh38" === genomeID) {

            const cravatChr = chr.startsWith("chr") ? chr : "chr" + chr
            return `<a target="_blank" href="https://run.opencravat.org/result/nocache/variant.html` +
                `?chrom=${cravatChr}&pos=${position}&ref_base=${ref}&alt_base=${alt}"><b>Cravat ${ref}->${alt}</b></a>`

        } else {
            return undefined
        }
    }

    static localFileInspection(config) {

        const cooked = Object.assign({}, config)
        const lut =
            {
                url: 'file',
                indexURL: 'indexFile'
            }

        for (const key of ['url', 'indexURL']) {
            if (cooked[key] && cooked[key] instanceof File) {
                cooked[lut[key]] = cooked[key].name
                delete cooked[key]
            }
        }

        return cooked
    }
}

function hoverText(clickState) {

    if (!this.hoverTextFields) return

    const features = this.clickedFeatures(clickState)

    if (features && features.length > 0) {
        let str = ""
        for (let i = 0; i < features.length; i++) {
            if (i === 10) {
                str += "; ..."
                break
            }
            if (!features[i]) continue

            const f = features[i]._f || features[i]
            if (str.length > 0) str += "\n"

            str = ""
            for (let field of this.hoverTextFields) {
                if (str.length > 0) str += "\n"
                if (f.hasOwnProperty(field)) {
                    str += f[field]
                } else if (typeof f.getAttribute === "function") {
                    str += f.getAttribute(field)
                }
            }

        }
        return str
    }
}

/**
 * Map UCSC track line "type" setting to file format.  In igv.js "type" refers to the track type, not the input file format
 * @type {Map<string, string>}
 */
const UCSCTypeMappings = new Map([
    ["wiggle_0", "wig"],
    ["bed", "bed"],
    ["bigBed", "bigBed"],
    ["bigWig", "bigWig"]
])
export default TrackBase
