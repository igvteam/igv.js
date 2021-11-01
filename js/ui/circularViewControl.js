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

import { DOMUtils } from '../../node_modules/igv-utils/src/index.js'

const CircularViewControl = function (parent, browser) {

    this.button = DOMUtils.div({ class: 'igv-navbar-button'})
    parent.appendChild(this.button)
    this.button.textContent = 'circular view'

    this.button.addEventListener('click', () => {
        browser.circularViewVisible = !browser.circularViewVisible
        this.setState(browser.circularViewVisible)
    })

    this.browser = browser

    this.setVisibility(browser.config.showCircularViewButton)

    this.setState(browser.circularViewVisible)

}

CircularViewControl.prototype.setVisibility = function (showCircularViewButton) {
    if (true === showCircularViewButton) {
        this.show()
    } else {
        this.hide()
    }
}

CircularViewControl.prototype.setState = function (circularViewVisible) {
    if (true === circularViewVisible) {
        this.button.classList.add('igv-navbar-button-clicked')
    } else {
        this.button.classList.remove('igv-navbar-button-clicked')
    }
}

CircularViewControl.prototype.show = function () {
    this.button.style.display = 'block'
    this.setState(this.browser.circularViewVisible)
}

CircularViewControl.prototype.hide = function () {
    this.button.style.display = 'none'
}

export default CircularViewControl;
