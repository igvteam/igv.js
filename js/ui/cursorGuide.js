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

    igv.CursorGuide = function ($guideParent, $controlParent, config, browser) {
        
        const self = this;

        this.browser = browser;
        
        this.$guide = $('<div class="igv-cursor-tracking-guide">');
        $guideParent.append(this.$guide);

        // Guide line is bound within track area, and offset by 5 pixels so as not to interfere mouse clicks.
        $guideParent.on('mousemove.cursorGuide', function (e) {
            var exe;

            e.preventDefault();

            exe = Math.max(50, igv.translateMouseCoordinates(e, $guideParent.get(0)).x);
            exe = Math.min($guideParent.innerWidth() - 65, exe);
            // exe = Math.min(browser.trackContainerDiv.clientWidth - 65, exe);

            self.$guide.css({ left: exe + 'px' });

            var coords,
                $target,
                $viewport;

            $target = $(e.target);
            $viewport = $target.parents('.igv-viewport-div');

            if (0 === _.size($viewport)) {
                $viewport = undefined;
                return;
            }    
     
            coords = igv.translateMouseCoordinates(e, $viewport.get(0));
     
            // viewport object we are panning
            // viewport = igv.Viewport.viewportWithID($viewport.data('viewport'));
            // referenceFrame = viewport.genomicState.referenceFrame;
            var referenceFrame = self.browser.genomicStateList[0].referenceFrame;

            // show location with comma seperator
            var ref_num = Math.floor((referenceFrame.start) + referenceFrame.toBP(coords.x));
            var ref_txt = ref_num.toString();
            self.$guide.text(ref_txt.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));

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
