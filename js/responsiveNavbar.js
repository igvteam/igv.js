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

import GenomeUtils from "./genome/genomeUtils.js";
import NavbarButton from "./ui/navbarButton.js";

const navbarResponsiveClasses = {};

const responsiveThreshold = 8;
let textButtonContainerWidth = undefined;

function navbarDidResize(browser, width) {
    const currentClass = NavbarButton.currentNavbarButtonClass(browser);
    if ('igv-navbar-text-button' === currentClass) {
        const rightContainer = browser.navigationElement.querySelector('.igv-navbar-right-container');
        textButtonContainerWidth = rightContainer.getBoundingClientRect().width;
    }

    const responsiveClasses = getResponsiveClasses(browser, width);

    const zoomContainer = browser.zoomWidget.zoomContainer;
    zoomContainer.className = ''; // Remove all classes
    zoomContainer.classList.add(responsiveClasses.zoomContainer);

    browser.fireEvent('navbar-resize', [responsiveClasses.navbarButton]);
}

function getResponsiveClasses(browser, navbarWidth) {
    const isWGV =
        (browser.isMultiLocusWholeGenomeView()) ||
        (browser.referenceFrameList && GenomeUtils.isWholeGenomeView(browser.referenceFrameList[0].chr));

    if (isWGV) {
        browser.windowSizePanel.hide()
    } else {
        browser.windowSizePanel.show()
    }

    const leftContainer = browser.navigationElement.querySelector('.igv-navbar-left-container');
    const rightContainer = browser.navigationElement.querySelector('.igv-navbar-right-container');

    const { x: leftContainerX, width: leftContainerWidth } = leftContainer.getBoundingClientRect();
    const leftContainerExtent = leftContainerX + leftContainerWidth;
    const { x: rightContainerX } = rightContainer.getBoundingClientRect();

    const delta = rightContainerX - leftContainerExtent;
    const currentClass = NavbarButton.currentNavbarButtonClass(browser);

    if ('igv-navbar-text-button' === currentClass && delta < responsiveThreshold) {
        navbarResponsiveClasses.navbarButton = 'igv-navbar-icon-button';
    } else if (textButtonContainerWidth && 'igv-navbar-icon-button' === currentClass) {
        const length = navbarWidth - leftContainerExtent;
        if (length - textButtonContainerWidth > responsiveThreshold) {
            navbarResponsiveClasses.navbarButton = 'igv-navbar-text-button';
        }
    }

    if (isWGV) {
        navbarResponsiveClasses.zoomContainer = 'igv-zoom-widget-hidden';
    } else {
        navbarResponsiveClasses.zoomContainer = navbarWidth > 860 ? 'igv-zoom-widget' : 'igv-zoom-widget-900';
    }

    return navbarResponsiveClasses;
}

export { navbarDidResize, navbarResponsiveClasses };
