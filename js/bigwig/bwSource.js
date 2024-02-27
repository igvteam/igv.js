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

    queryable = true
    wgValues = {}
    windowFunctions = ["mean", "min", "max"]

    constructor(config, genome) {
        this.reader = new BWReader(config, genome)
        this.genome = genome
        this.format = config.format || "bigwig"
    }

    async getFeatures({chr, start, end, bpPerPixel, windowFunction}) {

        await  this.reader.loadHeader()
        const isBigWig = this.reader.type === "bigwig"

        const features = (chr.toLowerCase() === "all") ?
            (isBigWig ? await this.getWGValues(windowFunction) : []) :
            await this.reader.readFeatures(chr, start, chr, end, bpPerPixel, windowFunction)

        if (!isBigWig) {
            pack(features)
        }
        return features
    }

    async getHeader() {
        return this.reader.loadHeader()
    }

    async defaultVisibilityWindow() {
        if (this.reader.type === "bigwig") {
            return -1
        } else {
            return this.reader.featureDensity ?  Math.floor(10000 / this.reader.featureDensity) : -1
        }

    }

    async getWGValues(windowFunction) {

        const numberOfBins = 1000      // This doesn't need to be precise
        const genome = this.genome

        if (this.wgValues[windowFunction]) {
            return this.wgValues[windowFunction]
        } else {

            const bpPerPixel = genome.getGenomeLength() / numberOfBins
            const features = await this.reader.readWGFeatures(bpPerPixel, windowFunction)
            let wgValues = []
            for (let f of features) {
                const chr = f.chr
                const offset = genome.getCumulativeOffset(chr)
                const wgFeature = Object.assign({}, f)
                wgFeature.chr = "all"
                wgFeature.start = offset + f.start
                wgFeature.end = offset + f.end
                wgFeature._f = f
                wgValues.push(wgFeature)
            }
            wgValues.sort((a, b) => a.start - b.start)
            this.wgValues[windowFunction] = wgValues
            return wgValues
        }
    }

    supportsWholeGenome() {
        return this.reader.type === "bigwig"
    }

    async trackType() {
        return this.reader.getTrackType()
    }

    get searchable() {
        return this.reader.searchable
    }

    async search(term) {
        return this.reader.search(term)
    }
}

export default BWSource
