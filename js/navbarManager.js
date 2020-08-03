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

const NavbarManager = function (browser) {
    this.browser = browser;
};

NavbarManager.prototype.navbarDidResize = function (width, isWholeGenomeView) {
    updateNavbar.call(this, createResponsiveClassSchedule.call(this, width, isWholeGenomeView));
};

function updateNavbar(responsiveClassSchedule) {

    this.browser['$toggle_button_container'].removeClass();
    this.browser['$toggle_button_container'].addClass(responsiveClassSchedule['$toggle_button_container']);

    this.browser.zoomWidget['$zoomContainer'].removeClass();
    this.browser.zoomWidget['$zoomContainer'].addClass(responsiveClassSchedule['$zoomContainer']);
}

function createResponsiveClassSchedule(navbarWidth, isWholeGenomeView) {

    let candidates = {};

    if (isWholeGenomeView) {
        this.browser.windowSizePanel.hide();
    } else {
        this.browser.windowSizePanel.updateWithGenomicStateList(this.browser.genomicStateList);
    }

    if (navbarWidth > 990) {
        candidates['$toggle_button_container'] = 'igv-nav-bar-toggle-button-container';
        candidates['$zoomContainer'] = 'igv-zoom-widget';
    } else if (navbarWidth > 860) {
        candidates['$toggle_button_container'] = 'igv-nav-bar-toggle-button-container';
        candidates['$zoomContainer'] = 'igv-zoom-widget-900';
    } else if (navbarWidth > 540) {
        candidates['$toggle_button_container'] = 'igv-nav-bar-toggle-button-container-750';
        candidates['$zoomContainer'] = 'igv-zoom-widget-900';
    } else {
        candidates['$toggle_button_container'] = 'igv-nav-bar-toggle-button-container-750';
        candidates['$zoomContainer'] = 'igv-zoom-widget-900';
        this.browser.windowSizePanel.hide();
    }

    if (isWholeGenomeView) {
        candidates['$zoomContainer'] = 'igv-zoom-widget-hidden';
    }

    return candidates;
}

export default NavbarManager;
