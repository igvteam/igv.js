/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016 University of California San Diego
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

var igv = (function (igv) {

    var pairsSupported = true,
        downSample = true;

    function canBePaired(alignment) {
        return alignment.isPaired() &&
            alignment.isMateMapped() &&
            alignment.chr === alignment.mate.chr &&
            (alignment.isFirstOfPair() || alignment.isSecondOfPair()) && !(alignment.isSecondary() || alignment.isSupplementary());
    }


    /**
     * Container for alignments that downsamples and computes coverage
     *
     * @param chr
     * @param start
     * @param end
     * @constructor
     */
    igv.AlignmentContainer = function (chr, start, end, samplingWindowSize, samplingDepth) {

        this.chr = chr;
        this.start = start;
        this.end = end;
        this.length = (end - start);

        this.coverageMap = new CoverageMap(chr, start, end);
        this.alignments = [];
        this.downsampledIntervals = [];

        this.samplingWindowSize = samplingWindowSize === undefined ? 100 : samplingWindowSize;
        this.samplingDepth = samplingDepth === undefined ? 100 : samplingDepth;

        this.pairs = {};

        this.filter = function filter(alignment) {         // TODO -- pass this in
            return alignment.isMapped() && !alignment.isFailsVendorQualityCheck();
        }

    }
var count=0;

    igv.AlignmentContainer.prototype.push = function (alignment) {

        var pairedAlignment;

        if (this.filter(alignment) === false) return;

    //    if(Object.keys(this.pairs).length > 5000) return; // pairsSupported = false;

        this.coverageMap.incCounts(alignment);

        pairedAlignment = pairsSupported ?
            this.pairs[alignment.readName] :
            undefined;

        if (pairsSupported && canBePaired(alignment) && pairedAlignment) {

            //Not subject to downsampling, just updating an existing alignment
            pairedAlignment.setSecondAlignment(alignment);
            //this.pairs[alignment.readName] = undefined;   // Don't need to track this anymore. NOTE: Don't "delete", causes runtime performance issues
        }
        else {

            if (downSample) {
                if (this.currentBucket === undefined) {
                    this.currentBucket = new DownsampleBucket(alignment.start, alignment.start + this.samplingWindowSize, this);
                }
                if (alignment.start >= this.currentBucket.end) {
                    finishBucket.call(this);
                    this.currentBucket = new DownsampleBucket(alignment.start, alignment.start + this.samplingWindowSize, this);
                }

                this.currentBucket.addAlignment(alignment);

            }
            else {
                if (pairsSupported && canBePaired(alignment)) {
                    alignment = new igv.PairedAlignment(alignment);
                    this.pairs[alignment.readName] = alignment;
                }
                this.alignments.push(alignment);

            }
        }

    }

    igv.AlignmentContainer.prototype.forEach = function (callback) {
        this.alignments.forEach(callback);
    }

    igv.AlignmentContainer.prototype.finish = function () {
        if (this.currentBucket !== undefined) {
            finishBucket.call(this);
        }
        this.alignments.sort(function (a, b) {
            return a.start - b.start
        });
        this.pairs = undefined;
    }

    igv.AlignmentContainer.prototype.contains = function (chr, start, end) {
        return this.chr == chr &&
            this.start <= start &&
            this.end >= end;
    }

    igv.AlignmentContainer.prototype.hasDownsampledIntervals = function () {
        return this.downsampledIntervals && this.downsampledIntervals.length > 0;
    }

    function finishBucket() {
        this.alignments = this.alignments.concat(this.currentBucket.alignments);
        if (this.currentBucket.downsampledCount > 0) {
            this.downsampledIntervals.push(new DownsampledInterval(
                this.currentBucket.start,
                this.currentBucket.end,
                this.currentBucket.downsampledCount));
        }
    }

    function DownsampleBucket(start, end, alignmentContainer) {

        this.start = start;
        this.end = end;
        this.alignments = [];
        this.downsampledCount = 0;
        this.samplingDepth = alignmentContainer.samplingDepth;
        this.pairs = alignmentContainer.pairs;
    }

    DownsampleBucket.prototype.addAlignment = function (alignment) {

        var samplingProb, idx, replacedAlignment;

        if (this.alignments.length < this.samplingDepth) {
            if (pairsSupported && canBePaired(alignment)) {
                // We'll never see the second mate of a pair here
                alignment = new igv.PairedAlignment(alignment);
                this.pairs[alignment.readName] = alignment;
            }
            this.alignments.push(alignment);

        } else {
            samplingProb = this.samplingDepth / (this.samplingDepth + this.downsampledCount + 1);

            if (Math.random() < samplingProb) {

                idx = Math.floor(Math.random() * (this.alignments.length - 1));

                if (pairsSupported && canBePaired(alignment)) {

                    //replacedAlignment = this.alignments[idx];
                    //if(this.pairs.hasOwnProperty(replacedAlignment.readName)) {
                    //    this.pairs[replacedAlignment.readName] = undefined;
                    //}

                    alignment = new igv.PairedAlignment(alignment);
                    this.pairs[alignment.readName] = alignment;
                }

                this.alignments[idx] = alignment;

            }

            this.downsampledCount++;
        }

    }


    function CoverageMap(chr, start, end) {

        this.chr = chr;
        this.bpStart = start;
        this.length = (end - start);

        this.coverage = new Array(this.length);

        this.maximum = 0;

        this.threshold = 0.2;
        this.qualityWeight = true;
    }

    CoverageMap.prototype.incCounts = function (alignment) {

        var self = this;

        if (alignment.blocks === undefined) {

            incBlockCount(alignment);
        }
        else {
            alignment.blocks.forEach(function (block) {
                incBlockCount(block);
            });
        }

        function incBlockCount(block) {

            var key,
                base,
                i,
                j,
                q;

            for (i = block.start - self.bpStart, j = 0; j < block.len; i++, j++) {

                if (!self.coverage[i]) {
                    self.coverage[i] = new Coverage();
                }

                base = block.seq.charAt(j);
                key = (alignment.strand) ? "pos" + base : "neg" + base;
                q = block.qual[j];

                self.coverage[i][key] += 1;
                self.coverage[i]["qual" + base] += q;

                self.coverage[i].total += 1;
                self.coverage[i].qual += q;

                self.maximum = Math.max(self.coverage[i].total, self.maximum);

            }
        }
    }

    function Coverage() {
        this.posA = 0;
        this.negA = 0;

        this.posT = 0;
        this.negT = 0;

        this.posC = 0;
        this.negC = 0;
        this.posG = 0;

        this.negG = 0;

        this.posN = 0;
        this.negN = 0;

        this.pos = 0;
        this.neg = 0;

        this.qualA = 0;
        this.qualT = 0;
        this.qualC = 0;
        this.qualG = 0;
        this.qualN = 0;

        this.qual = 0;

        this.total = 0;
    }

    Coverage.prototype.isMismatch = function (refBase) {

        var myself = this,
            mismatchQualitySum,
            threshold = igv.CoverageMap.threshold * ((igv.CoverageMap.qualityWeight && this.qual) ? this.qual : this.total);

        mismatchQualitySum = 0;
        ["A", "T", "C", "G"].forEach(function (base) {

            if (base !== refBase) {
                mismatchQualitySum += ((igv.CoverageMap.qualityWeight && myself.qual) ? myself["qual" + base] : (myself["pos" + base] + myself["neg" + base]));
            }
        });

        return mismatchQualitySum >= threshold;

    };

    DownsampledInterval = function (start, end, counts) {
        this.start = start;
        this.end = end;
        this.counts = counts;
    }

    DownsampledInterval.prototype.popupData = function (genomicLocation) {
        return [
            {name: "start", value: this.start + 1},
            {name: "end", value: this.end},
            {name: "# downsampled:", value: this.counts}]
    }


    return igv;

})(igv || {});