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

import * as DOMUtils from "../ui/utils/dom-utils.js"

class ViewportCenterLine {

    constructor(browser, referenceFrame, column) {

        this.browser = browser
        this.referenceFrame = referenceFrame
        this.column = column

        this.container = DOMUtils.div({class: 'igv-center-line'})
        column.appendChild(this.container)

        if (browser.doShowCenterLine) {
            this.show()
        } else {
            this.hide()
        }
    }

    repaint() {

        if (this.referenceFrame) {

            const ppb = 1.0 / this.referenceFrame.bpPerPixel
            if (ppb > 1) {
                const width = Math.floor(this.referenceFrame.toPixels(1))
                this.container.style.width = `${width}px`
                this.container.classList.remove('igv-center-line-thin')
                this.container.classList.add('igv-center-line-wide')
            } else {
                this.container.style.width = '1px'
                this.container.classList.remove('igv-center-line-wide')
                this.container.classList.add('igv-center-line-thin')
            }
        }
    }

    show() {
        this.isVisible = true
        this.container.style.display = 'block'
        this.repaint()
    }

    hide() {
        this.isVisible = false
        this.container.style.display = 'none'
    }

    resize() {
        this.repaint()
    }
}

export default ViewportCenterLine
