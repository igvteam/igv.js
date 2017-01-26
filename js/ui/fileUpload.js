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
 * Created by dat on 1/25/17.
 */

/*
<span class="btn btn-success fileinput-button">
    <i class="glyphicon glyphicon-plus">
    </i>
    <span>
    Select files...
</span>
<!-- The file input field used as target for the file upload widget -->
<input id="fileupload" type="file" name="files[]" multiple="">
    </span>
*/

var igv = (function (igv) {

    igv.FileUpload = function () {
        var $containerSpan,
            $glyph,
            $span,
            $input;

        this.$container = $('<div class="igv-file-upload-container">');

        $containerSpan = $('<span class="btn btn-success fileinput-button">');
        this.$container.append($containerSpan);

        $glyph = $('<span class="glyphicon glyphicon-plus">');
        $containerSpan.append($glyph);

        $span = $('<span class="glyphicon glyphicon-plus">');
        $span.text('Select files...');
        $containerSpan.append($span);

        $input = $('<input id="fileupload" type="file" name="files[]" multiple="">');
        $containerSpan.append($input);
    };

    return igv;

}) (igv || {});
