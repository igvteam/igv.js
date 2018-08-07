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

/**
 * Created by jrobinso on 4/7/14.
 */


var igv = (function (igv) {

    igv.BWSource = function (config) {
        this.reader = new igv.BWReader(config);
        this.wgValues = {};
    };


    igv.BWSource.prototype.getFeatures = function (chr, bpStart, bpEnd, bpPerPixel, windowFunction) {

        var self = this;

        if (chr.toLowerCase() === "all") {
            return self.getWGValues(windowFunction);
        } else {
            return self.reader.readFeatures(chr, bpStart, chr, bpEnd, bpPerPixel, windowFunction);
        }
    }


    igv.BWSource.prototype.getDefaultRange = function () {

        if (this.reader.totalSummary != undefined) {
            return this.reader.totalSummary.defaultRange;
        }
        else {
            return undefined;
        }
    }

    igv.BWSource.prototype.defaultVisibilityWindow = function () {

        if (this.reader.type === 'bigwig') {
            return Promise.resolve(undefined);
        }
        else {
            // bigbed
            let genomeSize = getGenomeLength();
            return this.reader.loadHeader()
                .then(function (header) {
                    // Estimate window size to return ~ 1,000 features, assuming even distribution across the genome
                    return 1000 * (genomeSize / header.dataCount);
                })
        }
        
        function getGenomeLength() {
            if (igv.browser && igv.browser.genome) {
                return igv.browser.genome.getGenomeLength();
            }
            else {
                return 3088286401;
            }
        }

    }

    igv.BWSource.prototype.getWGValues = function (windowFunction) {
        var self = this,
            bpPerPixel,
            nominalScreenWidth = 500;      // This doesn't need to be precise

        if (self.wgValues[windowFunction]) {
            return Promise.resolve(self.wgValues[windowFunction]);
        }
        else {

            bpPerPixel = igv.browser.genome.getGenomeLength() / nominalScreenWidth;

            return self.reader.readWGFeatures(igv.browser.genome, bpPerPixel, windowFunction)

                .then(function (features) {

                    var wgValues = [];

                    features.forEach(function (f) {

                        var wgFeature, offset, chr;

                        chr = f.chr;
                        offset = igv.browser.genome.getCumulativeOffset(chr);

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

    igv.BWSource.prototype.supportsWholeGenome = function() {
        return true;
    }


    return igv;


})
(igv || {});
