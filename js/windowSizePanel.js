/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
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

import { DOMUtils } from '../node_modules/igv-utils/src/index.js'
import { prettyBasePairNumber } from './util/igvUtils.js'

class WindowSizePanel {
    constructor(parent, browser) {

        this.container = DOMUtils.div({ class: 'igv-windowsize-panel-container' });
        parent.appendChild(this.container)

        browser.on('locuschange', (referenceFrameList) => {
            this.updatePanel(referenceFrameList)
        })

        this.browser = browser;

    }

    show() {
        this.container.style.display = 'block'
    }

    hide() {
        this.container.style.display = 'none'
    }

    updatePanel(referenceFrameList) {
        const width = this.browser.calculateViewportWidth(this.browser.referenceFrameList.length)
        this.container.innerText = 1 === referenceFrameList.length ? prettyBasePairNumber(Math.round(width * referenceFrameList[ 0 ].bpPerPixel)) : ''
    }
}

export default WindowSizePanel;
