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

    igv.BamAlignmentRow.prototype.updateScore = function (bpStart, bpEnd, genomicInterval) {

        var sequence = genomicInterval.sequence,
            coverageMap = genomicInterval.coverageMap,
            insertionScore = undefined,
            baseScore = undefined,
            myself = this;

        this.alignments.forEach(function(alignment){

            if ((alignment.start + alignment.lengthOnRef) < bpStart || alignment.start > bpEnd) {

            } else {

                alignment.blocks.forEach(function (block) {

                    /*
                     block definition - { start, len, seq, qual }
                     */

                    var reference,
                        base,
                        coverage,
                        count,
                        phred;

                    if ("*" !== block.seq) {

                        for (var i = 0, indexReferenceSequence = block.start - genomicInterval.start, bpBlockSequence = block.start, lengthBlockSequence = block.seq.length; i < lengthBlockSequence; i++, indexReferenceSequence++, bpBlockSequence++) {

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
                                    console.log("BamAlignmentRow.updateScore - huh?");
                                }

                            }

                        } // block.seq.length

                    }
                    // block.seq === "*" indicating reference matches base
                    else {
                        console.log("BamAlignmentRow.prototype.updateScore - block.seq " + block.seq);
                        baseScore = 3;
                    }

                }); // alignment.blocks
            }

        });

        this.score = (undefined === baseScore) ? Number.MAX_VALUE : baseScore;
    };

    return igv;

})(igv || {});
