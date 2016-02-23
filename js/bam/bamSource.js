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

var igv = (function (igv) {


    igv.BamSource = function (config) {

        this.config = config;
        this.alignmentContainer = undefined;

        if (config.sourceType === "ga4gh") {
            this.bamReader = new igv.Ga4ghAlignmentReader(config);
        }
        else {
            this.bamReader = new igv.BamReader(config);
        }

    };

    igv.BamSource.prototype.getAlignments = function (chr, bpStart, bpEnd) {

        var self = this;
        return new Promise(function (fulfill, reject) {

            if (self.alignmentContainer && self.alignmentContainer.contains(chr, bpStart, bpEnd)) {

                fulfill(self.alignmentContainer);

            } else {

                self.bamReader.readAlignments(chr, bpStart, bpEnd).then(function (alignmentContainer) {

                    alignmentContainer.finish();

                    self.alignmentContainer = alignmentContainer;

                    igv.browser.genome.sequence.getSequence(self.alignmentContainer.chr, self.alignmentContainer.start, self.alignmentContainer.end).then(

                        function (sequence) {

                            var maxRows = self.config.maxRows || 500;

                            if (sequence) {

                                self.alignmentContainer.coverageMap.refSeq = sequence;    // TODO -- fix this
                                self.alignmentContainer.sequence = sequence;           // TODO -- fix this

                                self.alignmentContainer.packedAlignmentRows = packAlignmentRows(self.alignmentContainer, maxRows);

                                self.alignmentContainer.alignments = undefined;  // Don't need to hold onto these anymore

                                fulfill(self.alignmentContainer);
                            }
                        }).catch(reject);

                }).catch(reject);
            }
        });
    }


    function packAlignmentRows(alignmentContainer, maxRows) {

        var alignments = alignmentContainer.alignments;

        alignments.sort(function (a, b) {
           return a.start - b.start;
        });

        if (alignments.length === 0) {

            return [];

        } else {

            var bucketList = [],
                allocatedCount = 0,
                lastAllocatedCount = 0,
                nextStart = alignmentContainer.start,
                alignmentRow,
                index,
                bucket,
                alignment,
                alignmentSpace = 4 * 2,
                packedAlignmentRows = [],
                bucketStart = alignments[0].start;

            alignments.forEach(function (alignment) {

                var buckListIndex = alignment.start - bucketStart;
                if (bucketList[buckListIndex] === undefined) {
                    bucketList[buckListIndex] = [];
                }
                bucketList[buckListIndex].push(alignment);
            });


            while (allocatedCount < alignments.length && packedAlignmentRows.length < maxRows) {

                alignmentRow = new igv.BamAlignmentRow();

                while (nextStart <= alignmentContainer.end) {

                    bucket = undefined;

                    while (!bucket && nextStart <= alignmentContainer.end) {

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

                    alignmentRow.alignments.push(alignment);
                    nextStart = alignment.start + alignment.lengthOnRef + alignmentSpace;
                    ++allocatedCount;

                } // while (nextStart)

                if (alignmentRow.alignments.length > 0) {
                    packedAlignmentRows.push(alignmentRow);
                }

                nextStart = bucketStart;

                if(allocatedCount === lastAllocatedCount) break;   // Protect from infinite loops

                lastAllocatedCount = allocatedCount;

            } // while (allocatedCount)

            return packedAlignmentRows;
        }
    }


    return igv;

})(igv || {});