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

class MergedTrack extends TrackBase {

    constructor(config, browser) {
        super(config, browser)
    }

    init(config) {
        if (!config.tracks) {
            throw Error("Error: no tracks defined for merged track" + config)
        }

        super.init(config)
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

        this.height = this.config.height || 100

        return Promise.all(p)
    }


    async getFeatures(chr, bpStart, bpEnd, bpPerPixel) {

        const promises = this.tracks.map((t) => t.getFeatures(chr, bpStart, bpEnd, bpPerPixel))
        return Promise.all(promises)
    }

    draw(options) {

        var i, len, mergedFeatures, trackOptions, dataRange

        mergedFeatures = options.features    // Array of feature arrays, 1 for each track

        dataRange = autoscale(options.referenceFrame.chr, mergedFeatures)

        //IGVGraphics.fillRect(options.context, 0, options.pixelTop, options.pixelWidth, options.pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

        for (i = 0, len = this.tracks.length; i < len; i++) {

            trackOptions = Object.assign({}, options)
            trackOptions.features = mergedFeatures[i]
            this.tracks[i].dataRange = dataRange
            this.tracks[i].draw(trackOptions)
        }

    }

    paintAxis(ctx, pixelWidth, pixelHeight) {

        var i, len, autoscale, track

        autoscale = true   // Hardcoded for now

        for (i = 0, len = this.tracks.length; i < len; i++) {

            track = this.tracks[i]

            if (typeof track.paintAxis === 'function') {
                track.paintAxis(ctx, pixelWidth, pixelHeight)
                if (autoscale) break
            }
        }
    }

    popupData(clickState, features) {

        const featuresArray = features || clickState.viewport.getCachedFeatures()

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


    supportsWholeGenome() {
        const b = this.tracks.every(track => track.supportsWholeGenome())
        return b
    }
}

function autoscale(chr, featureArrays) {


    var min = 0,
        max = -Number.MAX_VALUE,
        allValues

    // if (chr === 'all') {
    //     allValues = [];
    //     featureArrays.forEach(function (features) {
    //         features.forEach(function (f) {
    //             if (!Number.isNaN(f.value)) {
    //                 allValues.push(f.value);
    //             }
    //         });
    //     });
    //
    //     min = Math.min(0, IGVMath.percentile(allValues, .1));
    //     max = IGVMath.percentile(allValues, 99.9);
    //
    // }
    // else {
    featureArrays.forEach(function (features, i) {
        features.forEach(function (f) {
            if (typeof f.value !== 'undefined' && !Number.isNaN(f.value)) {
                min = Math.min(min, f.value)
                max = Math.max(max, f.value)
            }
        })
    })
    //  }
    return {min: min, max: max}
}

export default MergedTrack
