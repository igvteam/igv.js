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

import { DOMUtils, Icon } from "../../node_modules/igv-utils/src/index.js"

const ZoomWidget = function (browser, parent) {

    this.browser = browser

    this.zoomContainer = DOMUtils.div({ class: 'igv-zoom-widget' })
    parent.appendChild(this.zoomContainer)

    // zoom out
    let el = DOMUtils.div()
    this.zoomContainer.appendChild(el)
    el.appendChild(Icon.createIcon('minus-circle'))
    el.addEventListener('click', () => {
        browser.zoomWithScaleFactor(2.0)
    })

    // Range slider
    el = DOMUtils.div()
    this.zoomContainer.appendChild(el)
    this.slider = document.createElement('input')
    this.slider.type = 'range'
    this.slider.min = 0
    this.slider.max = 100
    el.appendChild(this.slider)
    this.slider.addEventListener('change', e => {
        const value = e.target.valueAsNumber
        browser.zoomWithRangePercentage(value / 100.0)
    })

    // zoom in
    el = DOMUtils.div()
    this.zoomContainer.appendChild(el)
    el.appendChild(Icon.createIcon('plus-circle'))
    el.addEventListener('click', () => {
        browser.zoomWithScaleFactor(0.5)
    })

    this.currentChr = undefined;
    browser.on('locuschange', () => {
        console.log(`Zoom Widget - locus change`)
        this.update(this.browser.referenceFrameList[ 0 ])
    })

};

ZoomWidget.prototype.update = function (referenceFrame) {

    const viewportWidth = this.browser.calculateViewportWidth(this.browser.referenceFrameList.length)
    const { bpLength } = referenceFrame.getChromosome()

    const percent = (bpLength - referenceFrame.toBP(viewportWidth)) / (bpLength - this.browser.minimumBases())

    this.slider.value = `${Math.round(100 * percent)}`

}

ZoomWidget.prototype.enable = function () {
    // enable
    this.slider.disabled = false;
};

ZoomWidget.prototype.disable = function () {
    // disable
    this.slider.disabled = true;
};

ZoomWidget.prototype.hide = function () {
    this.zoomContainer.style.display = 'none'
};

ZoomWidget.prototype.show = function () {
    this.zoomContainer.style.display = 'block'
};

ZoomWidget.prototype.hideSlider = function () {
    this.slider.style.display = 'none'
};

ZoomWidget.prototype.showSlider = function () {
    this.slider.style.display = 'block'
};

export default ZoomWidget;
