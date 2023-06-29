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

import $ from "./vendor/jquery-3.3.1.slim.js"
import GenomeUtils from "./genome/genome.js"

function navbarDidResize(browser, width) {

    const responsiveClasses = getResponsiveClasses(browser, width)

    browser.$toggle_button_container.removeClass()
    browser.$toggle_button_container.addClass(responsiveClasses.toggleButtonContainer)

    $(browser.zoomWidget.zoomContainer).removeClass()
    $(browser.zoomWidget.zoomContainer).addClass(responsiveClasses.zoomContainer)

}

function getResponsiveClasses(browser, navbarWidth) {

    const responsiveClasses = {}

    const isWGV = browser.isMultiLocusWholeGenomeView() ||
        (browser.referenceFrameList &&
            GenomeUtils.isWholeGenomeView(browser.referenceFrameList[0].chr))


    if (isWGV) {
        browser.windowSizePanel.hide()
    } else {
        browser.windowSizePanel.show()
    }

    if (navbarWidth > 990) {
        responsiveClasses.toggleButtonContainer = 'igv-navbar-toggle-button-container'
        responsiveClasses.zoomContainer = 'igv-zoom-widget'
    } else if (navbarWidth > 860) {
        responsiveClasses.toggleButtonContainer = 'igv-navbar-toggle-button-container'
        responsiveClasses.zoomContainer = 'igv-zoom-widget-900'
    } else if (navbarWidth > 540) {
        responsiveClasses.toggleButtonContainer = 'igv-navbar-toggle-button-container-hidden'
        responsiveClasses.zoomContainer = 'igv-zoom-widget-900'
    } else {
        responsiveClasses.toggleButtonContainer = 'igv-navbar-toggle-button-container-hidden'
        responsiveClasses.zoomContainer = 'igv-zoom-widget-900'
        browser.windowSizePanel.hide()
    }

    if (isWGV) {
        responsiveClasses.zoomContainer = 'igv-zoom-widget-hidden'
    }

    return responsiveClasses
}

export { navbarDidResize }
