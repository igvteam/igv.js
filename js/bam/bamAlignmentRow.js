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

const BamAlignmentRow = function () {

    this.alignments = [];
    this.score = undefined;
};

BamAlignmentRow.prototype.findAlignment = function (genomicLocation) {

    var centerAlignment, a, i;

    // find single alignment that overlaps sort location

    for (i = 0; i < this.alignments.length; i++) {
        a = this.alignments[i];
        if (alignmentContains(a, genomicLocation)) {
            if (a.paired) {
                if (a.firstAlignment && alignmentContains(a.firstAlignment, genomicLocation)) {
                    centerAlignment = a.firstAlignment;
                } else if (a.secondAlignment && alignmentContains(a.secondAlignment, genomicLocation)) {
                    centerAlignment = a.secondAlignment;
                }
            } else {
                centerAlignment = a;
            }
            break;
        }
    }

    return centerAlignment;

    function alignmentContains(a, genomicLocation) {
        return genomicLocation >= a.start && genomicLocation < a.start + a.lengthOnRef;
    }
}

BamAlignmentRow.prototype.updateScore = function (genomicLocation, genomicInterval, sortOption, sortDirection) {

    this.score = this.calculateScore(Math.floor(genomicLocation), genomicInterval, sortOption, sortDirection);

};

BamAlignmentRow.prototype.calculateScore = function (genomicLocation, interval, sortOption, sortDirection) {

    const alignment = this.findAlignment(genomicLocation);

    if (undefined === alignment) {
        return sortDirection ? Number.MAX_VALUE : -Number.MAX_VALUE;
    }

    if ("NUCLEOTIDE" === sortOption) {

        const readBase = alignment.readBaseAt(genomicLocation);
        const quality = alignment.readBaseQualityAt(genomicLocation);

        if (!readBase) {
            return sortDirection ? Number.MAX_VALUE : -Number.MAX_VALUE;
        } else {
            return calculateBaseScore(readBase, quality, interval, genomicLocation);
        }

    } else if ("STRAND" === sortOption) {

        return alignment.strand ? 1 : -1;

    } else if ("START" === sortOption) {

        return alignment.start;
    }

    return Number.MAX_VALUE;


    function calculateBaseScore(base, quality, interval, genomicLocation) {
        var idx,
            reference,
            coverage,
            count,
            phred;


        idx = Math.floor(genomicLocation) - interval.start;
        if (idx < interval.sequence.length) {
            reference = interval.sequence.charAt(idx);
        }
        if (!reference) {
            return undefined;
        }

        if (undefined === base) {
            return Number.MAX_VALUE;
        }
        if ('N' === base) {
            return 2;

        } else if (reference === base || '=' === base) {
            return 4 - quality / 1000;

        } else if ("X" === base || reference !== base) {

            idx = Math.floor(genomicLocation) - interval.coverageMap.bpStart;

            if (idx > 0 && idx < interval.coverageMap.coverage.length) {

                coverage = interval.coverageMap.coverage[idx];
                count = coverage["pos" + base] + coverage["neg" + base];

                return -(count + (quality / 1000));
            } else {
                return -(1 + quality / 1000);
            }
        }

        return 0;
    }

};

export default BamAlignmentRow;
