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

/**
 * Created by dat on 3/26/18.
 */
var igv = (function (igv) {

    "use strict";

    igv.CursorGuide = function ($cursorGuideParent, $controlParent, config, browser) {

        const self = this;

        this.browser = browser;

        this.$guide = $('<div class="igv-cursor-tracking-guide">');
        $cursorGuideParent.append(this.$guide);

        // Guide line is bound within track area, and offset by 5 pixels so as not to interfere mouse clicks.
        $cursorGuideParent.on('mousemove.cursor-guide', (e) => {

            e.preventDefault();

            const $canvas = $(document.elementFromPoint(e.clientX, e.clientY));
            if (false === $canvas.is('canvas')) {
                return;
            }

            const $viewport_content = $canvas.parent();
            const viewport_content_mouse_xy = igv.getMouseXY($viewport_content.get(0), e);

            // base-pair
            const index = $viewport_content.data('genomicStateIndex');

            const referenceFrame = igv.browser.genomicStateList[ index ].referenceFrame;
            const aBP = referenceFrame.start;
            const bBP = 1 + referenceFrame.start + (viewport_content_mouse_xy.width * referenceFrame.bpPerPixel);

            let str = Date.now();

            // pixel
            str = str + ' x ' + igv.numberFormatter(viewport_content_mouse_xy.x) + ' width ' + igv.numberFormatter(viewport_content_mouse_xy.width);

            // bp = bp + (pixel * (bp / pixel))
            const bp = Math.round(aBP + viewport_content_mouse_xy.x * referenceFrame.bpPerPixel);
            str = str + ' bp ' + igv.numberFormatter(bp);

            // bp
            str = str + ' start ' + igv.numberFormatter(aBP) + ' end ' + igv.numberFormatter(bBP);
            // console.log(str);




            // pixel
            const $viewport = $viewport_content.parent();
            const $viewport_container = $viewport.parent();
            const viewport_container_mouse_xy = igv.getMouseXY($viewport_container.get(0), e);
            const cursorGuideParentRect = $cursorGuideParent.get(0).getBoundingClientRect();


            str = Date.now();
            str = str + ' x ' + igv.numberFormatter(viewport_container_mouse_xy.x) + ' width ' + igv.numberFormatter(viewport_container_mouse_xy.width);
            console.log(str);

            const dx = viewport_container_mouse_xy.x - cursorGuideParentRect.x;
            const x_css = viewport_container_mouse_xy.x + dx;

            const left = Math.round(x_css) + 'px';
            this.$guide.css({ left: left });

            // TODO: (dat) This assumes a single panel. Ensure support for multi-locus.
            /*
            if (igv.browser.trackViews && igv.browser.trackViews.length > 0) {

                const viewportContainer = igv.browser.trackViews[0].$viewportContainer.get(0);

                const viewportContainerRect = viewportContainer.getBoundingClientRect();

                const cursorGuideParentRect = $cursorGuideParent.get(0).getBoundingClientRect();

                const mouseXY = igv.getMouseXY(viewportContainer, e);

                if (mouseXY.x < 0 || mouseXY.x > viewportContainerRect.width) {
                    return;
                }

                // pixel
                const dx = viewportContainerRect.x - cursorGuideParentRect.x;
                const x_css = mouseXY.x + dx;
                const str = Math.round(x_css) + 'px';
                this.$guide.css({ left: str });

                // base-pair
                const aBP = igv.browser.genomicStateList[ 0 ].referenceFrame.start;
                const bBP = igv.browser.genomicStateList[ 0 ].referenceFrame.initialEnd;
                const bp = igv.Math.lerp(aBP, bBP, mouseXY.xNormalized);

                console.log(Date.now() + ' x normalized ' + mouseXY.xNormalized.toFixed(3) + ' bp ' + igv.numberFormatter(Math.round(bp)));

            }
            */

        });

        if (true === config.showCursorTrackingGuideButton) {

            this.$button = $('<div class="igv-nav-bar-button">');
            $controlParent.append(this.$button);
            this.$button.text('cursor guide');

            this.$button.on('click', function () {
                if (true === browser.cursorGuideVisible) {
                    self.doHide();
                } else {
                    self.doShow();
                }
            });

        }

    };

    let mouseMoveHandler = (event, cursorGuide, $cursorGuideParent) => {
        var exe;

        // TODO: This is sooooo fragile !!!
        exe = Math.max(50, igv.translateMouseCoordinates(event, $cursorGuideParent.get(0)).x);
        exe = Math.min($cursorGuideParent.innerWidth() - 65, exe);

        cursorGuide.$guide.css({ left: exe + 'px' });

        return exe;
    };

    igv.CursorGuide.prototype.doHide = function () {
        if (this.$button) {
            this.$button.removeClass('igv-nav-bar-button-clicked');
        }
        this.browser.hideCursorGuide();
    };

    igv.CursorGuide.prototype.doShow = function () {
        this.$button.addClass('igv-nav-bar-button-clicked');
        this.browser.showCursorGuide();
    };

    igv.CursorGuide.prototype.setState = function (cursorGuideVisible) {

        if (this.$button) {

            if (true === cursorGuideVisible) {
                this.$button.addClass('igv-nav-bar-button-clicked');
            } else {
                this.$button.removeClass('igv-nav-bar-button-clicked');
            }

        }
    };

    igv.CursorGuide.prototype.disable = function () {
        this.doHide();
        this.$guide.hide();
    };

    igv.CursorGuide.prototype.enable = function () {
        if (this.$button) {
            this.$button.show();
        }
    };

    return igv;

}) (igv || {});
