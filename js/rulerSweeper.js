/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 The Regents of the University of California
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

import $ from "./vendor/jquery-3.3.1.slim.js";
import {validateLocusExtent} from "./util/igvUtils.js";
import {DOMUtils} from "../node_modules/igv-utils/src/index.js"

const RulerSweeper = function (viewport) {
    this.viewport = viewport;
    this.browser = viewport.browser;
    this.$rulerSweeper = $('<div class="igv-ruler-sweeper-div">');
    $(viewport.contentDiv).append(this.$rulerSweeper);
    this.namespace = '.sweeper_' + DOMUtils.guid();
    this.addMouseHandlers();
};

RulerSweeper.prototype.disableMouseHandlers = function () {

    $(document).off(this.namespace);
    this.viewport.$viewport.off(this.namespace);
};

RulerSweeper.prototype.addMouseHandlers = function () {

    const browser = this.browser;
    const self = this;

    var isMouseDown,
        isMouseIn,
        mouseDown,
        left,
        threshold,
        width,
        dx;

    this.disableMouseHandlers();

    isMouseDown = isMouseIn = mouseDown = undefined;

    threshold = 1;

    $(this.browser.$root).on('mousedown' + this.namespace, function (e) {

        isMouseIn = true;

        mouseDown = DOMUtils.translateMouseCoordinates(e, self.viewport.$viewport.get(0)).x;

        if (true === isMouseDown) {

            self.$rulerSweeper.show();

            width = threshold;
            left = mouseDown;
            self.$rulerSweeper.css({left: left + 'px'});
            self.$rulerSweeper.width(width);

        }

    });

    $(this.browser.$root).on('mousemove' + this.namespace, function (e) {
        var mouseCurrent;

        if (isMouseDown && isMouseIn) {

            mouseCurrent = DOMUtils.translateMouseCoordinates(e, self.viewport.$viewport.get(0)).x;
            mouseCurrent = Math.min(mouseCurrent, self.viewport.$viewport.width());
            mouseCurrent = Math.max(mouseCurrent, 0);

            dx = mouseCurrent - mouseDown;

            width = Math.abs(dx);
            self.$rulerSweeper.width(width);

            if (dx < 0) {
                left = mouseDown + dx;
                self.$rulerSweeper.css({left: left + 'px'});
            }

        }

    });

    $(this.browser.$root).on('mouseup' + this.namespace, function (e) {

        let extent;

        if (true === isMouseDown && true === isMouseIn) {

            isMouseDown = isMouseIn = undefined;

            self.$rulerSweeper.hide();

            extent = {};
            extent.start = bp.call(self, left);
            extent.end = bp.call(self, left + width);

            if (width > threshold) {

                validateLocusExtent(browser.genome.getChromosome(self.viewport.referenceFrame.chrName).bpLength, extent, browser.minimumBases());

                self.viewport.referenceFrame.bpPerPixel = (Math.round(extent.end) - Math.round(extent.start)) / self.viewport.$viewport.width();
                self.viewport.referenceFrame.start = Math.round(extent.start);
                self.viewport.referenceFrame.initialEnd = Math.round(extent.end);
                browser.updateViews(self.viewport.referenceFrame);
            }

        }

    });

    this.viewport.$viewport.on('mousedown' + this.namespace, function (e) {

        isMouseDown = true;
    });

};

RulerSweeper.prototype.dispose = function () {
    this.disableMouseHandlers();
};


function bp(pixel) {
    return this.viewport.referenceFrame.start + (pixel * this.viewport.referenceFrame.bpPerPixel);
}


export default RulerSweeper;
