/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 The Regents of the University of California
 * Author: Jim Robinson
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

import TrackBase from "../trackBase.js"
import paintAxis from "../util/paintAxis.js"
import {FeatureUtils} from "../../node_modules/igv-utils/src/index.js"
import * as DOMUtils from "../ui/utils/dom-utils.js"

import {doAutoscale} from "../util/igvUtils.js"
import $ from "../vendor/jquery-3.3.1.slim.js"


/**
 * Represents 2 or more wig tracks overlaid on a common viewport.
 */
class MergedTrack extends TrackBase {

    static defaults = {
        alpha: 0.5,
        height: 50
    }

    constructor(config, browser) {
        super(config, browser)
        this.type = "merged"
        this.featureType = "numeric"
        this.paintAxis = paintAxis
        this.graphType = config.graphType
    }

    init(config) {
        if (!(config.tracks || config._tracks)) {
            throw Error("Error: no tracks defined for merged track" + config)
        }
        super.init(config)
    }

    async postInit() {

        this.tracks = []
        if (this.config.tracks) {
            // Configured merged track
            for (let tconf of this.config.tracks) {
                tconf.isMergedTrack = true
                const t = await this.browser.createTrack(tconf)
                if (t) {
                    this.tracks.push(t)
                } else {
                    console.warn("Could not create track " + tconf)
                }
                if (typeof t.postInit === 'function') {
                    await t.postInit()
                }
            }
            // Explicit merged settings -- these will override any individual track settings
            if (this.config.autoscale) {
                this.autoscale = this.config.autoscale
            } else if (this.config.max !== undefined) {
                this.dataRange = {
                    min: this.config.min || 0,
                    max: this.config.max
                }
            } else {
                this.autoscale = !this.tracks.every(t => t.config.autoscale || t.config.max !== undefined)
            }
        } else {
            // Dynamic merged track
            this.tracks = this.config._tracks
            this.autoscale = false
            delete this.config._tracks
        }

        if (this.config.flipAxis !== undefined) {
            for (let t of this.tracks) t.flipAxis = this.config.flipAxis
        }

        if (this.config.logScale !== undefined) {
            for (let t of this.tracks) t.logScale = this.config.logScale
        }

        this.resolutionAware = this.tracks.some(t => t.resolutionAware)

    }

    set flipAxis(b) {
        this.config.flipAxis = b
        for (let t of this.tracks) t.flipAxis = b
    }

    get flipAxis() {
        return this.tracks.every(t => t.flipAxis)
    }

    set logScale(b) {
        this.config.logScale = b
        for (let t of this.tracks) t.logScale = b
    }

    get logScale() {
        return this.tracks.every(t => t.logScale)
    }

    get height() {
        return this._height
    }

    set height(h) {
        this.config.height = h
        this._height = h
        if (this.tracks) {
            for (let t of this.tracks) {
                t.height = h
                t.config.height = h
            }
        }
    }

    get dataRange() {

        if (undefined === this.tracks || 0 === this.tracks.length) {
            return undefined
        }

        const list = this.tracks.filter(track => undefined !== track.dataRange)
        if (list.length !== this.tracks.length) {
            return undefined
        }

        const minSet = new Set(this.tracks.map(({dataRange}) => dataRange.min))
        if (1 !== minSet.size) {
            return undefined
        }

        const maxSet = new Set(this.tracks.map(({dataRange}) => dataRange.max))
        if (1 !== maxSet.size) {
            return undefined
        }

        return { min: [ ...minSet ][ 0 ],  max: [ ...maxSet ][ 0 ] }
    }

    set dataRange({ min, max }) {
        for (const track of this.tracks) {
            track.dataRange = { min, max }
        }
    }

    menuItemList() {
        const items = []
        if (this.flipAxis !== undefined) {
            items.push({
                label: "Flip y-axis",
                click: function flipYAxisHandler() {
                    this.flipAxis = !this.flipAxis
                    this.trackView.repaintViews()
                }
            })
        }

        items.push(...this.numericDataMenuItems())

        items.push('<hr/>')
        items.push(this.overlayTrackAlphaAdjustmentMenuItem())
        items.push(this.trackSeparationMenuItem())

        return items
    }

