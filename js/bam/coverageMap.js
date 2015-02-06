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
 * Created by turner on 3/21/14.
 */
var igv = (function (igv) {

    /**
     * @param genomicInterval - genomic interval
     * @param refSeq - reference sequence
     * @constructor
     */
    var allBases = ["A", "C", "T", "G", "N"];
    var threshold = 0.2;

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

        var sum = 0,
            myself = this;
        allBases.forEach(function (base) {
            var key = "qual" + base;
            if (base !== refBase) {
                sum += myself[key];
            }
        });
        return sum / this.qual > threshold;

    };

    Coverage.prototype.mismatchPercentages = function(refBase) {

        var fractions = [],
            myself = this;

        allBases.forEach(function (base) {
            var bTotal;
            if (base !== refBase) {
                bTotal = myself["pos" + base] + myself["neg" + base];
                fractions.push( { base: base, percent: bTotal/myself.total } );
            }
        });

        fractions.sort(function(a, b) {
            return a.percent - b.percent;
        });

        return fractions;
    };


    igv.CoverageMap = function (chr, start, end, alignments, refSeq) {

        var myself;

        this.prefixes = [ "pos", "neg", "qual" ];
        this.bases = [ "A", "T", "C", "G", "N" ];

        this.refSeq = refSeq;
        this.chr = chr;
        this.bpStart = start;
        this.length = (end - start);

        this.coverage = new Array(this.length);

        this.maximum = 0;
        myself = this;
        alignments.forEach(function (alignment, ai, as) {

            alignment.blocks.forEach(function (block, bi, bs) {

                var key,
                    base,
                    i,
                    j,
                    q;

                for (i = block.start - myself.bpStart, j = 0; j < block.len; i++, j++) {

                    if (!myself.coverage[ i ]) {
                        myself.coverage[ i ] = new Coverage();
                    }

                    base = block.seq.charAt(j);
                    key = (alignment.strand) ? "pos" + base : "neg" + base;
                    q = block.qual[j];

                    myself.coverage[ i ][ key ] += 1;
                    myself.coverage[ i ][ "qual" + base ] += q;

                    myself.coverage[ i ].total += 1;
                    myself.coverage[ i ].qual += q;

                    myself.maximum = Math.max(myself.coverage[ i ].total, myself.maximum);

                    if (61889529 === (j + block.start)) {
                        // NOTE: Add 1 when presenting genomic location
                        console.log("locus " + igv.numberFormatter(1 + 61889529) + " base " + base + " qual " + q);
                    }
                }

            });
        });

//        console.log("CoverageMap - chr " + this.chr + " start " + igv.numberFormatter(this.bpStart) + " length " + igv.numberFormatter(this.length));

    };


    return igv;

})(igv || {});
