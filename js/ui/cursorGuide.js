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
import {DOMUtils} from "../../node_modules/igv-utils/src/index.js";

const CursorGuide = function ($cursorGuideParent, $controlParent, config, browser) {

    this.browser = browser;

    this.$guide = $('<div class="igv-cursor-tracking-guide">');
    $cursorGuideParent.append(this.$guide);

    // Guide line is bound within track area, and offset by 5 pixels so as not to interfere mouse clicks.
    $cursorGuideParent.on('mousemove.cursor-guide', (e) => {

        e.preventDefault();

        const $child = $(document.elementFromPoint(e.clientX, e.clientY));
        const $parent = $child.parent();

        let $viewport = undefined;

        if ($parent.hasClass('igv-viewport-content') && 'sample-name' !== $parent.parent().data('viewport-type')) {
            $viewport = $parent.parent()
            // console.log(`cursor guide - parent(viewport-content) child(canvas)`)
        }

        if ($viewport) {
            
            const result = mouseHandler(e, $viewport, this.$guide, $cursorGuideParent, browser);

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

        this.$button.on('click', () => true === browser.cursorGuideVisible ? this.doHide() : this.doShow());

    }

};

let mouseHandler = (event, $viewport, $guideLine, $guideParent, browser) => {

    // pixel location of guide line
    const parent = $guideParent.get(0)
    const { x: xParent } = DOMUtils.translateMouseCoordinates(event, parent);
    const left = `${ xParent }px`;
    $guideLine.css({ left });

    // base-pair location of guide line
    const { x, xNormalized, width } = DOMUtils.translateMouseCoordinates(event, $viewport.get(0));

    const guid = $viewport.data('viewportGUID');
    const viewport = browser.getViewportWithGUID(guid);

    if (undefined === viewport) {
        // console.log(`${ Date.now() } ERROR - cursor guide - no viewport found`);
        return undefined;
    }

    const { start, bpPerPixel } = viewport.referenceFrame;

    // TODO: Can we make use of this in the custom mouse handler (ie: Tracing3D)
    const $trackContainer = $viewport.closest('.igv-track-container');

    return {
        $host: $trackContainer,
        host_css_left: left,

        // units: bp = bp + (pixel * (bp / pixel))
        bp: Math.round(start + x * bpPerPixel),

        start,
        end: 1 + start + (width * bpPerPixel),
        interpolant: xNormalized
    };
};

CursorGuide.prototype.doHide = function () {
    if (this.$button) {
        this.$button.removeClass('igv-navbar-button-clicked');
    }
    this.browser.hideCursorGuide();
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
    this.$guide.hide();
};

CursorGuide.prototype.enable = function () {
    if (this.$button) {
        this.$button.show();
    }
};

export default CursorGuide;
