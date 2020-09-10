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

import $ from "../vendor/jquery-3.3.1.slim.js";

const TrackLabelControl = function ($parent, browser) {

    var self = this;

    this.browser = browser;

    this.$button = $('<div class="igv-navbar-button">');
    $parent.append(this.$button);
    this.$button.text('track labels');

    this.$button.on('click', function () {
        if (true === browser.trackLabelsVisible) {
            self.doHide();
        } else {
            self.doShow();
        }
    });
};

TrackLabelControl.prototype.doHide = function () {
    this.$button.removeClass('igv-navbar-button-clicked');
    this.browser.hideTrackLabels();
};

TrackLabelControl.prototype.doShow = function () {
    this.$button.addClass('igv-navbar-button-clicked');
    this.browser.showTrackLabels();
};

TrackLabelControl.prototype.setState = function (trackLabelsVisible) {
    if (true === trackLabelsVisible) {
        this.$button.addClass('igv-navbar-button-clicked');
    } else {
        this.$button.removeClass('igv-navbar-button-clicked');
    }
};

TrackLabelControl.prototype.disable = function () {
    this.doHide();
    this.$button.hide();
};

TrackLabelControl.prototype.enable = function () {
    this.$button.show();
};

export default TrackLabelControl;
