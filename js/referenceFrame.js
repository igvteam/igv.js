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

// Reference frame classes.  Converts domain coordinates (usually genomic) to pixel coordinates

var igv = (function (igv) {

    igv.ReferenceFrame = function (chrName, start, bpPerPixel) {
        this.chrName = chrName;
        this.start = start;
        this.bpPerPixel = bpPerPixel;
    };

    igv.ReferenceFrame.prototype.calculateEnd = function (pixels) {
        return this.start + this.bpPerPixel * pixels;
    };

    igv.ReferenceFrame.prototype.calculateBPP = function (end, pixels) {
        return (end - this.start) / pixels;
    };

    igv.ReferenceFrame.prototype.set = function (json) {
        this.chrName = json.chrName;
        this.start = json.start;
        this.bpPerPixel = json.bpPerPixel;
    };

    igv.ReferenceFrame.prototype.toPixels = function (bp) {
        // TODO -- do we really need ot round this?
        return bp / this.bpPerPixel;
    };

    igv.ReferenceFrame.prototype.toBP = function(pixels) {
        return this.bpPerPixel * pixels;
    };

    igv.ReferenceFrame.prototype.shiftBP = function (pixels) {
        this.start += pixels * this.bpPerPixel;
    };

    igv.ReferenceFrame.prototype.description = function() {
        return "ReferenceFrame " + this.chrName + " " + igv.numberFormatter(Math.floor(this.start)) + " bpp " + this.bpPerPixel;
    };


    return igv;

})(igv || {});