    /**
     * Returns a MergedFeatureCollection containing an array of features for the specified range, 1 for each track.
     * In addition it contains track names in the same order.
     */
    async getFeatures(chr, bpStart, bpEnd, bpPerPixel) {

        const promises = this.tracks.map((t) => t.getFeatures(chr, bpStart, bpEnd, bpPerPixel))
        const featureArrays = await Promise.all(promises)
        return new MergedFeatureCollection(featureArrays)
    }

    draw(options) {

        const mergedFeatures = options.features    // A MergedFeatureCollection

        for (let i = 0, len = this.tracks.length; i < len; i++) {
            const trackOptions = Object.assign({}, options)
            trackOptions.features = mergedFeatures.featureArrays[i]
            trackOptions.alpha = this.alpha

            if (this.dataRange) {
                // Single data scale for all tracks
                this.tracks[i].dataRange = this.dataRange
            }

            if (this.graphType) {
                this.tracks[i].graphType = this.graphType
            }
            this.tracks[i].draw(trackOptions)
        }
    }

    popupData(clickState) {

        const clickedFeaturesArray = this.clickedFeatures(clickState)

        if (clickedFeaturesArray && clickedFeaturesArray.length === this.tracks.length) {
            // Array of feature arrays, 1 for each track
            const popupData = []
            // Flag used to check if there is at least one track with data
            let noData = true
            for (let i = 0; i < clickedFeaturesArray.length; i++) {


                if (i > 0) popupData.push('<hr/>')
                popupData.push(`<div style=background-color:rgb(245,245,245);border-bottom-style:dashed;border-bottom-width:1px;padding-bottom:5px;padding-top:10px;font-weight:bold;font-size:larger >${clickedFeaturesArray[i].trackName}</div>`)
                if (clickedFeaturesArray[i].features.length > 0) {
                    noData = false

                    const trackPopupData = this.tracks[i].popupData(clickState, clickedFeaturesArray[i].features)
                    popupData.push(...trackPopupData)
                } else {
                    // Notify user if there is no data or all values are 0 for a specific track
                    popupData.push("Missing or 0 value(s)")
                }
            }

            // We don't want to display popup if no track has data.
            // If at least one does, we want to display the popup.
            if (noData === true) {
                return []
            } else {
                return popupData
            }
        }
    }

    clickedFeatures(clickState) {


        // We use the cached features rather than method to avoid async load.  If the
        // feature is not already loaded this won't work,  but the user wouldn't be mousing over it either.
        const mergedFeaturesCollection = clickState.viewport.cachedFeatures

        if (!mergedFeaturesCollection || !mergedFeaturesCollection.featureArrays || !Array.isArray(mergedFeaturesCollection.featureArrays) || mergedFeaturesCollection.featureArrays.length === 0) {
            return []
        }

        const genomicLocation = clickState.genomicLocation
        const clickedFeatures = []

        // When zoomed out we need some tolerance around genomicLocation
        const tolerance = (clickState.referenceFrame.bpPerPixel > 0.2) ? 3 * clickState.referenceFrame.bpPerPixel : 0.2
        const ss = genomicLocation - tolerance
        const ee = genomicLocation + tolerance
        for (let i = 0; i < mergedFeaturesCollection.featureArrays.length; i++) {
            const tmp = (FeatureUtils.findOverlapping(mergedFeaturesCollection.featureArrays[i], ss, ee))
            clickedFeatures.push({
                trackName: mergedFeaturesCollection.trackNames[i],
                features: tmp
            })
        }

        return clickedFeatures
    }

    get supportsWholeGenome() {
        return this.tracks.every(track => track.supportsWholeGenome)
    }

    /**
     * Return json like object for creating a session
     */
    getState() {
        const state = super.getState()
        const trackStates = []
        for (let t of this.tracks) {
            trackStates.push(t.getState())
        }
        state.tracks = trackStates
        return state
    }

