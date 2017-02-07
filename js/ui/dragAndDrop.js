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

        var self = this,
            $box_input,
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

        $box = $('<div class="js igv-drag-and-drop-box">');
        $box.append($box_input);

        this.$container = $('<div class="igv-drag-and-drop-container">');
        this.$container.append($box);
        this.$container.append( closeHandler() );

        function closeHandler() {

            var $container = $('<div class="igv-drag-and-drop-close-container">'),
                $fa = $('<i class="fa fa-times igv-drag-and-drop-close-fa">');

            $container.append($fa);

            $fa.hover(
                function () {
                    $fa.removeClass("fa-times");
                    $fa.addClass("fa-times-circle");

                    $fa.css({
                        "color": "#36464b"
                    });
                },

                function () {
                    $fa.removeClass("fa-times-circle");
                    $fa.addClass("fa-times");

                    $fa.css({
                        "color": "#92b0b3"
                    });

                }
            );

            $fa.on('click', function () {
                self.$container.hide();
            });

            return $container;
        }

    };

    igv.DragAndDrop.prototype.initializationHelper = function () {

        var self = this,
            $drag_and_drop,
            $input,
            $label,
            droppedFiles = undefined,
            $button;

        $drag_and_drop = this.$container.find('.igv-drag-and-drop-box');

        $input = $drag_and_drop.find( 'input[type="file"]' );

        $label = $drag_and_drop.find( 'label' );

        $button = $drag_and_drop.find('.box__button');

        $input.on( 'change', function( e ) {

            droppedFiles = e.target.files;
            presentFileName( droppedFiles );
        });

        $button.on( 'click', function( e ) {
            var file = _.first(droppedFiles);

            dismissDragAndDrop();
            igv.browser.loadTracksWithConfigList( [ { localFile: file } ] );

        });

        $drag_and_drop
            .on( 'drag dragstart dragend dragover dragenter dragleave drop', function( e ) {
                e.preventDefault();
                e.stopPropagation();
            })
            .on( 'dragover dragenter', function() {
                $drag_and_drop.addClass( 'is-dragover' );
            })
            .on( 'dragleave dragend drop', function() {
                $drag_and_drop.removeClass( 'is-dragover' );
                // $drag_and_drop.trigger( 'submit' );
            })
            .on( 'drop', function( e ) {
                droppedFiles = e.originalEvent.dataTransfer.files; // the files that were dropped
                presentFileName( droppedFiles );
                // $drag_and_drop.trigger( 'submit' ); // automatically submit the form on file drop
            });


        this.$dragAndDropPresentationButton = $('<div class="igv-drag-and-drop-presentation-button">');
        this.$dragAndDropPresentationButton.text('Load Track');

        this.$dragAndDropPresentationButton.on('click', function () {
            presentDragAndDrop();
        });


        function presentFileName( files ) {

            var str;

            if (_.size(files) > 1) {
                str = ( $input.attr( 'data-multiple-caption' ) || '' ).replace( '{count}', files.length );
            } else {
                str = _.first(files).name;
            }

            $label.text(str);

            str = 'Load ' + str;
            $button.text(str);

        }

        function dismissDragAndDrop () {
            self.$container.hide();
        }

        function presentDragAndDrop () {
            self.$container.show();
        }

    };

    return igv;
})(igv || {});