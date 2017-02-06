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
 * Created by dat on 2/3/17.
 */
var igv = (function (igv) {

    igv.DragAndDrop = function () {

        var $box_input,
            $box,
            $fa_container,
            $fa,
            $input,
            $label,
            $button,
            $e;

        $fa_container = $('<div class="fa-container">');
        $fa = $('<i class="fa fa-upload fa-3x" aria-hidden="true">');
        $fa_container.append($fa);

        $input = $('<input type="file" name="files[]" id="file" class="box__file" data-multiple-caption="{count} files selected" multiple="">');

        $label = $('<label for="file">');
        $e = $('<strong>');
        $e.text('Choose a track file');
        $label.append($e);

        $e = $('<span class="box__dragndrop">');
        $e.text(' or drag it here');
        $label.append($e);

        $button = $('<button type="button" class="box__button">');
        $button.text('Load Track');

        $box_input = $('<div class="box__input">');
        $box_input.append($fa_container);
        $box_input.append($input);
        $box_input.append($label);
        $box_input.append($button);

        $box = $('<div class="js box">');
        $box.append($box_input);

        this.$container = $('<div class="igv-drag-and-drop-container">');
        this.$container.append($box);

    };

    igv.DragAndDrop.prototype.initializationHelper = function () {

        var $form,
            $input,
            $label,
            droppedFiles,
            $button;

        $form = this.$container.find('.box');
        $input		 = $form.find( 'input[type="file"]' );
        $label		 = $form.find( 'label' );
        $button = $form.find('.box__button');

        // automatically submit the form on file select
        $input.on( 'change', function( e ) {
            showFiles( e.target.files );
        });

        $button.on( 'click', function( e ) {
            console.log('dragAndDrop.initializationHelper - button click');
        });

        droppedFiles = false;
        $form.on( 'drag dragstart dragend dragover dragenter dragleave drop', function( e ) {
            e.preventDefault();
            e.stopPropagation();
        })
            .on( 'dragover dragenter', function() {
                $form.addClass( 'is-dragover' );
            })
            .on( 'dragleave dragend drop', function() {
                $form.removeClass( 'is-dragover' );
            // $form.trigger( 'submit' );
            })
            .on( 'drop', function( e ) {
                droppedFiles = e.originalEvent.dataTransfer.files; // the files that were dropped
                showFiles( droppedFiles );
                // $form.trigger( 'submit' ); // automatically submit the form on file drop
            });

        function showFiles( files ) {

            var str;

            if (_.size(files) > 1) {
                str = ( $input.attr( 'data-multiple-caption' ) || '' ).replace( '{count}', files.length );
            } else {
                str = _.first(files).name;
            }
            $label.text(str);
        }

    };

    return igv;
})(igv || {});