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
 * Created by turner on 4/15/15.
 */
var igv = (function (igv) {

    igv.ColorPickerPopupDialog = function (parentObject) {

        var colorPickerContainer,
            colorPicker,
            col_1_3,
            col_2_3;

        colorPickerContainer = $('<div class="grid-container">');

        colorPicker = $('<div class="grid">');

        col_1_3 = $('<div class="col col-1-3">');
        col_1_3.text(".col-1-3");

        col_2_3 = $('<div class="col col-2-3">');
        col_2_3.text(".col-2-3");

        colorPicker.append( col_1_3[ 0 ] );
        colorPicker.append( col_2_3[ 0 ] );
        colorPickerContainer.append( colorPicker[ 0 ]);

        parentObject.append( colorPickerContainer[ 0 ] );

    };

    return igv;

})(igv || {});
