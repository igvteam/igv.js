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

import { DOMUtils } from '../../node_modules/igv-utils/src/index.js';

class ViewportCenterGuide {

    constructor(browser, referenceFrame, column) {

        this.browser = browser
        this.referenceFrame = referenceFrame
        this.column = column

        this.container = DOMUtils.div({ class: 'igv-center-guide' })
        column.appendChild(this.container)

        if (browser.isCenterGuideVisible) {
            this.show()
        } else {
            this.hide()
        }

    }

    repaint() {

        const { x } = this.column.getBoundingClientRect()
        const left = Math.floor(x + 0.5 * this.browser.calculateViewportWidth(this.browser.referenceFrameList.length))

        if (this.referenceFrame) {

            const ppb = 1.0 / this.referenceFrame.bpPerPixel

            if (ppb > 1) {
                this.container.style.left = `${ left }px`
                this.container.style.width = `${ Math.floor(this.referenceFrame.toPixels(1)) }px`
                this.container.classList.remove('igv-center-guide-thin')
                this.container.classList.add('igv-center-guide-wide')
            } else {
                this.container.style.left = `${ left }px`
                this.container.style.width = '1px'
                this.container.classList.remove('igv-center-guide-wide')
                this.container.classList.add('igv-center-guide-thin')
            }

        }
    }

    show () {
        this.container.style.display = 'block'
        this.repaint()
    }

    hide () {
        this.container.style.display = 'none'
    }

    resize() {
        this.repaint();
    }
}

export default ViewportCenterGuide;
