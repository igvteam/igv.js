/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014-2015 Broad Institute
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

import FeatureFileReader from "./feature/featureFileReader.js";
import GenomicInterval from "./genome/genomicInterval.js";

/**
 *
 * feature source for "bed like" files (tab delimited files with 1 feature per line: bed, gff, vcf, etc)
 *
 * @param config
 * @constructor
 */
const ROISource = function (config) {
    this.config = config || {};
    this.sourceType = (config.sourceType === undefined ? "file" : config.sourceType);
    this.reader = new FeatureFileReader(config);
};

ROISource.prototype.getRegions = function (chr, bpStart, bpEnd) {

    var self = this;
    return new Promise(function (fulfill, reject) {

        var genomicInterval;

        genomicInterval = new GenomicInterval(chr, bpStart, bpEnd);

        self.reader
            .readFeatures(chr, genomicInterval.start, genomicInterval.end)
            .then(function (features) {
                fulfill(features)
            })
            .catch(reject);
    });
};

export default ROISource;