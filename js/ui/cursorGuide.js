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

            const genomicState = mouseHandler(e, $canvas, this.$guide, $cursorGuideParent, this.browser);

            return;








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
            const cursor_guide_parent_mouse_xy = igv.getMouseXY($cursorGuideParent.get(0), e);
            const left = cursor_guide_parent_mouse_xy.x + 'px';
            this.$guide.css({ left: left });

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

    let mouseHandler = (event, $canvas, $guideLine, $guideParent, browser) => {

        // position guide line
        const cursor_guide_parent_mouse_xy = igv.getMouseXY($guideParent.get(0), event);
        const left = cursor_guide_parent_mouse_xy.x + 'px';
        $guideLine.css({ left: left });


        // return base-pair location of guide line
        const $viewport_content = $canvas.parent();
        const viewport_content_mouse_xy = igv.getMouseXY($viewport_content.get(0), event);

        const index = $viewport_content.data('genomicStateIndex');

        const referenceFrame = browser.genomicStateList[ index ].referenceFrame;

        const _startBP = referenceFrame.start;
        const _endBP = 1 + referenceFrame.start + (viewport_content_mouse_xy.width * referenceFrame.bpPerPixel);

        // bp = bp + (pixel * (bp / pixel))
        const bp = Math.round(_startBP + viewport_content_mouse_xy.x * referenceFrame.bpPerPixel);

        return { bp: bp, start: _startBP, end: _endBP };
    };

    let DEPRICATED_mouseMoveHandler = (event, cursorGuide, $cursorGuideParent) => {
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
