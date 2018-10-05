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





        // zoom in
        this.$zoomInButton = $('<div>');
        browser.$zoomContainer.append(this.$zoomInButton);

        svg = igv.createIcon("plus-circle");
        this.$zoomInButton.append(svg);

        this.$zoomInButton.on('click', function () {
            browser.zoomIn();
        });





        // Range slider
        this.$rangeSliderContainer = $('<div>');
        browser.$zoomContainer.append(this.$rangeSliderContainer);

        this.$slider = $('<input type="range"/>');
        this.$rangeSliderContainer.append(this.$slider);

        this.$slider.on('change', function (e) {
            browser.zoomWithRangePercentage(e.target.value/100.0);
        });





        // zoom out
        this.$zoomOutButton = $('<div>');
        browser.$zoomContainer.append(this.$zoomOutButton);

        svg = igv.createIcon("minus-circle");
        this.$zoomOutButton.append(svg);

        this.$zoomOutButton.on('click', function () {
            browser.zoomOut();
        });




        this.currentChr = undefined;

        let self = this;
        browser.on('locuschange', function () {
            browser.updateZoomSlider(self.$slider);
        })
    };

    return igv;

})(igv || {});
