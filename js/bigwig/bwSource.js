/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
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

import BWReader from "./bwReader.js"
import pack from "../feature/featurePacker.js"

class BWSource {

    constructor(config, genome) {
        this.reader = new BWReader(config, genome)
        this.genome = genome
        this.format = config.format || "bigwig"
        this.wgValues = {}
    }

    async getFeatures({chr, start, end, bpPerPixel, windowFunction}) {

        const features = (chr.toLowerCase() === "all") ?
            await this.getWGValues(windowFunction) :
            await this.reader.readFeatures(chr, start, chr, end, bpPerPixel, windowFunction)

        const isBigWig = this.reader.type === "bigwig"
        if (!isBigWig) {
            pack(features)
        }
        return features
    }

    async getHeader() {
        return this.reader.loadHeader()
    }

    getDefaultRange() {
        if (this.reader.totalSummary !== undefined) {
            return this.reader.totalSummary.defaultRange
        } else {
            return undefined
        }
    }

    async defaultVisibilityWindow() {
        return this.reader.defaultVisibilityWindow
    }

    async getWGValues(windowFunction) {

        const nominalScreenWidth = 1000      // This doesn't need to be precise
        const genome = this.genome

        if (this.wgValues[windowFunction]) {
            return this.wgValues[windowFunction]
        } else {

            const bpPerPixel = genome.getGenomeLength() / nominalScreenWidth
            const features = await this.reader.readWGFeatures(bpPerPixel, windowFunction)
            let wgValues = []
            for (let f of features) {
                const chr = f.chr
                const offset = genome.getCumulativeOffset(chr)
                const wgFeature = Object.assign({}, f)
                wgFeature.chr = "all"
                wgFeature.start = offset + f.start
                wgFeature.end = offset + f.end
                wgValues.push(wgFeature)
            }
            this.wgValues[windowFunction] = wgValues
            return wgValues
        }
    }

    supportsWholeGenome() {
        return this.reader.type === "bigwig" || this.defaultVisibilityWindow() <= 0
    }

    async trackType() {
        return this.reader.getTrackType()
    }

    get multiresolution() {
        return this.trackType() === "wig"
    }
}

export default BWSource
