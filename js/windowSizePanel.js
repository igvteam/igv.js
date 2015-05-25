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

/**
 * Created by turner on 5/22/15.
 */
var igv = (function (igv) {

    igv.WindowSizePanel = function (parentObject) {

        this.contentDiv = $('<div class="igv-windowsizepanel-content-div"></div>');
        parentObject.append(this.contentDiv[0]);

    };

    igv.WindowSizePanel.prototype.update = function (size) {

        var value,
            floored,
            denom,
            units;

        this.contentDiv.text( prettyNumber( size ) );

        function prettyNumber(size) {

            if (size > 1e7) {
                denom = 1e6;
                units = " mb";
            } else if (size > 1e4) {

                denom = 1e3;
                units = " kb";

                value = size/denom;
                floored = Math.floor(value);
                return igv.numberFormatter(floored) + units;
            } else {
                return igv.numberFormatter(size) + " bp";
            }

            value = size/denom;
            floored = Math.floor(value);

            return floored.toString() + units;
        }

    };


    return igv;
})
(igv || {});