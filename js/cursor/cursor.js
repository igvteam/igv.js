/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 The Regents of the University of California
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
 * Created by dat on 4/25/17.
 */

var cursor = (function (cursor) {

    cursor.spinner = function (size) {

        // spinner
        var $container,
            $spinner;

        $spinner = $('<i class="fa fa-spinner fa-spin">');
        if (size) {
            $spinner.css("font-size", size);
        }

        $container = $('<div class="igv-spinner-container">');
        $container.append($spinner);

        return $container;
    };

    /**
     * Find spinner
     */
    cursor.getSpinner = function ($parent) {
        return $parent.find('.igv-spinner-container');
    };

    /**
     * Start the spinner for the parent element, if it has one
     */
    cursor.startSpinner = function ($parent) {

        var $spinner = cursor.getSpinner($parent);

        if ($spinner) {
            $spinner.show();
        }

    };

    /**
     * Stop the spinner for the parent element, if it has one
     * @param $parent
     */
    cursor.stopSpinner = function ($parent) {

        var $spinner = cursor.getSpinner($parent);

        if ($spinner) {
            $spinner.hide();
        }

    };

    return cursor;

}) (cursor || {});
