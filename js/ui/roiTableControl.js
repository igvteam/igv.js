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

import {DOMUtils} from '../../node_modules/igv-utils/src/index.js'

class ROITableControl {

    constructor(parent, browser) {
        this.browser = browser
        this.button = DOMUtils.div({class: 'igv-navbar-button'})
        parent.appendChild(this.button)
        this.button.textContent = 'ROI Table'

        this.button.addEventListener('click', () => {
            this.buttonHandler(!browser.roiTableVisible)
        })

        this.browser = browser

        this.setVisibility(browser.config.showROITableButton)

        this.setState(browser.roiTableVisible)
    }

    buttonHandler(status) {
        this.browser.roiTableVisible = status
        this.setState(this.browser.roiTableVisible)
        this.browser.setROITableVisibility(this.browser.roiTableVisible)
    }

    setVisibility(doShowROITablelButton) {
        if (true === doShowROITablelButton) {
            this.show()
        } else {
            this.hide()
        }
    }

    setState(roiTableVisible) {
        if (true === roiTableVisible) {
            this.button.classList.add('igv-navbar-button-clicked')
        } else {
            this.button.classList.remove('igv-navbar-button-clicked')
        }
    }

    show() {
        this.button.style.display = 'block'
        this.setState(this.browser.roiTableVisible)
    }

    hide() {
        this.button.style.display = 'none'
    }
}


export default ROITableControl
