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

import $ from "./vendor/jquery-3.3.1.slim.js";
import {numberFormatter} from "./util/stringUtils.js";

const WindowSizePanel = function ($parent, browser) {

    this.$content = $('<div class="igv-windowsizepanel-content-div">');
    $parent.append(this.$content);
    this.browser = browser;

};

WindowSizePanel.prototype.show = function () {
    this.$content.show();
};

WindowSizePanel.prototype.hide = function () {
    this.$content.hide();
};

WindowSizePanel.prototype.updateWithGenomicStateList = function (genomicStateList) {

    if (genomicStateList.length > 1) {
        this.hide()
    } else if ('all' === genomicStateList[ 0 ].locusSearchString) {
        this.hide()
    } else {
        const [ genomicState ] = genomicStateList
        this.$content.text(prettyBasePairNumber(Math.round(this.browser.viewportWidth() * genomicState.referenceFrame.bpPerPixel)))
        this.show()
    }

};


function prettyBasePairNumber  (raw) {

    var denom,
        units,
        value,
        floored;

    if (raw > 1e7) {
        denom = 1e6;
        units = " mb";
    } else if (raw > 1e4) {

        denom = 1e3;
        units = " kb";

        value = raw / denom;
        floored = Math.floor(value);
        return numberFormatter(floored) + units;
    } else {
        return numberFormatter(raw) + " bp";
    }

    value = raw / denom;
    floored = Math.floor(value);

    return floored.toString() + units;
}


export default WindowSizePanel;
