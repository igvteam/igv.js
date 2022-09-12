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

import {FileUtils, StringUtils} from '../../node_modules/igv-utils/src/index.js'
import FeatureSource from '../feature/featureSource.js'
import {appleCrayonRGBA} from '../util/colorPalletes.js'
import {computeWGFeatures} from "../feature/featureUtils.js"
import * as TrackUtils from "../util/trackUtils.js"


const appleCrayonColorName = 'nickel'

const ROI_DEFAULT_ALPHA = 2 / 16

const ROI_DEFAULT_COLOR = appleCrayonRGBA(appleCrayonColorName, ROI_DEFAULT_ALPHA)
const ROI_DEFAULT_HEADER_COLOR = 'rgb(190,190,190)'

const ROI_USER_HEADER_DEFINED_COLOR = 'rgba(155,185,129)'
const ROI_USER_DEFINED_COLOR = ROI_DEFAULT_COLOR

class ROISet {

    constructor(config, genome) {

        this.url = config.url

        if (config.name) {
            this.name = config.name
        } else if (config.url && FileUtils.isFile(config.url)) {
            this.name = config.url.name
        } else if (config.url && StringUtils.isString(config.url) && !config.url.startsWith("data:")) {
            this.name = FileUtils.getFilename(config.url)
        }

        this.isUserDefined = config.isUserDefined

        if (config.features) {
            this.featureSource = new DynamicFeatureSource(config.features, genome)
        } else {
            if (config.format) {
                config.format = config.format.toLowerCase()
            } else {
                const filename = FileUtils.getFilename(config.url)
                config.format = TrackUtils.inferFileFormat(filename)
            }
            this.featureSource = config.featureSource || FeatureSource(config, genome)
        }

        if (true === this.isUserDefined) {
            this.color = config.color || ROI_USER_DEFINED_COLOR
            this.headerColor = ROI_USER_HEADER_DEFINED_COLOR

        } else {

            this.color = config.color || ROI_DEFAULT_COLOR
            this.headerColor = ROI_DEFAULT_HEADER_COLOR

            // Use body color with alpha pinned to 1
            // const [ r, g, b, discard ] = rgbaStringTokens(this.color)
            // this.headerColor = `rgba(${ r },${ g },${ b },${ 1.0 })`

        }
    }

    async getFeatures(chr, start, end) {
        return this.featureSource.getFeatures({chr, start, end})
    }

    async getAllFeatures() {
        return typeof this.featureSource.getAllFeatures === 'function' ? await this.featureSource.getAllFeatures() : {}
    }

    addFeature(feature) {
        if (this.isUserDefined) {
            this.featureSource.addFeature(feature)
        } else {
            console.error("Attempt to add ROI to non user-defined set")
        }
    }

    removeFeature(feature) {
        if (this.isUserDefined) {
            this.featureSource.removeFeature(feature)
        } else {
            console.error("Attempt to remove ROI from non user-defined set")
        }
    }

    toJSON() {
        if (this.url) {
            return {name: this.name, color: this.color, url: this.url, isUserDefined: this.isUserDefined}
        } else {
            const featureMap = this.featureSource.getAllFeatures()
            const features = []
            for (let chr of Object.keys(featureMap)) {
                for (let f of featureMap[chr]) {
                    features.push(f)
                }
            }
            return {name: this.name, color: this.color, features: features, isUserDefined: this.isUserDefined}
        }
    }

    dispose() {
        for (let key of Object.keys(this)) {
            this[key] = undefined
        }
    }

}

const SCREEN_COORDS_WIDTH_THRESHOLD = 3

function screenCoordinates(regionStartBP, regionEndBP, bpStart, bpp) {

    let xStart = Math.round((regionStartBP - bpStart) / bpp)
    const xEnd = Math.round((regionEndBP - bpStart) / bpp)

    let width = xEnd - xStart

    if (width < SCREEN_COORDS_WIDTH_THRESHOLD) {
        width = SCREEN_COORDS_WIDTH_THRESHOLD
        xStart -= 1
    }

    return {x: xStart, width}
}


/**
 * Special feature source that allows addition of features dynamically
 */
class DynamicFeatureSource {

    constructor(features, genome) {
        this.featureMap = {}
        this.genome = genome

        for (let feature of features) {

            // Store as canonical chr name (i.e. translate aliases)
            const chrKey = genome ? genome.getChromosomeName(feature.chr) : feature.chr

            let featureList = this.featureMap[chrKey]
            if (!featureList) {
                featureList = []
                this.featureMap[chrKey] = featureList
            }
            featureList.push(feature)
        }

        for (let key of Object.keys(this.featureMap)) {
            this.featureMap[key].sort((a, b) => a.start - b.start)
        }
    }

    getFeatures({chr, start, end}) {
        if (chr.toLowerCase() === 'all') {
            return computeWGFeatures(this.featureMap, this.genome)
        } else {
            // TODO -- this use of filter is O(N), and might not scale well for large feature lists.
            const featureList = this.featureMap[chr]
            return featureList ? featureList.filter(feature => feature.end > start && feature.start < end) : []
        }
    }

    getAllFeatures() {
        return this.featureMap
    }

    supportsWholeGenome() {
        return true
    }

    addFeature(feature) {
        let featureList = this.featureMap[feature.chr]
        if (!featureList) {
            featureList = []
            this.featureMap[feature.chr] = featureList
        }
        featureList.push(feature)
        featureList.sort((a, b) => a.start - b.start)
    }

    removeFeature({chr, start, end}) {

        if (this.featureMap[chr]) {
            const match = `${chr}-${start}-${end}`
            this.featureMap[chr] = this.featureMap[chr].filter(feature => match !== `${feature.chr}-${feature.start}-${feature.end}`)
        }
    }
}


export {ROI_DEFAULT_COLOR, ROI_USER_DEFINED_COLOR, screenCoordinates}

export default ROISet