    updateScales(visibleViewports) {

        let scaleChange

        if (this.autoscale) {
            scaleChange = true
            let allFeatures = []
            for (let visibleViewport of visibleViewports) {
                if (visibleViewport.featureCache && visibleViewport.featureCache.features) {
                    const referenceFrame = visibleViewport.referenceFrame
                    const start = referenceFrame.start
                    const end = start + referenceFrame.toBP(visibleViewport.getWidth())
                    const mergedFeatureCollection = visibleViewport.featureCache.features

                    if (this.autoscale) {
                        allFeatures.push({value: mergedFeatureCollection.getMax(start, end)})
                        allFeatures.push({value: mergedFeatureCollection.getMin(start, end)})
                    }
                }
                this.dataRange = doAutoscale(allFeatures)
            }
        } else {
            // Individual track scaling
            let idx = -1
            for (let track of this.tracks) {
                ++idx
                if (track.autoscale) {
                    scaleChange = true
                    let allFeatures = []
                    for (let visibleViewport of visibleViewports) {
                        if (visibleViewport.featureCache && visibleViewport.featureCache.features) {
                            const referenceFrame = visibleViewport.referenceFrame
                            const start = referenceFrame.start
                            const end = start + referenceFrame.toBP(visibleViewport.getWidth())
                            const mergedFeatureCollection = visibleViewport.featureCache.features
                            const featureList = mergedFeatureCollection.featureArrays[idx]
                            if (featureList) {
                                for (let f of featureList) {
                                    if (f.end < start) continue
                                    if (f.start > end) break
                                    allFeatures.push(f)
                                }
                            }
                        }
                    }
                    track.dataRange = doAutoscale(allFeatures)
                }
            }
        }
        return scaleChange
    }

    overlayTrackAlphaAdjustmentMenuItem() {

        const container = DOMUtils.div()
        container.innerText = 'Set transparency'

        function dialogPresentationHandler(e) {
            const callback = alpha => {
                this.alpha = Math.max(0.001, alpha)
                this.repaintViews()
            }

            const config =
                {
                    label: 'Transparency',
                    value: this.alpha,
                    min: 0.0,
                    max: 1.0,
                    scaleFactor: 1000,
                    callback
                }

            this.browser.sliderDialog.present(config, e)
        }

        return {object: $(container), dialog: dialogPresentationHandler}
    }

    trackSeparationMenuItem() {

        const object = $('<div>')
        object.text('Separate tracks')

        function click(e) {

            // Capture state which will be nulled when track is removed
            const groupAutoscale = this.autoscale
            const name = this.name
            const tracks = this.tracks
            const browser = this.browser
            const order = this.order

            browser.removeTrack(this)
            for (let track of tracks) {
                track.order = order
                if (groupAutoscale) {
                    track.autoscaleGroup = name
                }
                browser.addTrack(track.config, track)
            }
            browser.updateViews()
        }

        return {object, click}
    }

}


class MergedFeatureCollection {

    constructor(featureArrays) {
        this.featureArrays = featureArrays
    }

    getMax(start, end) {
        let max = -Number.MAX_VALUE

        for (let a of this.featureArrays) {
            for (let f of a) {
                if (typeof f.value === 'undefined' || Number.isNaN(f.value)) {
                    continue
                }
                if (f.end < start) {
                    continue
                }
                if (f.start > end) {
                    break
                }
                max = Math.max(max, f.value)
            }
        }

        return max !== -Number.MAX_VALUE ? max : 100
    }

    // Covers cases in which a track has negative values.
    getMin(start, end) {
        let min = 0
        for (let a of this.featureArrays) {
            for (let f of a) {
                if (typeof f.value !== 'undefined' && !Number.isNaN(f.value)) {
                    if (f.end < start) {
                        continue
                    }
                    if (f.start > end) {
                        break
                    }
                    min = Math.min(min, f.value)
                }
            }
        }
        return min
    }
}


export default MergedTrack
