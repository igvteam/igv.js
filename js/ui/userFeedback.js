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

import $ from "../vendor/jquery-3.3.1.slim.js";
import {createIcon} from "../igv-icons.js";

const UserFeedback = function ($parent) {

    this.$container = $('<div class="igv-user-feedback">');
    $parent.append(this.$container);

    // header
    let $header = $('<div>');
    this.$container.append($header);

    // alert
    let $exclamation = $('<div>');
    $header.append($exclamation);

    let $a = createIcon("exclamation-triangle", 'red');
    $exclamation.append($a);

    // dismiss
    let $dismiss = $('<div>');
    $header.append($dismiss);

    let $b = createIcon("times-circle", 'grey');
    $dismiss.append($b);

    // body copy
    let $bodyCopyContainer = $('<div>');
    this.$container.append($bodyCopyContainer);

    let $bodyCopy = $('<div>');
    $bodyCopyContainer.append($bodyCopy);
    $bodyCopy.text('i am user feedback');

    let self;
    $dismiss.click(function () {
        $bodyCopy.html('');
        self.$container.hide();
    });

};

UserFeedback.prototype.show = function () {
    this.$container.show();
};

UserFeedback.prototype.hide = function () {
    this.$container.hide();
};

export default UserFeedback;