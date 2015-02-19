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
        this.alignments.forEach(function(a){

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

    igv.BamAlignmentRow.prototype.updateScore = function (genomicLocation, genomicInterval, sortOption) {

        this.score = this.caculateScore(genomicLocation, (1 + genomicLocation), genomicInterval, sortOption);

    };

    igv.BamAlignmentRow.prototype.caculateScore = function (bpStart, bpEnd, genomicInterval, sortOption) {

        var baseScore,
            alignment;

        alignment = this.findCenterAlignment(bpStart, bpEnd);
        if (undefined === alignment) {
            return Number.MAX_VALUE;
        }

        if ("NUCLEOTIDE" === sortOption.sort) {

            baseScore = undefined;

            alignment.blocks.forEach(function (block) {

                var sequence = genomicInterval.sequence,
                    coverageMap = genomicInterval.coverageMap,
                    reference,
                    base,
                    coverage,
                    count,
                    phred;

                if ("*" !== block.seq) {

                    for (var i = 0, indexReferenceSequence = block.start - genomicInterval.start, bpBlockSequence = block.start, lengthBlockSequence = block.seq.length;
                         i < lengthBlockSequence;
                         i++, indexReferenceSequence++, bpBlockSequence++) {

                        if (bpStart === bpBlockSequence) {

                            reference = sequence.charAt(indexReferenceSequence);
                            base = block.seq.charAt(i);

                            if (base === "=") {
                                base = reference;
                            }

                            if (base === 'N') {
                                baseScore = 2;
                            }
                            else if (base === reference) {
                                baseScore = 3;
                            }
                            else if (base === "X" || base !== reference){

                                coverage = coverageMap.coverage[ (bpBlockSequence - coverageMap.bpStart) ];
                                count = coverage[ "pos" + base ] + coverage[ "neg" + base ];
                                phred = (coverage.qual) ? coverage.qual : 0;
                                baseScore = -(count + (phred / 1000.0));
                            } else {
                                console.log("BamAlignmentRow.caculateScore - huh?");
                            }

                        } // bpStart === bpBlockSequence

                    } // block.seq.length

                }
                else {
                    baseScore = 3;
                }

            });

            return (undefined === baseScore) ? Number.MAX_VALUE : baseScore;
        }
        else if ("STRAND" === sortOption.sort) {

            return alignment.strand ? 1 : -1;
        }
        else if ("START" === sortOption.sort) {

            return alignment.start;
        }

        return Number.MAX_VALUE;

    };

    return igv;

})(igv || {});
