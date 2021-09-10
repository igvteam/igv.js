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

class SampleNameControl {

    constructor(parent, browser) {

        this.button = DOMUtils.div({ class: 'igv-navbar-button' })
        parent.appendChild(this.button)

        this.button.innerText = 'Sample Names'

        this.setState(browser.showSampleNames)

        this.setVisibility(browser.showSampleNameButton)

        this.button.addEventListener('click', () => {

            browser.showSampleNames = !browser.showSampleNames

            this.setState(browser.showSampleNames)

            for (let { sampleNameViewportController } of browser.trackViews) {
                if (false === browser.showSampleNames) {
                    sampleNameViewportController.hide()
                } else {
                    sampleNameViewportController.show()
                }
            }

            browser.resize()


        })

    }

    setVisibility(showSampleNameButton) {

        if (true === showSampleNameButton) {
            this.show()
        } else {
            this.hide()
        }
    }

    setState(showSampleNames) {
        if (true === showSampleNames) {
            this.button.classList.add('igv-navbar-button-clicked')
        } else {
            this.button.classList.remove('igv-navbar-button-clicked')
        }
    }

    hide() {
        this.button.style.display = 'none'
    }

    show() {
        this.button.style.display = 'block'
    }

}

export default SampleNameControl
