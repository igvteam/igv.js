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
 * Created by dat on 9/1/16.
 */
var igv = (function (igv) {

    igv.CenterGuide = function ($parent, config) {
        var self = this,
            cssDisplay;
        
        this.$container = $('<div class="igv-center-guide igv-center-guide-thin">');
        $parent.append(this.$container);
        this.$container.css("display", (config.showCenterGuide && true == config.showCenterGuide) ? "block" : "none");

        cssDisplay = this.$container.css("display");
        this.$centerGuideToggle = $('<div class="igv-toggle-track-labels">');
        this.$centerGuideToggle.text(("none" === cssDisplay) ? "show center guide" : "hide center guide");

        this.$centerGuideToggle.on("click", function () {
            cssDisplay = self.$container.css("display");
            if ("none" === cssDisplay) {
                self.$container.css("display", "block");
                self.$centerGuideToggle.text("hide center guide");
            } else {
                self.$container.css("display", "none");
                self.$centerGuideToggle.text("show center guide");
            }
        });

    };

    igv.CenterGuide.prototype.repaint = function () {

        var ppb,
            bbox,
            trackViewXY,
            trackViewHalfWidth,
            width,
            left,
            ls,
            ws,
            center,
            xBP;

        if (undefined === igv.browser.referenceFrame) {
            return;
        }

        ppb = 1.0/igv.browser.referenceFrame.bpPerPixel;
        if (ppb > 1) {

            bbox = igv.browser.syntheticTrackViewportContainerBBox();
            trackViewXY = bbox.position;
            trackViewHalfWidth = 0.5 * bbox.width;
            xBP = igv.browser.referenceFrame.toBP(trackViewHalfWidth) + igv.browser.referenceFrame.start;

            center = trackViewXY.left + trackViewHalfWidth;
            width = igv.browser.referenceFrame.toPixels(1);
            left = center - 0.5 * width;

            ls = Math.round(left).toString() + 'px';
            ws = Math.round(width).toString() + 'px';
            this.$container.css({ left:ls, width:ws });

            this.$container.removeClass('igv-center-guide-thin');
            this.$container.addClass('igv-center-guide-wide');
        } else {

            this.$container.css({ left:'50%', width:'1px' });

            this.$container.removeClass('igv-center-guide-wide');
            this.$container.addClass('igv-center-guide-thin');
        }

    };

    return igv;

}) (igv || {});
