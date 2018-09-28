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

/**
 * Created by dat on 9/1/16.
 */
var igv = (function (igv) {

    "use strict";

    igv.ZoomWidget = function (browser, $parent) {

        let $div,
            svg;

        browser.$zoomContainer = $('<div class="igv-zoom-widget">');
        $parent.append(browser.$zoomContainer);

        // zoom out
        $div = $('<div>');
        browser.$zoomContainer.append($div);

        svg = igv.createIcon("minus-circle");
        $div.append(svg);

        $div.on('click', function () {
            browser.zoomOut();
        });

        // Range slider
        $div = $('<div>');
        browser.$zoomContainer.append($div);

        this.$slider = $('<input type="range"/>');
        $div.append(this.$slider);

        this.$slider.on('change', function (e) {
            browser.zoomWithRangePercentage(e.target.value/100.0);
        });

        // zoom in
        $div = $('<div>');
        browser.$zoomContainer.append($div);

        svg = igv.createIcon("plus-circle");
        $div.append(svg);

        $div.on('click', function () {
            browser.zoomIn();
        });


        this.currentChr = undefined;

        const self = this;
        browser.on('locuschange', function () {
            self.updateSlider(browser);
        })
    };

    // NO-OP for now
    igv.ZoomWidget.prototype.updateSlider = function (browser) {

        // const genomicStateList = browser.genomicStateList;
        //
        // if (!genomicStateList || genomicStateList.length > 1) {
        //     this.$slider.hide();
        // }
        // else {
        //     const viewportWidth = browser.viewportWidth();
        //     const genomicState = genomicStateList[0];
        //     const chr = genomicState.chromosome.name;
        //     const chrLength = genomicState.chromosome.bpLength;
        //
        //     const window = genomicState.referenceFrame.bpPerPixel * viewportWidth;
        //
        //     const slider = this.$slider[0];
        //
        //     if (!this.currentChr !== chr) {
        //         this.min = 40;
        //         this.max = chrLength;
        //         this.currentChr = chr;
        //         slider.max = chrLength.toString();
        //         slider.min = "40";
        //         slider.step = ((this.max - this.min) / 100).toString();
        //     }
        //
        //     slider.value = (this.max - window).toString();
        //
        //     this.$slider.show();
        // }
    };

    function zoom(browser, window) {

        const genomicStateList = browser.genomicStateList;

        if (!genomicStateList || genomicStateList.length > 1) {
            // Ignore, multi locus view
        }
        else {

            const viewportWidth = browser.viewportWidth();
            const genomicState = genomicStateList[0];
            const referenceFrame = genomicState.referenceFrame;

            // Shift start to maintain center
            const extent = referenceFrame.bpPerPixel * viewportWidth;
            const center = referenceFrame.start + extent / 2;

            const newBpPerPixel = window / viewportWidth;
            const newStart = Math.max(0, center - window / 2);

            referenceFrame.start = newStart;
            referenceFrame.bpPerPixel =newBpPerPixel;


            browser.updateViews(genomicState);
        }
    }


    return igv;

})(igv || {});
