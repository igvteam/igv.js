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

        // warning
        this.$warning = createWarning();
        this.$container.append(this.$warning);

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

    igv.TrackFileLoad.prototype.warnWithMessage = function (message) {
        this.$warning.text(message);
        this.$warning.show();
    };

    igv.TrackFileLoad.prototype.loadLocalFile = function (file) {

        if (!igv.TrackFileLoad.isIndexable(file)) {
            igv.browser.loadTrack( { url: file } );
            doDismiss(this);
            return;
        }


        if (igv.TrackFileLoad.isIndexFile(file)) {
            this.indexFile = file;

            this.$index_file_input.hide();
            this.$index_file_input_blurb.hide();

            this.$fa_index_file.removeClass('fa-file-o');
            this.$fa_index_file.addClass('fa-file');

            $('#file_input_ok').show();
            $('#file_input_cancel').show();

        } else {
            this.file = file;

            this.$url_input_container.hide();

            this.$file_input.hide();
            this.$file_input_blurb.hide();

            this.$index_file_input.show();
            this.$index_file_input_blurb.show();

            this.$file_icon_container.show();

        }

    };

    igv.TrackFileLoad.isIndexFile = function (fileOrURL) {
        var extension = igv.getExtension({ url: fileOrURL });
        return _.contains([ 'idx', 'bai' ], extension);
    };

    igv.TrackFileLoad.isIndexable = function (fileOrURL) {

        var extension;

        if (igv.TrackFileLoad.isIndexFile(fileOrURL)) {
            return false;
        } else {
            extension = igv.getExtension({ url: fileOrURL });
            return (igv.getExtension({ url: fileOrURL }) !== 'wig' && this.format !== 'seg');
        }

    };

    function drag_drop_surface(trackFileLoader, $parent) {

        var $e,
            $ok,
            $cancel,
            $fa_file;

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
                trackFileLoader.loadLocalFile(_.first(e.originalEvent.dataTransfer.files));
            });


        trackFileLoader.$file_icon_container = $('<div class="igv-drag-drop-file-icon-container">');
        trackFileLoader.$drag_drop_surface.append(trackFileLoader.$file_icon_container);

        //
        $fa_file = $('<i id="igv-drag-drop-file-icon" class="fa fa-file fa-5x" aria-hidden="true">');
        trackFileLoader.$file_icon_container.append($fa_file);

        //
        trackFileLoader.$fa_index_file = $('<i id="igv-drag-drop-index-file-icon" class="fa fa-file-o fa-5x" aria-hidden="true">');
        trackFileLoader.$file_icon_container.append(trackFileLoader.$fa_index_file);

        trackFileLoader.$file_icon_container.hide();


        // load local file container
        trackFileLoader.$file_input_container = $('<div class="igv-track-file-input-container-css">');
        trackFileLoader.$drag_drop_surface.append(trackFileLoader.$file_input_container);

        // load local file
        trackFileLoader.$file_input = $('<input id="igv-track-file-input" class="igv-track-file-input-css" type="file" name="files[]" data-multiple-caption="{count} files selected" multiple="">');
        trackFileLoader.$file_input_container.append(trackFileLoader.$file_input);

        trackFileLoader.$file_input.on( 'change', function( e ) {
            trackFileLoader.loadLocalFile(_.first(e.target.files))
        });

        blurb(trackFileLoader, trackFileLoader.$file_input_container, 'Choose file', 'igv-track-file-input', 'load-file-blurb');
        trackFileLoader.$file_input_blurb = trackFileLoader.$file_input_container.find('#load-file-blurb');

        // load local index file
        trackFileLoader.$index_file_input = $('<input id="igv-track-index-file-input" class="igv-track-file-input-css" type="file" name="files[]" data-multiple-caption="{count} files selected" multiple="">');
        trackFileLoader.$file_input_container.append(trackFileLoader.$index_file_input);

        trackFileLoader.$index_file_input.on( 'change', function( e ) {
            trackFileLoader.loadLocalFile(_.first(e.target.files));
        });

        blurb(trackFileLoader, trackFileLoader.$file_input_container, 'Choose index file', 'igv-track-index-file-input', 'load-local-file-blurb');
        trackFileLoader.$index_file_input_blurb = trackFileLoader.$file_input_container.find('#load-local-file-blurb');

        trackFileLoader.$index_file_input.hide();
        trackFileLoader.$index_file_input_blurb.hide();

        trackFileLoader.$fa_index_file.on('click', function () {
            trackFileLoader.$index_file_input.click();
        });

        // ok
        $ok = $('<div id="file_input_ok" class="igv-drag-drop-ok">');
        trackFileLoader.$drag_drop_surface.append($ok);
        $ok.text('ok');
        $ok.hide();

        $ok.on('click', function (e) {

            igv.browser.loadTrack( { url: trackFileLoader.file, indexURL: trackFileLoader.indexFile } );
            doDismiss(trackFileLoader);
        });

        // cancel
        $cancel = $('<div id="file_input_cancel" class="igv-drag-drop-cancel">');
        trackFileLoader.$drag_drop_surface.append($cancel);
        $cancel.text('cancel');
        $cancel.hide();

        $cancel.on('click', function (e) {
            doDismiss(trackFileLoader);
        });

        // load URL
        url_input_container(trackFileLoader, trackFileLoader.$drag_drop_surface);

        function blurb(trackFileLoader, $parent, phrase, input_id, label_id) {
            var $label;

            // load local file - blurb
            $label = $('<label>');
            $parent.append($label);

            $label.attr('for', input_id);
            $label.attr('id', label_id);

            trackFileLoader.$choose_file = $('<strong>');
            trackFileLoader.$choose_file.text(phrase);
            $label.append(trackFileLoader.$choose_file);

            $e = $('<span class="igv-drag-drop-surface-blurb">');
            $e.text(' or drop it here');
            $label.append($e);

        }

    }

    function createWarning() {
        var $warning,
            $e,
            $fa;

        $warning = $('<div class="igv-drag-drop-warning">');

        // dismiss warning container
        $e = $('<div class="igv-drag-drop-warning-close">');
        $warning.append($e);

        // dismiss warning
        $fa = $('<i class="fa fa-times-circle">');
        $e.append($fa);

        $fa.on('click', function () {
            $warning.hide();
        });

        // $warning.hide();

        return $warning;
    }

    function url_input_container(trackFileLoader, $parent) {

        var $ok,
            $cancel;

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

            if (igv.TrackFileLoad.isIndexFile(_url)) {

                trackFileLoader.warnWithMessage('Error. That url is an index file. Not cool.');
            } else if (false === igv.TrackFileLoad.isIndexable(_url)) {

                igv.browser.loadTrack( { url: _url } );
                $(this).val(undefined);
                doDismiss(trackFileLoader);
            } else {

                trackFileLoader.$file_input_container.hide();
                trackFileLoader.$or.hide();

                trackFileLoader.$url_input_feedback.text( ('.../' + _url.split("/").pop()) );
                trackFileLoader.$url_input_feedback.show();

                $(this).hide();

                trackFileLoader.$index_url_input.val(undefined);
                trackFileLoader.$index_url_input.show();

                $ok.show();
                $cancel.show();

            }

        });

        // visual feedback that url was successfully input
        trackFileLoader.$url_input_feedback = $('<div class="igv-drag-and-drop-url-input-feedback" >');
        trackFileLoader.$url_input_container.append(trackFileLoader.$url_input_feedback);
        trackFileLoader.$url_input_feedback.hide();


        // index url input
        trackFileLoader.$index_url_input = $('<input class="igv-drag-and-drop-url-input" placeholder="enter optional index URL">');
        trackFileLoader.$index_url_input.hide();
        trackFileLoader.$url_input_container.append(trackFileLoader.$index_url_input);

        trackFileLoader.$index_url_input.on( 'change', function( e ) {
            var _url = $(this).val();
            trackFileLoader.$index_url_input_feedback.text( ('.../' + _url.split("/").pop()) );
            trackFileLoader.$index_url_input_feedback.toggle();
            $(this).toggle();
        });

        // visual feedback that index url was successfully input
        trackFileLoader.$index_url_input_feedback = $('<div class="igv-drag-and-drop-url-input-feedback" >');
        trackFileLoader.$url_input_container.append(trackFileLoader.$index_url_input_feedback);
        trackFileLoader.$index_url_input_feedback.hide();

        // ok
        $ok = $('<div  id="url_input_ok" class="igv-drag-drop-ok">');
        trackFileLoader.$url_input_container.append($ok);
        $ok.text('ok');
        $ok.hide();

        $ok.on('click', function (e) {
            var _url,
                _indexURL;

            _url = ("" === trackFileLoader.$url_input.val()) ? undefined : trackFileLoader.$url_input.val();
            _indexURL = ("" === trackFileLoader.$index_url_input.val()) ? undefined : trackFileLoader.$index_url_input.val();

            igv.browser.loadTrack( { url: _url, indexURL: _indexURL } );
            doDismiss(trackFileLoader);
        });

        // cancel
        $cancel = $('<div  id="url_input_cancel" class="igv-drag-drop-cancel">');
        trackFileLoader.$url_input_container.append($cancel);
        $cancel.text('cancel');
        $cancel.hide();

        $cancel.on('click', function (e) {
            doDismiss(trackFileLoader);
        });
    }

    function doDismiss(trackFileLoader) {

        // file show/hide
        $('#file_input_ok').hide();
        $('#file_input_cancel').hide();

        trackFileLoader.$url_input_container.show();

        trackFileLoader.$file_input.show();
        trackFileLoader.$file_input_blurb.show();

        trackFileLoader.$index_file_input.hide();
        trackFileLoader.$index_file_input_blurb.hide();

        trackFileLoader.$fa_index_file.addClass('fa-file-o');
        trackFileLoader.$fa_index_file.removeClass('fa-file');

        trackFileLoader.$file_icon_container.hide();


        // url show/hide
        $('#url_input_ok').hide();
        $('#url_input_cancel').hide();

        trackFileLoader.$file_input_container.show();
        trackFileLoader.$or.show();

        trackFileLoader.$url_input.show();
        trackFileLoader.$index_url_input.hide();

        trackFileLoader.$url_input_feedback.hide();
        trackFileLoader.$index_url_input_feedback.hide();

        trackFileLoader.$url_input.val(undefined);
        trackFileLoader.$index_url_input.val(undefined);

        // container hide
        trackFileLoader.$container.hide();
    }

    function doPresent(trackFileLoader) {
        trackFileLoader.$container.show();
    }

    return igv;
})(igv || {});
