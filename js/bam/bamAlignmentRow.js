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
 * Created by turner on 2/10/15.
 */
var igv = (function (igv) {

    igv.BamAlignmentRow = function () {

        this.alignments = [];
        this.score = undefined;
    };

    igv.BamAlignmentRow.prototype.findCenterAlignment = function (bpStart, bpEnd) {

        var centerAlignment = undefined;

        // find single alignment that overlaps sort location
        this.alignments.forEach(function (a) {

            if (undefined === centerAlignment) {

                if ((a.start + a.lengthOnRef) < bpStart || a.start > bpEnd) {
                    // do nothing
                } else {
                    centerAlignment = a;
                }

            }

        });

        return centerAlignment;
    };

    igv.BamAlignmentRow.prototype.updateScore = function (genomicLocation, genomicInterval, sortOption, sortDirection) {

        this.score = this.calculateScore(genomicLocation, (1 + genomicLocation), genomicInterval, sortOption, sortDirection);

    };

    igv.BamAlignmentRow.prototype.calculateScore = function (bpStart, bpEnd, interval, sortOption, sortDirection) {

        var baseScore,
            alignment,
            block;

        alignment = this.findCenterAlignment(bpStart, bpEnd);
        if (undefined === alignment) {
            return sortDirection ? Number.MAX_VALUE : -Number.MAX_VALUE;
        }

        if ("NUCLEOTIDE" === sortOption.sort) {

            // Could be a single, or paired alignment
            if (alignment.blocks) {
                if (alignment.blocks && alignment.blocks.length > 0) {
                    block = blockAtGenomicLocation(alignment.blocks, bpStart, interval.start);
                    if (block) {
                        baseScore = blockScoreWithObject(block, interval);
                    }
                }
            }
            else {
                if (alignment.firstAlignment && alignment.firstAlignment.blocks && alignment.firstAlignment.blocks.length > 0) {
                    block = blockAtGenomicLocation(alignment.firstAlignment.blocks, bpStart, interval.start);
                }
                else if (alignment.secondAlignment && alignment.secondAlignment.blocks && alignment.secondAlignment.blocks.length > 0) {
                    block = blockAtGenomicLocation(alignment.secondAlignment.blocks, bpStart, interval.start);
                }
                if (block) {
                    baseScore = blockScoreWithObject(block, interval);
                }
            }


            return (undefined === baseScore) ? Number.MAX_VALUE : baseScore;
        } else if ("STRAND" === sortOption.sort) {

            return alignment.strand ? 1 : -1;
        } else if ("START" === sortOption.sort) {

            return alignment.start;
        }

        return Number.MAX_VALUE;

        function blockAtGenomicLocation(blocks, genomicLocation, genomicIntervalStart) {

            var result = undefined;

            blocks.forEach(function (block) {

                for (var i = 0, genomicOffset = block.start - genomicIntervalStart, blockLocation = block.start, blockSequenceLength = block.seq.length;
                     i < blockSequenceLength;
                     i++, genomicOffset++, blockLocation++) {

                    if (genomicLocation === blockLocation) {
                        result = {
                            block: block,
                            blockSeqIndex: i,
                            referenceSequenceIndex: genomicOffset,
                            location: genomicLocation
                        };
                    }

                }

            });

            return result;
        }

        function blockScoreWithObject(obj, interval) {

            var reference,
                base,
                coverage,
                count,
                phred;

            if ("*" === obj.block.seq) {
                return 3;
            }

            reference = interval.sequence.charAt(obj.referenceSequenceIndex);
            base = obj.block.seq.charAt(obj.blockSeqIndex);

            if ("=" === base) {
                base = reference;
            }

            if ('N' === base) {
                return 2;
            } else if (reference === base) {
                return 3;
            } else if ("X" === base || reference !== base) {

                coverage = interval.coverageMap.coverage[(obj.location - interval.coverageMap.bpStart)];

                count = coverage["pos" + base] + coverage["neg" + base];
                phred = (coverage.qual) ? coverage.qual : 0;

                return -(count + (phred / 1000.0));
            }

            return undefined;
        }

        function nucleotideBlockScores(blocks) {

            var result = undefined;

            blocks.forEach(function (block) {

                var sequence = interval.sequence,
                    coverageMap = interval.coverageMap,
                    reference,
                    base,
                    coverage,
                    count,
                    phred;

                if ("*" === block.seq) {
                    result = 3;
                }

                for (var i = 0, indexReferenceSequence = block.start - interval.start, bpBlockSequence = block.start, lengthBlockSequence = block.seq.length;
                     i < lengthBlockSequence;
                     i++, indexReferenceSequence++, bpBlockSequence++) {

                    if (bpStart !== bpBlockSequence) {
                        continue;
                    }

                    reference = sequence.charAt(indexReferenceSequence);
                    base = block.seq.charAt(i);

                    if (base === "=") {
                        base = reference;
                    }

                    if (base === 'N') {
                        result = 2;
                    }
                    else if (base === reference) {
                        result = 3;
                    }
                    else if (base === "X" || base !== reference) {

                        coverage = coverageMap.coverage[(bpBlockSequence - coverageMap.bpStart)];
                        count = coverage["pos" + base] + coverage["neg" + base];
                        phred = (coverage.qual) ? coverage.qual : 0;
                        result = -(count + (phred / 1000.0));
                    } else {
                        console.log("BamAlignmentRow.caculateScore - huh?");
                    }

                } // for (i < lengthBlockSequence)

            });

            return result;
        }
    };

    return igv;

})(igv || {});
