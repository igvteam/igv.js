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

import FeatureSource from '../feature/featureSource.js'
import {appleCrayonRGBA, rgbaStringTokens} from '../util/colorPalletes.js'

const ROI_DEFAULT_ALPHA = 1/16
const ROI_DEFAULT_COLOR = appleCrayonRGBA('sea_foam', ROI_DEFAULT_ALPHA)

// TODO: Header is currently transparent. When menu is implemented header will have a color distinct from body color
const ROI_HEADER_DEFAULT_COLOR = 'rgba(0,0,0,0)'

class ROISet {

    constructor(config, genome) {

        this.name = config.name

        if (config.url) {
            this.url = config.url
            this.isImmutable = true
        } else {
            this.isImmutable = false
        }

        if (config.features) {
            this.features = config.features.slice()
            this.featureSource =
                {
                    getFeatures :(chr, start, end) => this.features.map(({ chr, start, end }) => {
                        return { chr: genome.getChromosomeName(chr), start, end }
                    })
                }
        } else {
            this.featureSource = config.featureSource || FeatureSource(config, genome)
        }

        this.color = config.color || ROI_DEFAULT_COLOR

        // Use ROI_HEADER_DEFAULT_COLOR (transparent) until header functionality becomes real
        this.headerColor = ROI_HEADER_DEFAULT_COLOR

        // Use body color with alpha pinned to 1
        // const [ r, g, b, a ] = rgbaStringTokens(this.color)
        // this.headerColor = `rgba(${ r },${ g },${ b },${ 1.0 })`

    }

    async getFeatures(chr, start, end) {
        return this.featureSource.getFeatures({chr, start, end})
    }

    toJSON() {

        if (this.url) {
            return { name: this.name, color:this.color, url: this.url }
        } else {
            return { name: this.name, color:this.color, features: this.features.slice() }
        }
    }

}

const SCREEN_COORDS_WIDTH_THRESHOLD = 3

function screenCoordinates(regionStartBP, regionEndBP, startBP, bpp) {

    let xStart = Math.round((regionStartBP - startBP) / bpp)
    const xEnd = Math.round((regionEndBP - startBP) / bpp)

    let width = xEnd - xStart

    if (width < SCREEN_COORDS_WIDTH_THRESHOLD) {
        width = SCREEN_COORDS_WIDTH_THRESHOLD
        xStart -= 1
    }

    return { x:xStart, width }
}

export { ROI_DEFAULT_COLOR, ROI_HEADER_DEFAULT_COLOR, screenCoordinates }

export default ROISet
