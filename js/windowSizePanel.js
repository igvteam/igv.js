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
import {StringUtils} from "../node_modules/igv-utils/src/index.js";

class WindowSizePanel {
    constructor($parent, browser) {
        this.$container = $('<div>', {class: 'igv-windowsize-panel-container'});
        $parent.append(this.$container);
        this.browser = browser;
    }

    show() {
        this.$container.show();
    }

    hide() {
        this.$container.hide();
    }

    updatePanel(referenceFrameList) {
        this.$container.text(1 === referenceFrameList.length ? prettyBasePairNumber(Math.round(this.browser.viewportWidth() * referenceFrameList[ 0 ].bpPerPixel)) : '');
    }
}


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
        return StringUtils.numberFormatter(floored) + units;
    } else {
        return StringUtils.numberFormatter(raw) + " bp";
    }

    value = raw / denom;
    floored = Math.floor(value);

    return floored.toString() + units;
}


export default WindowSizePanel;
