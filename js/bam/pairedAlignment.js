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


    igv.PairedAlignment = function (firstAlignment) {

        this.paired = true;
        this.firstAlignment = firstAlignment;
        this.chr = firstAlignment.chr;
        this.readName = firstAlignment.readName;

        if (firstAlignment.start < firstAlignment.mate.position) {
            this.start = firstAlignment.start;
            this.scStart = firstAlignment.scStart;
            this.connectingStart = firstAlignment.start + firstAlignment.lengthOnRef;
            this.connectingEnd = firstAlignment.mate.position;
        }
        else {
            this.start = firstAlignment.mate.position;
            this.scStart = this.start;
            this.connectingStart = firstAlignment.mate.position;
            this.connectingEnd = firstAlignment.start;
        }

        this.end = Math.max(firstAlignment.mate.position, firstAlignment.start + firstAlignment.lengthOnRef);  // Approximate
        this.lengthOnRef = this.end - this.start;

        let scEnd = Math.max(this.end, firstAlignment.scStart + firstAlignment.scLengthOnRef);
        this.scLengthOnRef = scEnd - this.scStart;

    }

    igv.PairedAlignment.prototype.setSecondAlignment = function (secondAlignment) {

        // TODO -- check the chrs are equal,  error otherwise
        this.secondAlignment = secondAlignment;
        const firstAlignment = this.firstAlignment;

        if (secondAlignment.start > firstAlignment.start) {
            this.connectingEnd = secondAlignment.start;
        }
        else {
            this.connectingStart = secondAlignment.start + secondAlignment.lengthOnRef;
        }

        this.start = Math.min(firstAlignment.start, secondAlignment.start);
        this.end = Math.max(firstAlignment.start + firstAlignment.lengthOnRef, secondAlignment.start + secondAlignment.lengthOnRef)
        this.lengthOnRef = this.end - this.start;

        this.scStart = Math.min(firstAlignment.scStart, secondAlignment.scStart);
        const scEnd = Math.max(firstAlignment.scStart + firstAlignment.scLengthOnRef, secondAlignment.scStart + secondAlignment.scLengthOnRef);
        this.scLengthOnRef = scEnd - this.scStart;

    }

    igv.PairedAlignment.prototype.popupData = function (genomicLocation) {

        var nameValues = [];

        nameValues = nameValues.concat(this.firstAlignment.popupData(genomicLocation));

        if (this.secondAlignment) {
            nameValues.push("-------------------------------");
            nameValues = nameValues.concat(this.secondAlignment.popupData(genomicLocation));
        }
        return nameValues;
    }

    igv.PairedAlignment.prototype.isPaired = function () {
        return true; // By definition
    }

    igv.PairedAlignment.prototype.firstOfPairStrand = function () {

        if (this.firstAlignment.isFirstOfPair()) {
            return this.firstAlignment.strand;
        }
        else if (this.secondAlignment && this.secondAlignment.isFirstOfPair()) {
            return this.secondAlignment.strand;
        }
        else {
            return this.firstAlignment.mate.strand;    // Assumption is mate is first-of-pair
        }
    }


    return igv;

})(igv || {});
