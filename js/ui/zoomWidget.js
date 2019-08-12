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
import {createIcon} from "../igv-icons";

const ZoomWidget = function (browser, $parent) {

    let $div;

    this.$zoomContainer = $('<div class="igv-zoom-widget">');
    $parent.append(this.$zoomContainer);

    // zoom out
    $div = $('<div>');
    this.$zoomContainer.append($div);

    $div.append(createIcon("minus-circle"));

    $div.on('click', function () {
        browser.zoomOut();
    });

    // Range slider
    $div = $('<div>');
    this.$zoomContainer.append($div);

    this.$slider = $('<input type="range"/>');
    $div.append(this.$slider);

    this.$slider.on('change', function (e) {
        browser.zoomWithRangePercentage(e.target.value / 100.0);
    });

    // zoom in
    $div = $('<div>');
    this.$zoomContainer.append($div);

    $div.append(createIcon("plus-circle"));

    $div.on('click', function () {
        browser.zoomIn();
    });

    this.currentChr = undefined;

    let self = this;
    browser.on('locuschange', function () {
        browser.updateZoomSlider(self.$slider);
    })
};

ZoomWidget.prototype.hide = function () {
    this.$zoomContainer.hide();
};

ZoomWidget.prototype.show = function () {
    this.$zoomContainer.show()
};

ZoomWidget.prototype.hideSlider = function () {
    this.$slider.hide();
};

ZoomWidget.prototype.showSlider = function () {
    this.$slider.show();
};

export default ZoomWidget;
