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

import $ from "../vendor/jquery-3.3.1.slim.js";

class CenterGuide {

    constructor($guideParent, $controlParent, config, browser) {

        const self = this;

        this.browser = browser;

        this.$container = $('<div class="igv-center-guide igv-center-guide-thin">');

        $guideParent.append(this.$container);

        if (true === config.showCenterGuideButton) {

            this.$centerGuideToggle = $('<div class="igv-navbar-button">');
            $controlParent.append(this.$centerGuideToggle);
            this.$centerGuideToggle.text('center line');

            this.$centerGuideToggle.on('click', function () {
                if (true === browser.isCenterGuideVisible) {
                    self.doHide();
                } else {
                    self.doShow();
                }
            });

        }
    }


    doHide() {
        if (this.$centerGuideToggle) {
            this.$centerGuideToggle.removeClass('igv-navbar-button-clicked');
        }
        this.browser.hideCenterGuide();
    };

    doShow() {

        if (this.$centerGuideToggle) {
            this.$centerGuideToggle.addClass('igv-navbar-button-clicked');
        }

        this.browser.showCenterGuide();
    };

    setState(isCenterGuideVisible) {

        if (this.$centerGuideToggle) {

            if (true === isCenterGuideVisible) {
                this.$centerGuideToggle.addClass('igv-navbar-button-clicked');
            } else {
                this.$centerGuideToggle.removeClass('igv-navbar-button-clicked');
            }

        }

    };

    forcedHide() {

        if (this.$centerGuideToggle) {
            this.$centerGuideToggle.hide();
        }

        if (true === this.browser.isCenterGuideVisible) {
            this.$container.hide();
        }

    };

    forcedShow() {

        if (this.$centerGuideToggle) {
            this.$centerGuideToggle.show();
        }

        if (true === this.browser.isCenterGuideVisible) {
            this.$container.show();
        }

    };

    repaint() {


        if (this.browser.referenceFrameList) {

            const referenceFrame = this.browser.referenceFrameList[0]
            const ppb = 1.0 / referenceFrame.bpPerPixel

            if (ppb > 1) {
                this.$container.css({ left:`${ this.browser.getCenterGuideXOffset() }px`, width:`${ Math.floor(referenceFrame.toPixels(1)) }px` });
                this.$container.removeClass('igv-center-guide-thin');
                this.$container.addClass('igv-center-guide-wide');
            } else {
                this.$container.css({ left:`${ this.browser.getCenterGuideXOffset() }px`, width:'1px' });
                this.$container.removeClass('igv-center-guide-wide');
                this.$container.addClass('igv-center-guide-thin');
            }

        }
    }

    resize() {
        this.repaint();
    }
}

export default CenterGuide;
