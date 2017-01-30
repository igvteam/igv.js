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

var igv = (function (igv) {

    igv.FileUpload = function () {
        var $container,
            $input,
            $label,
            $fa,
            $span,
            input,
            label,
            labelVal;


        // $('html').addClass('no-js');
        //
        // (function(e,t,n){
        //     var r = e.querySelectorAll("html")[0];
        //     r.className = r.className.replace(/(^|\s)no-js(\s|$)/,"$1js$2");
        // })(document, window, 0);

        $('#myDiv').addClass('no-js');

        (function(e,t,n){
            var r = e.querySelector('#myDiv');
            r.className = r.className.replace(/(^|\s)no-js(\s|$)/,"$1js$2");
        })(document, window, 0);

        // container
        $container = $('<div class="igv-file-upload-container">');

        $input = $('<input type="file" name="file-1[]" class="inputfile inputfile-1" data-multiple-caption="{count} files selected" multiple />');
        $input.attr('id', 'file-1');


        $label = $('<label for="file-1">');
        $fa = $('<i class="fa fa-upload" aria-hidden="true">');
        $span = $('<span>');
        $span.html('Choose a file&hellip;');

        $label.append($fa);
        $label.append($span);

        $container.append($input);
        $container.append($label);

        input = $input.get(0);
        label = $label.get(0);
        labelVal = label.innerHTML;
        input.addEventListener( 'change', function( e ) {
            var fileName = '';
            if( /*this.files && this.files.length > 1*/ _.size(this.files) > 1) {
                fileName = ( this.getAttribute('data-multiple-caption') || '' ).replace('{count}', this.files.length);
            } else {
                fileName = e.target.value.split('\\').pop();
            }

            if( fileName ) {
                label.querySelector('span').innerHTML = fileName;
                igvxhr.loadStringFromFile(fileName, undefined).then(success);

                function success (data) {
                    console.log('igv.FileUpload. Data loaded');

                    // self.header = parser.parseHeader(data);
                    // var features = parser.parseFeatures(data);

                    //console.log("Calling success "+success);
                    //console.log("nr features in argument "+features.length);

                    // continuation(features);   // <= PARSING DONE HERE
                }

            } else {
                label.innerHTML = labelVal;
            }
        });

        this.$container = $container;

    };

    return igv;

}) (igv || {});
