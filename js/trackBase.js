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

const fixColor = (colorString) => {
    return (colorString.indexOf(",") > 0 && !colorString.startsWith("rgb")) ?
        `rgb(${colorString})` : colorString
}

/**
 * A collection of properties and methods shared by all (or most) track types.
 *
 * @param config
 * @param browser
 * @constructor
 */
class TrackBase {

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
        if (config.displayMode) {
            config.displayMode = config.displayMode.toUpperCase()
        }

        this.config = config
        this.url = config.url
        this.type = config.type

        this.supportHiDPI = config.supportHiDPI === undefined ? true : config.supportHiDPI

        if (config.name || config.label) {
            this.name = config.name || config.label
        } else if (FileUtils.isFile(config.url)) {
            this.name = config.url.name
        } else if (StringUtils.isString(config.url) && !config.url.startsWith("data:")) {
            this.name = FileUtils.getFilename(config.url)
        }

        this.id = this.config.id === undefined ? this.name : this.config.id

        this.order = config.order

        if(config.color) this.color = fixColor(config.color)
        if(config.altColor) this.altColor = fixColor(config.altColor)
        if ("civic-ws" === config.sourceType) {    // Ugly proxy for specialized track type
            this.defaultColor = "rgb(155,20,20)"
        } else {
            this.defaultColor = "rgb(0,0,150)"
        }

        this.autoscaleGroup = config.autoscaleGroup

        this.removable = config.removable === undefined ? true : config.removable      // Defaults to true

        this.height = config.height || 100
        this.autoHeight = config.autoHeight
        this.minHeight = config.minHeight || Math.min(25, this.height)
        this.maxHeight = config.maxHeight || Math.max(1000, this.height)

        this.visibilityWindow = config.visibilityWindow

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

    /**
     * Update track properties from the config object.
     *
     * @param config
     */
    updateConfig(config) {
        this.init(config)
    }

    /**
     * Default implementation -- update config with current values.
     * to create session object for bookmarking, sharing.  Updates the track "config" object to reflect the
     * current state.  Only simple properties (string, number, boolean) are updated.
     */
    getState() {

        // Create copy of config, minus transient properties (convention is name starts with '_').  Also, all
        // function properties are transient as they cannot be saved in json
        const state = {}
        for (let key of Object.keys(this.config)) {
            if (!key.startsWith("_") && typeof this.config[key] !== "function" && this.config[key] !== undefined) {
                state[key] = this.config[key]
            }
        }

        // Update original config values with any changes
        for (let key of Object.keys(state)) {
            if (key.startsWith("_")) continue   // transient property
            const value = this[key]
            if (value && (isSimpleType(value) || typeof value === "boolean" || key === "metadata")) {
                state[key] = value
            }
        }

        if (this.color) state.color = this.color
        if (this.altColor) state.altColor = this.altColor

        // Flatten dataRange if present
        if (!this.autoscale && this.dataRange) {
            state.min = this.dataRange.min
            state.max = this.dataRange.max
        }


        // Check for non-json-if-yable properties.  Perhaps we should test what can be saved.
        for (let key of Object.keys(state)) {
            const value = state[key]
            if (typeof value === 'function') {
                throw Error(`Property '${key}' of track '${this.name} is a function. Functions cannot be saved in sessions.`)
            }
            if (value instanceof File) {   // Test specifically for File.  Other types of File-like objects might be savable
                const str = `Track ${this.name} is a local file. Sessions cannot be saved with local file references.`
                throw Error(str)
            }
            if (value instanceof Promise) {
                throw Error(`Property '${key}' of track '${this.name} is a Promise. Promises cannot be saved in sessions.`)
            }
        }

        return state
    }

    get supportsWholeGenome() {
        return false
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
                    if (!this.config.autoscale) {   // autoscale in the config has precedence
                        tokens = properties[key].split(":")
                        let min = 0
                        let max
                        if (tokens.length == 1) {
                            max = Number(tokens[0])
                        } else if (tokens.length == 2) {
                            min = Number(tokens[0])
                            max = Number(tokens[1])
                        }
                        tracklineConfg.autoscale = false
                        tracklineConfg.dataRange = {min, max}
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
     * Return the features clicked over.  Default implementation assumes a single row of features and only considers
     * the genomic location.   Overriden by most subclasses.
     *
     * @param clickState
     * @param features
     * @returns {[]|*[]}
     */
    clickedFeatures(clickState, features) {

        // We use the cached features rather than method to avoid async load.  If the
        // feature is not already loaded this won't work,  but the user wouldn't be mousing over it either.
        if (!features) features = clickState.viewport.cachedFeatures

        if (!features || features.length === 0) {
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
     * @param feature
     * @returns {Array}
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

    static getCravatLink(chr, position, ref, alt, genomeID) {

        if ("hg38" === genomeID || "GRCh38" === genomeID) {

            const cravatChr = chr.startsWith("chr") ? chr : "chr" + chr
            return `<a target="_blank" href="https://run.opencravat.org/result/nocache/variant.html` +
                `?chrom=${cravatChr}&pos=${position}&ref_base=${ref}&alt_base=${alt}"><b>Cravat ${ref}->${alt}</b></a>`

        } else {
            return undefined
        }
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
