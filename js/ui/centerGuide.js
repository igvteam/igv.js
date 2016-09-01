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

        this.$container = $('<div class="igv-center-guide igv-center-guide-thin">');
        $parent.append(this.$container);
        this.$container.css("display", config.showCenterGuide && true == config.showCenterGuide ? "block" : "none");

    };

    igv.CenterGuide.prototype.repaint = function () {

        var left,
            ls,
            ws,
            center,
            ppb = Math.floor(1.0/igv.browser.referenceFrame.bpPerPixel),
            x = this.$container.position.x;

        center = x + this.$container.outerWidth()/2;

        if (ppb > 1) {

            left = center - ppb/2;
            ls = left.toString() + 'px';
            ws = ppb.toString() + 'px';
            this.$container.css({ left:ls, width:ws });

            this.$container.removeClass('igv-center-guide-thin');
            this.$container.addClass('igv-center-guide-wide');
        } else {

            // ls = center.toString() + 'px';
            ls = '50%';
            ws = '1px';
            this.$container.css({ left:ls, width:ws });

            this.$container.removeClass('igv-center-guide-wide');
            this.$container.addClass('igv-center-guide-thin');
        }

        // console.log('CenterGuide - repaint. PPB ' + ppb);
    };

    return igv;

}) (igv || {});
