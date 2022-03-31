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

import FeatureSource from './feature/featureSource.js'
import IGVGraphics from "./igv-canvas.js"
import {appleCrayonRGBA} from './util/colorPalletes.js'

// const ROI_DEFAULT_COLOR = 'rgba(68, 134, 247, 0.25)'

const ROI_DEFAULT_ALPHA = 1/16
const ROI_DEFAULT_COLOR = appleCrayonRGBA('steel', ROI_DEFAULT_ALPHA)
const ROI_HEADER_DEFAULT_COLOR = appleCrayonRGBA('sea_foam', 8 * ROI_DEFAULT_ALPHA)

const TRACK_ROI_TYPE = 2
const GLOBAL_ROI_TYPE = 4

class ROI {

    constructor(config, genome, type) {
        this.config = config
        this.name = config.name
        this.featureSource = config.featureSource || FeatureSource(config, genome)
        this.color = config.color || ROI_HEADER_DEFAULT_COLOR
        this.type = type
    }

    async getFeatures(chr, start, end) {
        return this.featureSource.getFeatures({chr, start, end})
    }

    draw(drawConfiguration) {

        const regions = drawConfiguration.features
        if (!regions) {
            return
        }

        const endBP = drawConfiguration.bpStart + (drawConfiguration.pixelWidth * drawConfiguration.bpPerPixel + 1)
        for (let { start:regionStartBP, end:regionEndBP } of regions) {

            if (regionEndBP < drawConfiguration.bpStart) {
                continue
            }

            if (regionStartBP > endBP) {
                break
            }

            const { x, width } = screenCoordinates(regionStartBP, regionEndBP, drawConfiguration.bpStart, drawConfiguration.bpPerPixel)
            IGVGraphics.fillRect(drawConfiguration.context, x, drawConfiguration.pixelTop, width, drawConfiguration.pixelHeight, {fillStyle: this.color})
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

export { screenCoordinates, TRACK_ROI_TYPE, GLOBAL_ROI_TYPE, ROI_DEFAULT_COLOR, ROI_HEADER_DEFAULT_COLOR }
export default ROI
