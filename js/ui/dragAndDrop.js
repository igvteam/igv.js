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
            $input,
            $label,
            $button,
            $e;

        $input = $('<input type="file" name="files[]" id="file" class="box__file" data-multiple-caption="{count} files selected" multiple="">');

        $label = $('<label for="file">');
        $e = $('<strong>');
        $e.text('Choose a file');
        $label.append($e);

        $e = $('<span class="box__dragndrop">');
        $e.text(' or drag it here');
        $label.append($e);

        $button = $('<button type="button" class="box__button">');
        $button.text('Upload');

        $box_input = $('<div class="box__input">');
        $box_input.append($input);
        $box_input.append($label);
        $box_input.append($button);

        $box = $('<div class="js box has-advanced-upload">');
        $box.append($box_input);

        this.$container = $('<div class="igv-drag-and-drop-container">');
        this.$container.append($box);

    };

    igv.DragAndDrop.prototype.initializationHelper = function () {

        var $form,
            $input,
            $label,
            $errorMsg,
            $restart,
            droppedFiles,
            showFiles;

        $form = this.$container.find('.box');
        $input		 = $form.find( 'input[type="file"]' );
        $label		 = $form.find( 'label' );
        $errorMsg	 = $form.find( '.box__error span' );
        $restart	 = $form.find( '.box__restart' );
        droppedFiles = false;

        showFiles = function( files ) {

            var str;

            if (_.size(files) > 1) {
                str = ( $input.attr( 'data-multiple-caption' ) || '' ).replace( '{count}', files.length );
            } else {
                str = _.first(files).name;
            }
            $label.text(str);
        };

        // automatically submit the form on file select
        $input.on( 'change', function( e ) {
            showFiles( e.target.files );
            // $form.trigger( 'submit' );
        });

        // drag & drop files
        $form.addClass( 'has-advanced-upload' )
            .on( 'drag dragstart dragend dragover dragenter dragleave drop', function( e ) {
                e.preventDefault();
                e.stopPropagation();
            })
            .on( 'dragover dragenter', function() {
                $form.addClass( 'is-dragover' );
            })
            .on( 'dragleave dragend drop', function() {
                $form.removeClass( 'is-dragover' );
            })
            .on( 'drop', function( e ) {
                droppedFiles = e.originalEvent.dataTransfer.files; // the files that were dropped
                showFiles( droppedFiles );
                // $form.trigger( 'submit' ); // automatically submit the form on file drop
            });

        $form.on( 'submit', function( e ) {

            // preventing the duplicate submissions if the current one is in progress
            if( $form.hasClass( 'is-uploading' ) ) return false;

            $form.addClass( 'is-uploading' ).removeClass( 'is-error' );

            e.preventDefault();

            // gathering the form data
            var ajaxData = new FormData( $form.get( 0 ) );

            if( droppedFiles ){
                $.each( droppedFiles, function( i, file )
                {
                    ajaxData.append( $input.attr( 'name' ), file );
                });
            }

            // $.ajax({
            // 			url: 			$form.attr( 'action' ),
            // 			type:			$form.attr( 'method' ),
            // 			data: 			ajaxData,
            // 			dataType:		'json',
            // 			cache:			false,
            // 			contentType:	false,
            // 			processData:	false,
            // 			complete: function()
            // 			{
            // 				$form.removeClass( 'is-uploading' );
            // 			},
            // 			success: function( data )
            // 			{
            // 				$form.addClass( data.success == true ? 'is-success' : 'is-error' );
            // 				if( !data.success ) $errorMsg.text( data.error );
            // 			},
            // 			error: function()
            // 			{
            // 				alert( 'Error. Please, contact the webmaster!' );
            // 			}
            // });

        });


        // restart the form if has a state of error/success

        $restart.on( 'click', function( e )
        {
            e.preventDefault();
            $form.removeClass( 'is-error is-success' );
            $input.trigger( 'click' );
        });

        // Firefox focus bug fix for file input
        $input
            .on( 'focus', function(){ $input.addClass( 'has-focus' ); })
            .on( 'blur', function(){ $input.removeClass( 'has-focus' ); });
        ;


    };

    return igv;
})(igv || {});