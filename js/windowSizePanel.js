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

    igv.WindowSizePanel = function ($parent) {

        this.$content = $('<div class="igv-windowsizepanel-content-div">');
        $parent.append(this.$content);

    };

    igv.WindowSizePanel.prototype.show = function () {
        this.$content.show();
    };

    igv.WindowSizePanel.prototype.hide = function () {
        this.$content.hide();
    };

    igv.WindowSizePanel.prototype.updateWithGenomicState = function (genomicState) {

        var viewportWidth,
            referenceFrame,
            length;

        if (1 === genomicState.locusCount && 'all' !== genomicState.locusSearchString.toLowerCase()) {
            this.show();
        } else {
            this.hide();
        }

        viewportWidth = igv.Viewport.viewportWidthAtLocusIndex(genomicState.locusIndex);
        referenceFrame = genomicState.referenceFrame;

        length = viewportWidth * referenceFrame.bpPerPixel;

        this.$content.text( igv.prettyBasePairNumber(Math.round(length)) );
    };

    return igv;
})
(igv || {});