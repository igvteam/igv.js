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
 * Represents 2 or more  tracks overlaid on a common viewport.
 */
class MergedTrack extends TrackBase {

    static defaults = {
        autoscale: undefined,
        alpha: 0.5,
        height: 50
    }

    constructor(config, browser, tracks) {
        super(config, browser)
        this.type = "merged"
        this.paintAxis = paintAxis
        this.graphType = config.graphType
        if (tracks) {
            this.tracks = tracks   // Dynamic creation, actual track objects (not configurations)
        } else {
            this.tracks = []
        }
    }


    async postInit() {

        if (this.config.tracks) {
            // Track configurations, this indicates a configured merged track as opposed to dynamic merge through the UI
            // Actual track objects need to be created.
            for (let tconf of this.config.tracks) {
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
            // Default to autoscale unless scale if range or autoscale is not otherwise defined
            const allTracksSpecified = this.config.tracks.every(config => config.autoscale !== undefined || config.max !== undefined)
            if (!allTracksSpecified) {
                this.config.autoscale = this.config.max === undefined
            }
        }

        // Mark constitutive tracks as merged.
        for (let t of this.tracks) t.isMergedTrack = true

        // Explicit settings -- these will override any individual track settings
        if(this.config.autoscale) {
            this.autoscale = this.config.autoscale
        } else if (this.config.max !== undefined) {
            this.setDataRange ({
                min: this.config.min || 0,
                max: this.config.max
            })
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
        for (let t of numericTracks(this.tracks)) {
            t.flipAxis = b
        }
    }

    get flipAxis() {
        return numericTracks(this.tracks).every(t => t.flipAxis)
    }

    set logScale(b) {
        this.config.logScale = b
        for (let t of numericTracks(this.tracks)) {
            t.logScale = b
        }
    }

    get logScale() {
        return numericTracks(this.tracks).every(t => t.logScale)
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

    set autoscale(b) {
        this._autoscale = b
        if(b === false && this.tracks) {
            for(let t of this.tracks) t.autoscale = false
        }
    }

    get autoscale() {
        return this._autoscale
    }

    set autoscaleGroup(g) {
        if(this.tracks) {
            for(let t of this.tracks) t.autoscaleGroup = g
        }
    }

    get autoscaleGroup() {
        if(this.tracks && this.tracks.length > 0) {
            const g = this.tracks[0].autoscaleGroup
            return (this.tracks.some(t => g !== t.autoscaleGroup)) ? undefined : g
        }
    }

    /**
     * Set the data range of all constitutive numeric tracks.  This method is called from the menu item, i.e. an explicit
     * setting, so it should disable autoscale as well.
     *
     * @param min
     * @param max
     */

    setDataRange({min, max}) {
        this.autoscale = false
        for (const track of numericTracks(this.tracks)) {
            track.dataRange = {min, max}
            track.autoscale = false
            track.autoscaleGroup = false
        }
    }

    set dataRange({min, max}) {
        for (const track of numericTracks(this.tracks)) {
            track.dataRange = {min, max}
        }
    }

    /**
     * Return a DataRang {min, max} if all constitutive numeric tracks have identical range.  A numeric track is defined
     * as a track with a data range.  Otherwise return undefined.
     *
     * @returns {{min: any, max: any}|undefined}
     */
    get dataRange() {
        if(this.tracks) {
            const num = numericTracks(this.tracks)
            if (num.length > 0) {
                const firstRange = num[0].dataRange
                if (num.every(t => t.dataRange && t.dataRange.min === firstRange.min && t.dataRange.max === firstRange.max)) {
                    return firstRange
                }
            }
        }
        return undefined
    }


    menuItemList() {
        const items = []
        if (numericTracks(this.tracks).length > 0) {

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
        }

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
        
        if (featureArrays.every((arr) => arr.length === 0)){
            return new MergedFeatureCollection([], [])
        }
        else {
            const trackNames = this.tracks.map((t) => t.name)
            return new MergedFeatureCollection(featureArrays, trackNames)
        }
    }

    draw(options) {

        const mergedFeatures = options.features    // A MergedFeatureCollection

        for (let i = 0, len = this.tracks.length; i < len; i++) {
            const trackOptions = Object.assign({}, options)
            trackOptions.features = mergedFeatures.featureArrays[i]
            trackOptions.alpha = this.alpha

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
            // Overrides any specific track scale settings
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
                const dataRange = doAutoscale(allFeatures)
                for (const track of numericTracks(this.tracks)) {
                    // Do not use this.dataRange, as that has side effects
                    track.dataRange = dataRange
                }

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
                track.isMergedTrack = false
                browser.addTrack(track.config, track)
            }
            browser.updateViews()
        }

        return {object, click}
    }

}


class MergedFeatureCollection {

    constructor(featureArrays,trackNames) {
        this.featureArrays = featureArrays
        //trackNames is needed for the popup data to populate track names 
        //preserving the order of the actual tracks
        this.trackNames = trackNames
    }

    getMax(start, end) {
        let max = -Number.MAX_VALUE

        for (let a of this.featureArrays) {
            if (Array.isArray(a)) {
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
        }

        return max !== -Number.MAX_VALUE ? max : 100
    }

    // Covers cases in which a track has negative values.
    getMin(start, end) {
        let min = 0
        for (let a of this.featureArrays) {
            if (Array.isArray(a)) {
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
        }
        return min
    }
}

/**
 * Heuristic for finding numeric tracks.
 *
 * @param tracks
 * @returns {*}
 */
const numericTracks = (tracks) => {
    return tracks ? tracks.filter(track => undefined !== track.dataRange || undefined !== track.autoscale || undefined !== track.autoscaleGroup) : []
}


export default MergedTrack
