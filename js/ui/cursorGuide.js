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

const CursorGuide = function ($columnContainer, browser) {

    this.browser = browser;

    this.$horizontalGuide = $('<div class="igv-cursor-guide-horizontal">');
    $columnContainer.append(this.$horizontalGuide);

    this.$verticalGuide = $('<div class="igv-cursor-guide-vertical">');
    $columnContainer.append(this.$verticalGuide);

    this.setVisibility(browser.config.showCursorTrackingGuide)

    // Guide line is bound within track area, and offset by 5 pixels so as not to interfere mouse clicks.
    $columnContainer.on('mousemove.cursor-guide', event => {

        const { x, y } = DOMUtils.translateMouseCoordinates(event, $columnContainer.get(0));
        // console.log(`cursor guide - x(${ StringUtils.numberFormatter(x) }) y(${ StringUtils.numberFormatter(y) })`)

        const top = `${ y }px`;
        this.$horizontalGuide.css({ top });

        const $target = $(document.elementFromPoint(event.clientX, event.clientY));
        const $parent = $target.parent();

        let $viewport = undefined;

        if ($parent.hasClass('igv-viewport-content')) {
            $viewport = $parent.parent();
        } else if ($parent.hasClass('igv-viewport') && $target.hasClass('igv-viewport-content')) {
            $viewport = $parent;
        }

        if ($viewport && browser.getRulerTrackView()) {

            const left = `${ x }px`;
            this.$verticalGuide.css({ left });

            const $columns = $(browser.root).find('.igv-column')
            const index = $columns.index($viewport.parent())
            const rulerViewport = browser.getRulerTrackView().viewports[ index ]
            rulerViewport.mouseMove(event)

            // if (result) {
            //
            //     const { bp, start, end, interpolant } = result;
            //
            //     if (this.customMouseHandler) {
            //         this.customMouseHandler({ bp, start, end, interpolant });
            //     }
            //
            // }

        }

    });

}

CursorGuide.prototype.setVisibility = function (showCursorTrackingGuide) {
    if (true === showCursorTrackingGuide) {
        this.show()
    } else {
        this.hide()
    }
}

CursorGuide.prototype.show = function () {
    this.$verticalGuide.show()
    this.$horizontalGuide.show()

}

CursorGuide.prototype.hide = function () {

    this.$verticalGuide.hide()
    this.$horizontalGuide.hide()

    if (this.browser.getRulerTrackView()) {
        for (let viewport of this.browser.getRulerTrackView().viewports) {
            viewport.$tooltip.hide()
        }
    }

}

export default CursorGuide;
