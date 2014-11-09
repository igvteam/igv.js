/*
 * The MIT License (MIT)
 *
 * Copyright (c) $year. Broad Institute
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

    /**
     }
     * A wrapper around a bam file that provides a simple cache
     *
     * @param bamPath
     * @param baiPath
     * @constructor
     */
    igv.BamSource = function (config) {

        if (config.sourceType === "ga4gh") {
            this.bamFile = new igv.Ga4ghReader(config.url, config.readsetId, config.authKey, config.proxy);
        }
        else {
            this.bamFile = new igv.BamReader(config.url);
        }

    };

    igv.BamSource.prototype.getFeatures = function (chr, bpStart, bpEnd, success, task) {

        if (this.genomicInterval && this.genomicInterval.contains(chr, bpStart, bpEnd)) {

            success(this.genomicInterval);

        } else {

            var expand = 1000,
                myself,
                qStart,
                qEnd;

            // Expand the query parameters to enable minor changes in window size without forcing a reload
            qStart = Math.max(0, bpStart - expand);
            qEnd = bpEnd + expand;

            myself = this;
            this.bamFile.readAlignments(chr, qStart, qEnd,
                function (alignments) {

                    if (alignments) {  // Can be null on error or aborting

                        myself.genomicInterval = new igv.GenomicInterval(chr, qStart, qEnd);

                        igv.sequenceSource.getSequence(myself.genomicInterval.chr, myself.genomicInterval.start, myself.genomicInterval.end,

                            function (refSeq) {

                                if (refSeq) {

                                    myself.genomicInterval.coverageMap = new igv.CoverageMap(chr, qStart, qEnd, alignments, refSeq);

                                    myself.genomicInterval.packedAlignments = packAlignments(myself.genomicInterval, alignments);

                                    // We don't need the features now, free up the memory
                                    myself.genomicInterval.features = undefined;

                                    success(myself.genomicInterval);
                                }

                            },
                            task);
                    }

                },
                task);
        }
    };


    function packAlignments(genomicInterval, features) {

        if (features.length === 0) {

            return [];

        } else {

            var bucketListLength = genomicInterval.end - genomicInterval.start,
                bucketList = new Array(bucketListLength),
                allocatedCount = 0,
                nextStart = genomicInterval.start,
                alignmentRow,
                index,
                bucket,
                alignment,
                alignmentSpace = 4 * 2,
                packedAlignments = [],
                bucketStart = features[0].start;

            features.forEach(function (alignment) {

                var buckListIndex = alignment.start - bucketStart;
                if (bucketList[buckListIndex] === undefined) {
                    bucketList[buckListIndex] = [];
                }
                bucketList[buckListIndex].push(alignment);
            });


            while (allocatedCount < features.length) {

                alignmentRow = [];
                while (nextStart <= genomicInterval.end) {

                    bucket = undefined;

                    while (!bucket && nextStart <= genomicInterval.end) {

                        index = nextStart - bucketStart;
                        if (bucketList[index] === undefined) {
                            ++nextStart;                     // No alignments at this index
                        } else {
                            bucket = bucketList[index];
                        }

                    } // while (bucket)

                    if (!bucket) {
                        break;
                    }
                    alignment = bucket.pop();
                    if (0 === bucket.length) {
                        bucketList[index] = undefined;
                    }

                    alignmentRow.push(alignment);
                    nextStart = alignment.start + alignment.lengthOnRef + alignmentSpace;
                    ++allocatedCount;

                } // while (nextStart)

                if (alignmentRow.length > 0) {
                    packedAlignments.push(alignmentRow);
                }

                nextStart = bucketStart;

            } // while (allocatedCount)

            return packedAlignments;
        }
    }


    return igv;

})(igv || {});