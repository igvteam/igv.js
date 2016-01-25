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


    igv.AlignmentContainer = function (chr, start, end, refSeq) {

        this.chr = chr;
        this.start = start;
        this.end = end;
        this.refSeq = refSeq;
        this.length = (end - start);

        this.coverageMap = new CoverageMap(chr, start, end, refSeq);
        this.alignments = [];

        this.downSample = true;
        this.currentSamplingWindowStart = 0;
        this.currentSamplingBucketEnd = 0;
        this.samplingWindowSize = 50;
        this.samplingDepth = 100;

    }

    igv.AlignmentCounter.prototype.addAlignment(alignment)
    {
        this.coverageMap.incCounts(alignment);

        if(this.currentBucket === undefined) {
            this.currentBucket = new DownampleBucket(alignment.start, alignment.start + this.samplingWindowSize, this.samplingDepth)
        }
        if(alignment.start > this.currentBucket.end) {

            this.currentBucket.alignments.sort(function (a, b) {
                return a.start - b.start
            });
            this.alignments = this.alignments.concat(this.currentBucket.alignments);

            this.currentBucket = new DownampleBucket(alignment.start, alignment.start + this.samplingWindowSize, this.samplingDepth)
        }
        else {
            // TODO check read names for kept pair

        }

    }

    function DownampleBucket(start, end, samplingDepth) {

        this.start = start;
        this.end = end;
        this.samplingDepth = samplingDepth;
        this.alignments = [];
        this.downsampledCount = 0.0;
    }

    DownampleBucket.prototype.addAlignment = function(alignment) {

        var samplingProb, idx;

        if(alignment.length < this.samplingDepth) {
            this.alignments.push(alignment);
        }
        else {
            samplingProb = this.samplingDepth / (this.samplingDepth + this.downsampledCount + 1);

            if(Math.random() < samplingProb) {
                idx = Math.floor(Math.random * this.alignments.length);
                this.alignments[idx] = alignment;
            }

            this.downsampledCount++;
        }

    }



    function CoverageMap (chr, start, end, refSeq) {

        this.refSeq = refSeq;
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

        alignment.blocks.forEach(function (block) {

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
        });
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

    function DownsampleInterval(chr, start, end) {
        this.count = 0;
    }


    return igv;

})(igv || {});