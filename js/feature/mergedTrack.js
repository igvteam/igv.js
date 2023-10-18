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


/**
 * Represents 2 or more wig tracks overlaid on a common viewport.
 */
class MergedTrack extends TrackBase {

    constructor(config, browser) {
        super(config, browser)
        this.type = "merged"
        this.featureType = 'numeric'
        this.paintAxis = paintAxis
        this.graphType = config.graphType
    }

    init(config) {
        if (!config.tracks) {
            throw Error("Error: no tracks defined for merged track" + config)
        }
        super.init(config)
    }


    async postInit() {

        this.tracks = []
        const p = []
        for (let tconf of this.config.tracks) {
            tconf.isMergedTrack = true
            const t = await this.browser.createTrack(tconf)
            if (t) {
                t.autoscale = false     // Scaling done from merged track
                this.tracks.push(t)
            } else {
                console.warn("Could not create track " + tconf)
            }

            if (typeof t.postInit === 'function') {
                p.push(t.postInit())
            }
        }

        this.alpha = this.config.alpha || 0.5
        this.flipAxis = this.config.flipAxis ? this.config.flipAxis : false
        this.logScale = this.config.logScale ? this.config.logScale : false
        this.autoscale = this.config.autoscale || this.config.max === undefined
        if (!this.autoscale) {
            this.dataRange = {
                min: this.config.min || 0,
                max: this.config.max
            }
        }
        for (let t of this.tracks) {
            t.autoscale = false
            t.dataRange = this.dataRange
        }

        this.height = this.config.height || 50

        this.resolutionAware = this.tracks.some(t => t.resolutionAware)

        return Promise.all(p)
    }

    get height() {
        return this._height
    }

    set height(h) {
        this._height = h
        if (this.tracks) {
            for (let t of this.tracks) {
                t.height = h
                t.config.height = h
            }
        }
    }

    menuItemList() {
        const items = []
        if (this.flipAxis !== undefined) {
            items.push({
                label: "Flip y-axis",
                click: function flipYAxisHandler(){
                    this.flipAxis = !this.flipAxis
                    this.trackView.repaintViews()
                }
            })
        }

        items.push(...this.numericDataMenuItems())

        return items
    }

    /**
     * Returns a MergedFeatureCollection containing an array of features for the specified range, 1 for each track.
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

            this.tracks[i].dataRange = this.dataRange
            this.tracks[i].flipAxis = this.flipAxis
            this.tracks[i].logScale = this.logScale
            if (this.graphType) {
                this.tracks[i].graphType = this.graphType
            }
            this.tracks[i].draw(trackOptions)
        }
    }

    popupData(clickState) {

        if (clickState.viewport && clickState.viewport.cachedFeatures) {

            const featuresArray = clickState.viewport.cachedFeatures.featureArrays

            if (featuresArray && featuresArray.length === this.tracks.length) {
                // Array of feature arrays, 1 for each track
                const popupData = []
                for (let i = 0; i < this.tracks.length; i++) {
                    if (i > 0) popupData.push('<hr/>')
                    popupData.push(`<div style=background-color:rgb(245,245,245);border-bottom-style:dashed;border-bottom-width:1px;padding-bottom:5px;padding-top:10px;font-weight:bold;font-size:larger >${this.tracks[i].name}</div>`)
                    const trackPopupData = this.tracks[i].popupData(clickState, featuresArray[i])
                    popupData.push(...trackPopupData)

                }
                return popupData
            }
        }
    }

    clickedFeatures(clickState) {


        // We use the cached features rather than method to avoid async load.  If the
        // feature is not already loaded this won't work,  but the user wouldn't be mousing over it either.
        const mergedFeaturesCollection = clickState.viewport.cachedFeatures

        if (!mergedFeaturesCollection) {
            return []
        }

        const genomicLocation = clickState.genomicLocation
        const clickedFeatures = []
        for (let features of mergedFeaturesCollection.featureArrays) {
            // When zoomed out we need some tolerance around genomicLocation
            const tolerance = (clickState.referenceFrame.bpPerPixel > 0.2) ? 3 * clickState.referenceFrame.bpPerPixel : 0.2
            const ss = genomicLocation - tolerance
            const ee = genomicLocation + tolerance
            const tmp = (FeatureUtils.findOverlapping(features, ss, ee))
            for (let f of tmp) {
                clickedFeatures.push(f)
            }
        }
        return clickedFeatures
    }


    get supportsWholeGenome() {
        return this.tracks.every(track => track.supportsWholeGenome)
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
                if (typeof f.value !== 'undefined' && !Number.isNaN(f.value)) {
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
        return max
    }

}

export default MergedTrack
