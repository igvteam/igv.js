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

import BWReader from "./bwReader";

const BWSource = function (config, genome) {
    this.reader = new BWReader(config, genome);
    this.genome = genome;
    this.wgValues = {};
};


BWSource.prototype.getFeatures = function (chr, bpStart, bpEnd, bpPerPixel, windowFunction) {

    let self = this;

    if (chr.toLowerCase() === "all") {
        return self.getWGValues(windowFunction);
    } else {
        return self.reader.readFeatures(chr, bpStart, chr, bpEnd, bpPerPixel, windowFunction);
    }
}


BWSource.prototype.getDefaultRange = function () {

    if (this.reader.totalSummary != undefined) {
        return this.reader.totalSummary.defaultRange;
    } else {
        return undefined;
    }
}

BWSource.prototype.defaultVisibilityWindow = function () {

    if (this.reader.type === 'bigwig') {
        return Promise.resolve(undefined);
    } else {
        // bigbed
        let genomeSize = this.genome ? this.genome.getGenomeLength() : 3088286401;
        return this.reader.loadHeader()
            .then(function (header) {
                // Estimate window size to return ~ 1,000 features, assuming even distribution across the genome
                return 1000 * (genomeSize / header.dataCount);
            })
    }
}

BWSource.prototype.getWGValues = function (windowFunction) {
    let self = this,
        bpPerPixel,
        nominalScreenWidth = 500;      // This doesn't need to be precise

    const genome = this.genome;

    if (self.wgValues[windowFunction]) {
        return Promise.resolve(self.wgValues[windowFunction]);
    } else {

        bpPerPixel = genome.getGenomeLength() / nominalScreenWidth;

        return self.reader.readWGFeatures(bpPerPixel, windowFunction)

            .then(function (features) {

                let wgValues = [];

                features.forEach(function (f) {

                    let wgFeature, offset, chr;

                    chr = f.chr;
                    offset = genome.getCumulativeOffset(chr);

                    wgFeature = Object.assign({}, f);
                    wgFeature.chr = "all";
                    wgFeature.start = offset + f.start;
                    wgFeature.end = offset + f.end;
                    wgValues.push(wgFeature);
                })

                self.wgValues[windowFunction] = wgValues;

                return wgValues;

            })

    }
}

BWSource.prototype.supportsWholeGenome = function () {
    return true;
}


export default BWSource;
