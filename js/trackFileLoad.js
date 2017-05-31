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

    igv.TrackFileLoad = function () {

        var self = this;

        // drag & drop widget
        this.$container = $('<div class="igv-drag-drop-container">');

        // drag & drop surface
        drag_drop_surface(this, this.$container);

        // dismiss drag & drop widget
        this.$container.append( dismissButton() );

        // present drag & drop widget
        this.$presentationButton = $('<div class="igv-drag-and-drop-presentation-button">');
        this.$presentationButton.text('Load Track');

        this.$presentationButton.on('click', function () {

            if (self.$container.is(':visible')) {
                doDismiss(self);
            } else {
                doPresent(self);
            }

        });

        function dismissButton() {

            var $container,
                $fa;

            $fa = $('<i class="fa">');
            fa_mouseout();

            $fa.hover(fa_mousein, fa_mouseout);

            $fa.on('click', function () {
                fa_mouseout();
                doDismiss(self);
            });

            $container = $('<div class="igv-drag-and-drop-close-container">');
            $container.append($fa);

            function fa_mousein () {
                $fa.removeClass('fa-times igv-drag-and-drop-close-fa-mouse-out');
                $fa.addClass('fa-times-circle igv-drag-and-drop-close-fa-mouse-in');
            }

            function fa_mouseout () {
                $fa.removeClass('fa-times-circle igv-drag-and-drop-close-fa-mouse-in');
                $fa.addClass('fa-times igv-drag-and-drop-close-fa-mouse-out');
            }

            return $container;

        }

    };

    function drag_drop_surface(trackFileLoader, $parent) {

        var $fa_container,
            $fa,
            $e;

        trackFileLoader.$drag_drop_surface = $('<div class="igv-drag-drop-surface">');
        $parent.append(trackFileLoader.$drag_drop_surface);

        trackFileLoader.$drag_drop_surface
            .on( 'drag dragstart dragend dragover dragenter dragleave drop', function( e ) {
                e.preventDefault();
                e.stopPropagation();
            })
            .on( 'dragover dragenter', function() {
                $(this).addClass( 'is-dragover' );
            })
            .on( 'dragleave dragend drop', function() {
                $(this).removeClass( 'is-dragover' );
            })
            .on( 'drop', function( e ) {
                trackFileLoader.loadTrackWithFile(_.first(e.originalEvent.dataTransfer.files));
            });

        // load local file container
        trackFileLoader.$file_input_container = $('<div class="igv-track-file-input-container-css">');
        trackFileLoader.$drag_drop_surface.append(trackFileLoader.$file_input_container);

        // icon
        $fa_container = $('<div class="fa-container">');
        trackFileLoader.$file_input_container.append($fa_container);

        $fa = $('<i class="fa fa-upload fa-3x" aria-hidden="true">');
        $fa_container.append($fa);

        // load local file
        trackFileLoader.$file_input = $('<input id="igv-track-file-input" class="igv-track-file-input-css" type="file" name="files[]" data-multiple-caption="{count} files selected" multiple="">');
        trackFileLoader.$file_input_container.append(trackFileLoader.$file_input);

        trackFileLoader.$file_input.on( 'change', function( e ) {
            trackFileLoader.loadTrackWithFile(_.first(e.target.files))
        });

        trackFileLoader.$label = $('<label for="igv-track-file-input">');
        trackFileLoader.$file_input_container.append(trackFileLoader.$label);

        trackFileLoader.$choose_file = $('<strong>');
        trackFileLoader.$choose_file.text('Choose file');
        trackFileLoader.$label.append(trackFileLoader.$choose_file);

        $e = $('<span class="igv-drag-drop-surface-blurb">');
        $e.text(' or drop it here');
        trackFileLoader.$label.append($e);

        // warning
        trackFileLoader.$warning = warningHandler();
        trackFileLoader.$drag_drop_surface.append(this.$warning);

        // load URL
        url_input_container(trackFileLoader, trackFileLoader.$drag_drop_surface);

        function warningHandler () {
            var $warning,
                $e,
                $fa;

            $warning = $('<div class="igv-drag-and-drop-warning-container">');

            // warning message
            $e = $('<div class="igv-drag-and-drop-warning-message">');
            $warning.append($e);

            $e.text('ERROR: INDEXED FILE LOADING NOT SUPPORTED');

            // dismiss container
            $e = $('<div class="igv-drag-and-drop-warning-close-container">');
            $warning.append($e);

            // dismiss
            $fa = $('<i class="fa fa-times-circle">');
            $e.append($fa);

            $fa.on('click', function () {
                $warning.hide();
            });

            $warning.hide();

            return $warning;
        }


    }

    igv.TrackFileLoad.prototype.loadTrackWithFile = function( file ) {

        var filename,
            extension;

        filename = file.name;
        extension = igv.getExtension({ url: file });

        if ('bed' === igv.getExtension({ url: file })) {
            this.$url_input_container.hide();
            this.$choose_file.text('Choose BED index file');
        } else {
            igv.browser.loadTrack( { url: file, isLocalFile: true } );
            doDismiss(this);
        }


        // igv.browser.loadTrack( { url: file, isLocalFile: true } );
        // doDismiss(trackFileLoader);

        // if ('bam' === extension) {
        //     trackFileLoader.$warning.show();
        // } else {
        //     doDismiss(trackFileLoader);
        //     igv.browser.loadTrack( { url: file, isLocalFile: true } );
        // }

    };

    function url_input_container(trackFileLoader, $parent) {

        var $ok;

        // url input container
        trackFileLoader.$url_input_container = $('<div class="igv-drag-and-drop-url-input-container">');
        $parent.append(trackFileLoader.$url_input_container);

        trackFileLoader.$or = $('<div>');
        trackFileLoader.$url_input_container.append(trackFileLoader.$or);
        trackFileLoader.$or.text('or');

        // url input
        trackFileLoader.$url_input = $('<input class="igv-drag-and-drop-url-input" placeholder="enter URL">');
        trackFileLoader.$url_input_container.append(trackFileLoader.$url_input);

        trackFileLoader.$url_input.on( 'change', function( e ) {
            var _url = $(this).val();

            if ('bed' === igv.getExtension({ url: _url })) {

                trackFileLoader.$file_input_container.toggle();
                trackFileLoader.$or.toggle();

                trackFileLoader.$url_input_feedback.text( ('.../' + _url.split("/").pop()) );
                trackFileLoader.$url_input_feedback.toggle();

                $(this).toggle();

                trackFileLoader.$index_url_input.toggle();
            } else {
                igv.browser.loadTrack( { url: _url } );
                $(this).val(undefined);
                doDismiss(trackFileLoader);
            }

        });

        // visual feedback that url was successfully input
        trackFileLoader.$url_input_feedback = $('<div class="igv-drag-and-drop-url-input-feedback" >');
        trackFileLoader.$url_input_container.append(trackFileLoader.$url_input_feedback);
        trackFileLoader.$url_input_feedback.hide();


        // index url input
        trackFileLoader.$index_url_input = $('<input class="igv-drag-and-drop-url-input" placeholder="enter index URL">');
        trackFileLoader.$index_url_input.hide();
        trackFileLoader.$url_input_container.append(trackFileLoader.$index_url_input);

        trackFileLoader.$index_url_input.on( 'change', function( e ) {
            var _url = $(this).val();
            trackFileLoader.$index_url_input_feedback.text( ('.../' + _url.split("/").pop()) );
            trackFileLoader.$index_url_input_feedback.toggle();
            $(this).toggle();

            $ok.toggle();
        });

        // visual feedback that index url was successfully input
        trackFileLoader.$index_url_input_feedback = $('<div class="igv-drag-and-drop-url-input-feedback" >');
        trackFileLoader.$url_input_container.append(trackFileLoader.$index_url_input_feedback);
        trackFileLoader.$index_url_input_feedback.hide();

        //
        $ok = $('<div class="igv-drag-and-drop-url-ok">');
        trackFileLoader.$url_input_container.append($ok);
        $ok.text('ok');
        $ok.hide();

        $ok.on('click', function (e) {

            doDismiss(trackFileLoader);

            trackFileLoader.$file_input_container.toggle();
            trackFileLoader.$or.toggle();

            trackFileLoader.$url_input.show();
            trackFileLoader.$index_url_input.hide();

            trackFileLoader.$url_input_feedback.hide();
            trackFileLoader.$index_url_input_feedback.hide();

            $(this).toggle();

            igv.browser.loadTrack( { url: trackFileLoader.$url_input.val(), indexURL: trackFileLoader.$index_url_input.val() } );

            trackFileLoader.$url_input.val(undefined);
            trackFileLoader.$index_url_input.val(undefined);


        });
    }

    function doDismiss(trackFileLoader) {
        trackFileLoader.$container.hide();
    }

    function doPresent(trackFileLoader) {
        trackFileLoader.$container.show();
    }

    return igv;
})(igv || {});
