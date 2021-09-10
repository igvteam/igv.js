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

import {DOMUtils} from "../../node_modules/igv-utils/src/index.js";

const CursorGuide = function (columnContainer, browser) {

    this.browser = browser

    this.horizontalGuide = DOMUtils.div({ class: 'igv-cursor-guide-horizontal' })
    columnContainer.appendChild(this.horizontalGuide)

    this.verticalGuide = DOMUtils.div({ class: 'igv-cursor-guide-vertical' })
    columnContainer.appendChild(this.verticalGuide)

    this.setVisibility(browser.config.showCursorTrackingGuide)

    // Guide line is bound within track area, and offset by 5 pixels so as not to interfere mouse clicks.
    columnContainer.addEventListener('mousemove', event => {

        const { x, y } = DOMUtils.translateMouseCoordinates(event, columnContainer)
        this.horizontalGuide.style.top = `${ y }px`

        const target = document.elementFromPoint(event.clientX, event.clientY)
        const parent = target.parentElement

        let viewport = undefined;

        if (parent.classList.contains('igv-viewport-content')) {
            viewport = parent.parentElement
        } else if (parent.classList.contains('igv-viewport') && target.classList.contains('igv-viewport-content')) {
            viewport = parent
        }

        if (viewport && browser.getRulerTrackView()) {

            this.verticalGuide.style.left = `${ x }px`

            const columns = browser.root.querySelectorAll('.igv-column')
            let index = undefined
            const viewportParent = viewport.parentElement
            for (let i = 0; i < columns.length; i++) {
                if (undefined === index && viewportParent === columns[i]) {
                    index = i
                }
            }

            const rulerViewport = browser.getRulerTrackView().viewportControllers[ index ]
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
    this.verticalGuide.style.display = 'block'
    this.horizontalGuide.style.display = 'block'

}

CursorGuide.prototype.hide = function () {

    this.verticalGuide.style.display = 'none'
    this.horizontalGuide.style.display = 'none'

    if (this.browser.getRulerTrackView()) {
        for (let viewportController of this.browser.getRulerTrackView().viewportControllers) {
            viewportController.$tooltip.hide()
        }
    }

}

export default CursorGuide;
