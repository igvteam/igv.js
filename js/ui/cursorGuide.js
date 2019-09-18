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

const CursorGuide = function ($cursorGuideParent, $controlParent, config, browser) {

    const self = this;

    this.browser = browser;

    this.$guide = $('<div class="igv-cursor-tracking-guide">');
    $cursorGuideParent.append(this.$guide);

    // Guide line is bound within track area, and offset by 5 pixels so as not to interfere mouse clicks.
    $cursorGuideParent.on('mousemove.cursor-guide', (e) => {

        e.preventDefault();

        const $canvas = $(document.elementFromPoint(e.clientX, e.clientY));
        const $viewportContent = $canvas.parent();

        if ($viewportContent.hasClass('igv-viewport-content-div')) {

            const {bp, start, end, interpolant} = mouseHandler(e, $viewportContent, this.$guide, $cursorGuideParent, browser);

            // console.log('x ' + interpolant.toFixed(3) + ' bp ' + numberFormatter(bp) + ' start ' + numberFormatter(start) + ' end ' + numberFormatter(end));

            if (this.customMouseHandler) {
                this.customMouseHandler({bp, start, end, interpolant});
            }
        }

    });

    if (true === config.showCursorTrackingGuideButton) {

        this.$button = $('<div class="igv-nav-bar-button">');
        $controlParent.append(this.$button);
        this.$button.text('cursor guide');

        this.$button.on('click', function () {
            if (true === browser.cursorGuideVisible) {
                self.doHide();
            } else {
                self.doShow();
            }
        });

    }

};

let mouseHandler = (event, $viewportContent, $guideLine, $guideParent, browser) => {

    // pixel location of guide line
    const guideParentMouseXY = getMouseXY($guideParent.get(0), event);
    const left = guideParentMouseXY.x + 'px';
    $guideLine.css({left: left});


    // base-pair location of guide line
    const viewportContentMouseXY = getMouseXY($viewportContent.get(0), event);

    const index = $viewportContent.data('genomicStateIndex');

    const referenceFrame = browser.genomicStateList[index].referenceFrame;

    const _startBP = referenceFrame.start;
    const _endBP = 1 + referenceFrame.start + (viewportContentMouseXY.width * referenceFrame.bpPerPixel);

    // bp = bp + (pixel * (bp / pixel))
    const bp = Math.round(_startBP + viewportContentMouseXY.x * referenceFrame.bpPerPixel);

    // TODO: Can we make use of this in the custom mouse handler (ie: Tracing3D)
    const $trackContainer = $viewportContent.closest('.igv-track-container-div');
    const trackContainerMouseXY = getMouseXY($trackContainer.get(0), event);


    return {
        $host: $trackContainer,
        host_css_left: left,
        bp,
        start: _startBP,
        end: _endBP,
        interpolant: viewportContentMouseXY.xNormalized
    };
};

CursorGuide.prototype.doHide = function () {
    if (this.$button) {
        this.$button.removeClass('igv-nav-bar-button-clicked');
    }
    this.browser.hideCursorGuide();
};

CursorGuide.prototype.doShow = function () {
    this.$button.addClass('igv-nav-bar-button-clicked');
    this.browser.showCursorGuide();
};

CursorGuide.prototype.setState = function (cursorGuideVisible) {

    if (this.$button) {

        if (true === cursorGuideVisible) {
            this.$button.addClass('igv-nav-bar-button-clicked');
        } else {
            this.$button.removeClass('igv-nav-bar-button-clicked');
        }

    }
};

CursorGuide.prototype.disable = function () {
    this.doHide();
    this.$guide.hide();
};

CursorGuide.prototype.enable = function () {
    if (this.$button) {
        this.$button.show();
    }
};

function getMouseXY(domElement, event) {

    // a DOMRect object with eight properties: left, top, right, bottom, x, y, width, height
    const dr = domElement.getBoundingClientRect();

    const xy =
        {
            x: event.clientX - dr.left,
            y: event.clientY - dr.top,
            xNormalized: (event.clientX - dr.left)/dr.width,
            yNormalized: (event.clientY - dr.top)/dr.height,
            width: dr.width,
            height: dr.height
        };

    return xy;
};

export default CursorGuide;