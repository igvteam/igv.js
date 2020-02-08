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
import PairedAlignment from "./pairedAlignment.js";

    function canBePaired(alignment) {
        return alignment.isPaired() &&
            alignment.mate &&
            alignment.isMateMapped() &&
            alignment.chr === alignment.mate.chr &&
            (alignment.isFirstOfPair() || alignment.isSecondOfPair()) && !(alignment.isSecondary() || alignment.isSupplementary());
    }


const AlignmentContainer = function (chr, start, end, samplingWindowSize, samplingDepth, pairsSupported, alleleFreqThreshold) {

        this.chr = chr;
        this.start = Math.floor(start);
        this.end = Math.ceil(end);
        this.length = (end - start);
        
        this.alleleFreqThreshold = alleleFreqThreshold;

        this.coverageMap = new CoverageMap(chr, start, end, this.alleleFreqThreshold);
        this.alignments = [];
        this.downsampledIntervals = [];

        this.samplingWindowSize = samplingWindowSize === undefined ? 100 : samplingWindowSize;
        this.samplingDepth = samplingDepth === undefined ? 1000 : samplingDepth;

        this.pairsSupported = pairsSupported === undefined ? true : pairsSupported;
        this.paired = false;  // false until proven otherwise
        this.pairsCache = {};  // working cache of paired alignments by read name

        this.downsampledReads = new Set();

        this.currentBucket = new DownsampleBucket(this.start, this.start + this.samplingWindowSize, this);

        this.filter = function filter(alignment) {         // TODO -- pass this in
            return alignment.isMapped() && !alignment.isFailsVendorQualityCheck();
        }

        this.pairedEndStats = new PairedEndStats();

    }

AlignmentContainer.prototype.push = function (alignment) {

        if (this.filter(alignment) === false) return;

        if (alignment.isPaired()) {
            this.pairedEndStats.push(alignment);
        }

        this.coverageMap.incCounts(alignment);   // Count coverage before any downsampling

        if (this.pairsSupported && this.downsampledReads.has(alignment.readName)) {
            return;   // Mate already downsampled -- pairs are treated as a single alignment for downsampling
        }

        if (alignment.start >= this.currentBucket.end) {
            finishBucket.call(this);
            this.currentBucket = new DownsampleBucket(alignment.start, alignment.start + this.samplingWindowSize, this);
        }

        this.currentBucket.addAlignment(alignment);

    }

AlignmentContainer.prototype.forEach = function (callback) {
        this.alignments.forEach(callback);
    }

AlignmentContainer.prototype.finish = function () {

        if (this.currentBucket !== undefined) {
            finishBucket.call(this);
        }

        this.alignments.sort(function (a, b) {
            return a.start - b.start
        });

        this.pairsCache = undefined;
        this.downsampledReads = undefined;

        this.pairedEndStats.compute();
    }

AlignmentContainer.prototype.contains = function (chr, start, end) {
        return this.chr === chr &&
            this.start <= start &&
            this.end >= end;
    }

