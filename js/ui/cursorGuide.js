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
import {DOMUtils, StringUtils} from "../../node_modules/igv-utils/src/index.js";

const CursorGuide = function ($cursorGuideParent, $controlParent, config, browser) {

    const self = this;

    this.browser = browser;

    this.$horizontalGuide = $('<div class="igv-cursor-guide-horizontal">');
    $cursorGuideParent.append(this.$horizontalGuide);

    this.$verticalGuide = $('<div class="igv-cursor-guide-vertical">');
    $cursorGuideParent.append(this.$verticalGuide);

    // Guide line is bound within track area, and offset by 5 pixels so as not to interfere mouse clicks.
    $cursorGuideParent.on('mousemove.cursor-guide', (e) => {

        e.preventDefault();

        const $target = $(document.elementFromPoint(e.clientX, e.clientY));
        const $parent = $target.parent();

        let $viewport = undefined;

        if ($parent.hasClass('igv-viewport-content')) {
            $viewport = $parent.parent();
        } else if ($parent.hasClass('igv-viewport') && $target.hasClass('igv-viewport-content')) {
            $viewport = $parent;
        } else if ($parent.hasClass('igv-viewport-container') && $target.hasClass('igv-viewport')) {
            $viewport = $target;
        }

        if ($viewport) {

            const result = mouseHandler(e, $viewport, this.$horizontalGuide, this.$verticalGuide, $cursorGuideParent, browser)

            if (result) {

                const { bp, start, end, interpolant } = result;

                if (this.customMouseHandler) {
                    this.customMouseHandler({ bp, start, end, interpolant });
                }

            }

        }

    });

    if (true === config.showCursorTrackingGuideButton) {

        this.$button = $('<div class="igv-navbar-button">');
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

function mouseHandler(event, $viewport, $horizontalGuide, $verticalGuide, $cursorGuideParent, browser) {

    const { x:xParent, y:yParent } = DOMUtils.translateMouseCoordinates(event, $cursorGuideParent.get(0));

    const top = `${ yParent }px`;
    $horizontalGuide.css({ top });

    const left = `${ xParent }px`;
    $verticalGuide.css({ left });

    const { x, xNormalized, width } = DOMUtils.translateMouseCoordinates(event, $viewport.get(0))

    const viewport = browser.getViewportWithGUID( $viewport.data('viewportGUID') );

    if (undefined === viewport) {
        console.log('ERROR: No viewport found');
        return undefined;
    }

    const { start, bpPerPixel } = viewport.referenceFrame
    const end = 1 + start + (width * bpPerPixel)

    const bp = Math.round(start + x * bpPerPixel)

    if (browser.rulerTrack) {
        const index = browser.referenceFrameList.indexOf(viewport.referenceFrame)
        const rulerViewport = browser.rulerTrack.trackView.viewports[ index ]
        rulerViewport.mouseMove(event)
    }

    const $host = $viewport.closest('.igv-track-container')
    return { bp, start, end, interpolant:xNormalized, host_css_left:left, $host }
}

CursorGuide.prototype.doHide = function () {
    if (this.$button) {
        this.$button.removeClass('igv-navbar-button-clicked');
    }

    this.browser.hideCursorGuide();

    if (this.browser.rulerTrack) {
        for (let viewport of this.browser.rulerTrack.trackView.viewports) {
            viewport.$tooltip.hide()
        }
    }

};

CursorGuide.prototype.doShow = function () {
    this.$button.addClass('igv-navbar-button-clicked');
    this.browser.showCursorGuide();
};

CursorGuide.prototype.setState = function (cursorGuideVisible) {

    if (this.$button) {

        if (true === cursorGuideVisible) {
            this.$button.addClass('igv-navbar-button-clicked');
        } else {
            this.$button.removeClass('igv-navbar-button-clicked');
        }

    }
};

CursorGuide.prototype.disable = function () {
    this.doHide();
    this.$verticalGuide.hide();
    this.$horizontalGuide.hide();
};

CursorGuide.prototype.enable = function () {
    if (this.$button) {
        this.$button.show();
    }
};

export default CursorGuide;