AlignmentContainer.prototype.hasDownsampledIntervals = function () {
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
        this.paired = this.paired || this.currentBucket.paired;
    }

    function DownsampleBucket(start, end, alignmentContainer) {

        this.start = start;
        this.end = end;
        this.alignments = [];
        this.downsampledCount = 0;
        this.samplingDepth = alignmentContainer.samplingDepth;
        this.pairsSupported = alignmentContainer.pairsSupported;
        this.downsampledReads = alignmentContainer.downsampledReads;
        this.pairsCache = alignmentContainer.pairsCache;
    }

    DownsampleBucket.prototype.addAlignment = function (alignment) {

        var idx, replacedAlignment, pairedAlignment;

        if (this.pairsSupported && canBePaired(alignment)) {
            pairedAlignment = this.pairsCache[alignment.readName];
            if (pairedAlignment) {
                // Not subject to downsampling, just update the existing alignment
                pairedAlignment.setSecondAlignment(alignment);
                this.pairsCache[alignment.readName] = undefined;   // Don't need to track this anymore. NOTE: Don't "delete", causes runtime performance issues
                return;
            }
        }

        if (this.alignments.length < this.samplingDepth) {

            if (this.pairsSupported && canBePaired(alignment)) {

                // First alignment in a pair
            pairedAlignment = new PairedAlignment(alignment);
                this.paired = true;
                this.pairsCache[alignment.readName] = pairedAlignment;
                this.alignments.push(pairedAlignment);

            }
            else {
                this.alignments.push(alignment);
            }

        } else {

            idx = Math.floor(Math.random() * (this.samplingDepth + this.downsampledCount - 1));

            if (idx < this.samplingDepth) {

                // Keep the new item
                //  idx = Math.floor(Math.random() * (this.alignments.length - 1));
                replacedAlignment = this.alignments[idx];   // To be replaced

                if (this.pairsSupported && canBePaired(alignment)) {

                    if (this.pairsCache[replacedAlignment.readName] !== undefined) {
                        this.pairsCache[replacedAlignment.readName] = undefined;
                    }

                pairedAlignment = new PairedAlignment(alignment);
                    this.paired = true;
                    this.pairsCache[alignment.readName] = pairedAlignment;
                    this.alignments[idx] = pairedAlignment;

                }
                else {
                    this.alignments[idx] = alignment;
                }
                this.downsampledReads.add(replacedAlignment.readName);

            }
            else {
                this.downsampledReads.add(alignment.readName);
            }

            this.downsampledCount++;
        }


    }


    // TODO -- refactor this to use an object, rather than an array,  if end-start is > some threshold
    function CoverageMap(chr, start, end, alleleFreqThreshold) {

        this.chr = chr;
        this.bpStart = start;
        this.length = (end - start);

        this.coverage = new Array(this.length);

        this.maximum = 0;

        this.threshold = alleleFreqThreshold;
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

        if(alignment.gaps) {
            for(let del of alignment.gaps) {
                if(del.type === 'D') {
                    const offset = del.start - self.bpStart;
                    for (let i = offset; i < offset + del.len; i++) {
                        if (i < 0) continue;
                        if (!this.coverage[i]) {
                            this.coverage[i] = new Coverage(self.threshold);
                        }
                        this.coverage[i].del++;
                    }
                }
            }
        }

        if(alignment.insertions) {
            for(let del of alignment.insertions) {
                const i = del.start - this.bpStart;
                    if(i < 0) continue;
                    if (!this.coverage[i]) {
                        this.coverage[i] = new Coverage(self.threshold);
                    }
                    this.coverage[i].ins++;
            }
        }

        function incBlockCount(block) {

            if('S' === block.type) return;

            const seq = alignment.seq;
            const qual = alignment.qual;
            const seqOffset = block.seqOffset;

            for (let i = block.start - self.bpStart, j = 0; j < block.len; i++, j++) {

                if (!self.coverage[i]) {
                    self.coverage[i] = new Coverage(self.threshold);
                }

                const base = seq.charAt(seqOffset + j);
                const key = (alignment.strand) ? "pos" + base : "neg" + base;
                const q = qual && seqOffset + j < qual.length ? qual[seqOffset + j] : 30;

                self.coverage[i][key] += 1;
                self.coverage[i]["qual" + base] += q;

                self.coverage[i].total += 1;
                self.coverage[i].qual += q;

                self.maximum = Math.max(self.coverage[i].total, self.maximum);

            }
        }
    }

    function Coverage(alleleThreshold) {
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
        this.del = 0;
        this.ins = 0;

        this.t = alleleThreshold;
    }

    const qualityWeight = true;


    Coverage.prototype.isMismatch = function (refBase) {

        var myself = this,
            mismatchQualitySum,
            threshold = this.t * ((qualityWeight && this.qual) ? this.qual : this.total);

        mismatchQualitySum = 0;
        ["A", "T", "C", "G"].forEach(function (base) {

            if (base !== refBase) {
                mismatchQualitySum += ((qualityWeight && myself.qual) ? myself["qual" + base] : (myself["pos" + base] + myself["neg" + base]));
            }
        });

        return mismatchQualitySum >= threshold;

    };

    function DownsampledInterval(start, end, counts) {
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

    function PairedEndStats(lowerPercentile, upperPercentile) {
        this.totalCount = 0;
        this.frCount = 0;
        this.rfCount = 0;
        this.ffCount = 0;
        this.sumF = 0;
        this.sumF2 = 0;
        //this.lp = lowerPercentile === undefined ? 0.005 : lowerPercentile;
        //this.up = upperPercentile === undefined ? 0.995 : upperPercentile;
        //this.digest = new Digest();
    }

    PairedEndStats.prototype.push = function (alignment) {

        if (alignment.isProperPair()) {

            var fragmentLength = Math.abs(alignment.fragmentLength);
            //this.digest.push(fragmentLength);
            this.sumF += fragmentLength;
            this.sumF2 += fragmentLength * fragmentLength;

            var po = alignment.pairOrientation;

            if (typeof po === "string" && po.length === 4) {
                var tmp = '' + po.charAt(0) + po.charAt(2);
                switch (tmp) {
                    case 'FF':
                    case 'RR':
                        this.ffCount++;
                        break;
                    case "FR":
                        this.frCount++;
                        break;
                    case"RF":
                        this.rfCount++;
                }
            }
            this.totalCount++;
        }
    }

    PairedEndStats.prototype.compute = function () {

        if (this.totalCount > 100) {
            if (this.ffCount / this.totalCount > 0.9) this.orienation = "ff";
            else if (this.frCount / this.totalCount > 0.9) this.orienation = "fr";
            else if (this.rfCount / this.totalCount > 0.9) this.orienation = "rf";


            var fMean = this.sumF / this.totalCount;
            var stdDev = Math.sqrt((this.totalCount * this.sumF2 - this.sumF * this.sumF) / (this.totalCount * this.totalCount));
            this.lowerFragmentLength = fMean - 3 * stdDev;
            this.upperFragmentLength = fMean + 3 * stdDev;

            //this.lowerFragmentLength = this.digest.percentile(this.lp);
            //this.upperFragmentLength = this.digest.percentile(this.up);
            //this.digest = undefined;
        }

    }

export default AlignmentContainer;
