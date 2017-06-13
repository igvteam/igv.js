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

        // shim
        this.$container.append($('<div class="igv-drag-drop-shim">'));

        // dismiss drag & drop widget
        this.$container.append( dismissButton() );

        this.hideFileIcons();

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

            $fa.hover(fa_mousein, fa_mouseout);

            $fa.on('click', function () {
                fa_mouseout();
                doDismiss(self);
            });

            $container = $('<div class="igv-drag-and-drop-close-container">');
            $container.append($fa);

            fa_mouseout();

            function fa_mousein () {
                $fa.removeClass('fa-times');
                $fa.addClass('fa-times-circle');
            }

            function fa_mouseout () {
                $fa.removeClass('fa-times-circle');
                $fa.addClass('fa-times');
            }

            return $container;

        }

    };

    igv.TrackFileLoad.prototype.hideFileIcons = function () {

        this.$fa_file.removeClass('igv-drag-drop-fa-file');
        this.$fa_file.addClass('igv-drag-drop-fa-hidden');

        this.$fa_index_file.removeClass('igv-drag-drop-fa-file-o');
        this.$fa_index_file.addClass('igv-drag-drop-fa-hidden');
    };

    igv.TrackFileLoad.prototype.showFileIcons = function () {

        this.$fa_file.removeClass('igv-drag-drop-fa-hidden');
        this.$fa_file.addClass('igv-drag-drop-fa-file');

        this.$fa_index_file.removeClass('igv-drag-drop-fa-hidden');
        this.$fa_index_file.addClass('igv-drag-drop-fa-file-o');
    };

    igv.TrackFileLoad.prototype.warnWithMessage = function (message) {
        this.$warning.find('#warning-message').text(message);
        this.$warning.show();
    };

    igv.TrackFileLoad.keyToIndexExtension =
        {
            bam: { extension:'bai', optional:false },
            any: { extension:'idx', optional:true  },
            gz:  { extension:'tbi', optional:true  }
        };

    igv.TrackFileLoad.indexExtensionToKey = _.invert(_.mapObject(igv.TrackFileLoad.keyToIndexExtension, function (val) { return val.extension; }));

    igv.TrackFileLoad.isIndexFile = function (fileOrURL) {
        var extension,
            list;

        extension = igv.getExtension({ url: fileOrURL });

        list = _.map(_.values(igv.TrackFileLoad.keyToIndexExtension), function (v) {
            return v.extension;
        });

        return _.contains(list, extension);
    };

    igv.TrackFileLoad.isIndexable = function (fileOrURL) {

        var extension;

        if (igv.TrackFileLoad.isIndexFile(fileOrURL)) {
            return false;
        } else {
            extension = igv.getExtension({ url: fileOrURL });
            return (extension !== 'wig' && extension !== 'seg');
        }

    };

    igv.TrackFileLoad.prototype.loadLocalFiles = function (files) {

        var result,
            extension,
            dataFiles,
            indexFiles,
            missing,
            missingIndexFiles,
            missingDataFiles,
            configurations,
            str,
            blurb_0,
            blurb_1,
            blurb_2;


        result = _.filter(files, function (f) { return !igv.TrackFileLoad.isIndexFile(f); });
        if (_.size(result) > 0) {

            dataFiles = {};
            _.each(result, function (f) {
                var parts,
                    key,
                    extension,
                    lookupKey;

                parts = f.name.split('.');
                if ('gz' === _.last(parts)){
                    parts.pop();
                }
                parts.pop();
                key = parts.join('.');

                extension = igv.getExtension({ url: f });
                lookupKey = (_.contains(_.keys(igv.TrackFileLoad.keyToIndexExtension), extension)) ? extension: 'any';

                dataFiles[ key ] = { file: f, extension: igv.getExtension({ url: f }), indexExtensionLookup: lookupKey };
            });
        }

        result = _.filter(files, function (f) { return igv.TrackFileLoad.isIndexFile(f); });
        // if there are no index files
        if (0 === _.size(result)) {

            missing = _.filter(dataFiles, function (df) {
                return false === igv.TrackFileLoad.keyToIndexExtension[ df.indexExtensionLookup ].optional;
            });

            if (0 === _.size(missing)) {
                configurations = _.map(_.pluck(dataFiles, 'file'), function (f) {
                    return { url: f }
                });
                igv.browser.loadTracksWithConfigList(configurations);
                doDismiss(this);
            } else {
                str = _.map(missing, function (m) { return m.file.name; }).join(' ');
                this.warnWithMessage('ERROR: ' + str + ' require an associated index file.');
            }

        }
        // A subset of the files are index files
        else {

            indexFiles = {};
            _.each(result, function (f) {
                var parts,
                    key;

                parts = f.name.slice(0, -4).split('.');
                if (_.size(parts) > 1) {
                    parts.pop();
                    key = parts.join('.');
                } else {
                    key = parts;
                }

                indexFiles[ key ] = f;
            });

            // if no data files then ALL index files have missing associated data files.
            if (undefined === dataFiles) {

                blurb_0 = _.map(indexFiles, function (m) {
                        return m.name;
                    }).join(' ') + (_.size(missing) > 1 ? ' are' : ' is');
                blurb_0 += ' missing an associated data file.';

                this.warnWithMessage('ERROR: ' + blurb_0);
                return;

            }
            // find subset of index files that lack associated data files.
            else {

                missingIndexFiles = _.filter(dataFiles, function (val, key) {
                    return (false === igv.TrackFileLoad.keyToIndexExtension[ val.indexExtensionLookup ].optional) && (undefined === indexFiles[ key ]);
                });

                blurb_0 = '';
                if (_.size(missingIndexFiles) > 0) {
                    blurb_0 = _.map(missingIndexFiles, function (m) {
                        return m.file.name;
                    }).join(' ') + (_.size(missingIndexFiles) > 1 ? ' are' : ' is');
                    blurb_0 += ' missing an associated index file.';
                }

                missingDataFiles = _.filter(indexFiles, function (val, key) {
                    var lookup;
                    lookup = igv.getExtension({ url: val });
                    return undefined === dataFiles[ key ] && false === igv.TrackFileLoad.keyToIndexExtension[ val.indexExtensionLookup ].optional;
                });

                blurb_1 = '';
                if (_.size(missingDataFiles) > 0) {
                    blurb_1 = _.map(missingDataFiles, function (m) { return m.name; }).join(' ') + (_.size(missingDataFiles) > 1 ? ' are' : ' is');
                    blurb_1 += ' missing an associated data file.';
                }

                missing = _.union(missingDataFiles, missingIndexFiles);
            }

            // if missing data files are found present a warning
            if (_.size(missing) > 0) {
                str = blurb_0 + ' ' + blurb_1;
                this.warnWithMessage('ERROR: ' + str);
            }
            // we are good to go with 1:1 data-file:index-file
            else {

                configurations = _.map(_.keys(dataFiles), function (key) {

                    if (indexFiles[ key ]) {
                        return { url: dataFiles[ key ].file, indexURL: indexFiles[ key ] }
                    } else {
                        return { url: dataFiles[ key ].file, indexed: false }
                    }

                });

                igv.browser.loadTracksWithConfigList(configurations);
                doDismiss(this);
            }
        }



        return;




        // OLD STUFF BELOW





        extension = igv.getExtension({ url: files });
        if (undefined === this.file && igv.TrackFileLoad.isIndexFile(files)) {
            this.warnWithMessage('ERROR: Must load data file.');
        } else if (false === igv.TrackFileLoad.isIndexFile(files) && false === igv.TrackFileLoad.isIndexable(files)) {
            igv.browser.loadTrack( { url: files } );
            doDismiss(this);
        } else if (false === igv.TrackFileLoad.isIndexFile(files)) {

            this.file = files;

            this.$url_input_container.hide();

            this.$file_input.hide();
            this.$file_input_blurb.hide();

            this.$index_file_input.show();
            this.$index_file_input_blurb.show();

            this.showFileIcons();

            if ('bam' !== extension) {
                $('#file_input_ok').show();
                $('#file_input_cancel').show();
            } else {
                this.$index_file_input_blurb.find('strong').text('Choose associated index file');
            }

        } else if (igv.TrackFileLoad.isIndexFile(files)) {
            this.indexFile = files;

            this.$index_file_input.hide();
            this.$index_file_input_blurb.hide();

            this.$fa_index_file.removeClass('fa-file-o');
            this.$fa_index_file.addClass('fa-file');

            if ('bai' === extension) {
                $('#file_input_ok').show();
                $('#file_input_cancel').show();
            }
        }

    };

    function drag_drop_surface(trackFileLoader, $parent) {

        var $e,
            $ok,
            $cancel;

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
                trackFileLoader.loadLocalFiles(e.originalEvent.dataTransfer.files);
            });


        trackFileLoader.$file_icon_container = $('<div class="igv-drag-drop-file-icon-container">');
        trackFileLoader.$drag_drop_surface.append(trackFileLoader.$file_icon_container);

        //
        trackFileLoader.$fa_file = $('<i class="fa fa-5x fa-file igv-drag-drop-fa-file" aria-hidden="true">');
        trackFileLoader.$file_icon_container.append(trackFileLoader.$fa_file);

        //
        trackFileLoader.$fa_index_file = $('<i class="fa fa-5x fa-file-o igv-drag-drop-fa-file-o" aria-hidden="true">');
        trackFileLoader.$file_icon_container.append(trackFileLoader.$fa_index_file);

        trackFileLoader.hideFileIcons();
        // trackFileLoader.$file_icon_container.hide();


        // load local file container
        trackFileLoader.$file_input_container = $('<div class="igv-drag-drop-file-input">');
        trackFileLoader.$drag_drop_surface.append(trackFileLoader.$file_input_container);

        // load local file
        trackFileLoader.$file_input = $('<input id="igv-track-file-input" class="igv-track-file-input-css" type="file" name="files[]" data-multiple-caption="{count} files selected" multiple="">');
        trackFileLoader.$file_input_container.append(trackFileLoader.$file_input);

        trackFileLoader.$file_input.on( 'change', function( e ) {
            trackFileLoader.loadLocalFiles(e.target.files)
        });

        blurb(trackFileLoader.$file_input_container, 'Choose data file', 'igv-track-file-input', 'load-file-blurb');
        trackFileLoader.$file_input_blurb = trackFileLoader.$file_input_container.find('#load-file-blurb');

        // load local index file
        trackFileLoader.$index_file_input = $('<input id="igv-track-index-file-input" class="igv-track-file-input-css" type="file" name="files[]" data-multiple-caption="{count} files selected" multiple="">');
        trackFileLoader.$file_input_container.append(trackFileLoader.$index_file_input);

        trackFileLoader.$index_file_input.on( 'change', function( e ) {
            trackFileLoader.loadLocalFiles(e.target.files);
        });

        blurb(trackFileLoader.$file_input_container, 'Choose optional associated index file', 'igv-track-index-file-input', 'load-local-index-file-blurb');
        trackFileLoader.$index_file_input_blurb = trackFileLoader.$file_input_container.find('#load-local-index-file-blurb');

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

            var extension;

            extension = igv.getExtension({ url: trackFileLoader.file });
            if (undefined === trackFileLoader.indexFile && false === igv.TrackFileLoad.keyToIndexExtension[ extension ].optional) {
                trackFileLoader.warnWithMessage('ERROR. ' + extension + ' files require an index file.');
            } else if (undefined === trackFileLoader.indexFile && true === igv.TrackFileLoad.keyToIndexExtension[ extension ].optional) {
                igv.browser.loadTrack( { url: trackFileLoader.file, indexURL: undefined, indexed: false } );
                doDismiss(trackFileLoader);
            } else {
                igv.browser.loadTrack( { url: trackFileLoader.file, indexURL: trackFileLoader.indexFile } );
                doDismiss(trackFileLoader);
            }
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

        function blurb($parent, phrase, input_id, label_id) {
            var $label,
                $choose_file;

            // load local file - blurb
            $label = $('<label>');
            $parent.append($label);

            $label.attr('for', input_id);
            $label.attr('id', label_id);

            $choose_file = $('<strong>');
            $choose_file.text(phrase);
            $label.append($choose_file);

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

        // dismiss warning message
        $e = $('<div id="warning-message">');
        $warning.append($e);

        // dismiss warning container
        $e = $('<div id="warning-dismiss">');
        $warning.append($e);

        // dismiss warning
        $fa = $('<i class="fa fa-times-circle">');
        $e.append($fa);

        $fa.on('click', function () {
            $warning.hide();
        });

        $warning.hide();

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
        trackFileLoader.$url_input = $('<input class="igv-drag-and-drop-url-input" placeholder="enter data file URL">');
        trackFileLoader.$url_input_container.append(trackFileLoader.$url_input);

        trackFileLoader.$url_input.on( 'change', function( e ) {
            var _url = $(this).val(),
                extension,
                str;

            if (igv.TrackFileLoad.isIndexFile(_url)) {
                trackFileLoader.warnWithMessage('Error. Must enter data file URL.');
                $(this).val(undefined);
            } else if (false === igv.TrackFileLoad.isIndexable(_url)) {

                igv.browser.loadTrack( { url: _url } );
                $(this).val(undefined);
                doDismiss(trackFileLoader);
            } else {

                extension = igv.getExtension({ url: _url });
                str = ('bam' === extension) ? 'Enter url to an associated index file' : 'Optionally enter url to an associated index file';
                trackFileLoader.$index_url_input.attr('placeholder', str);


                trackFileLoader.$file_input_container.hide();
                trackFileLoader.$or.hide();

                trackFileLoader.$url_input_feedback.text( ('.../' + _url.split("/").pop()) );
                trackFileLoader.$url_input_feedback.show();

                $(this).hide();

                trackFileLoader.$index_url_input.val(undefined);
                trackFileLoader.$index_url_input.show();

                if ('bam' !== extension) {
                    $ok.show();
                    $cancel.show();
                }

            }

        });

        // visual feedback that url was successfully input
        trackFileLoader.$url_input_feedback = $('<div class="igv-drag-and-drop-url-input-feedback" >');
        trackFileLoader.$url_input_container.append(trackFileLoader.$url_input_feedback);
        trackFileLoader.$url_input_feedback.hide();


        // index url input
        trackFileLoader.$index_url_input = $('<input class="igv-drag-and-drop-url-input">');
        trackFileLoader.$index_url_input.hide();
        trackFileLoader.$url_input_container.append(trackFileLoader.$index_url_input);

        trackFileLoader.$index_url_input.on( 'change', function( e ) {
            var _url = $(this).val(),
                extension;

            if (false === igv.TrackFileLoad.isIndexFile(_url)) {
                trackFileLoader.warnWithMessage('ERROR. Must enter index file URL.');
                $(this).val(undefined);
            } else {
                trackFileLoader.$index_url_input_feedback.text( ('.../' + _url.split("/").pop()) );
                trackFileLoader.$index_url_input_feedback.show();
                $(this).hide();

                extension = igv.getExtension({ url: _url });
                if ('bai' === extension) {
                    $ok.show();
                    $cancel.show();
                }
            }
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
            var extension,
                _url,
                _indexURL;

            _url = ("" === trackFileLoader.$url_input.val()) ? undefined : trackFileLoader.$url_input.val();
            _indexURL = ("" === trackFileLoader.$index_url_input.val()) ? undefined : trackFileLoader.$index_url_input.val();

            extension = igv.getExtension({ url: _url });
            if (undefined === _indexURL && false === igv.TrackFileLoad.keyToIndexExtension[ extension ].optional) {
                trackFileLoader.warnWithMessage('ERROR. ' + extension + ' files require an index file URL.');
            } else if (undefined === _indexURL && true === igv.TrackFileLoad.keyToIndexExtension[ extension ].optional) {
                igv.browser.loadTrack( { url: _url, indexURL: undefined, indexed: false } );
                doDismiss(trackFileLoader);
            } else {
                igv.browser.loadTrack( { url: _url, indexURL: _indexURL } );
                doDismiss(trackFileLoader);
            }

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
        trackFileLoader.hideFileIcons();

        $('#file_input_ok').hide();
        $('#file_input_cancel').hide();

        trackFileLoader.$file_input.show();
        trackFileLoader.$file_input_blurb.show();

        trackFileLoader.$index_file_input.hide();
        trackFileLoader.$index_file_input_blurb.hide();

        trackFileLoader.$fa_index_file.removeClass('fa-file');
        trackFileLoader.$fa_index_file.addClass('fa-file-o');

        trackFileLoader.$fa_index_file.removeClass('fa-file-o');
        trackFileLoader.$fa_index_file.addClass('fa-file');

        trackFileLoader.$file_input_container.show();

        trackFileLoader.file = undefined;
        trackFileLoader.indexFile = undefined;

        trackFileLoader.$or.show();

        // url show/hide
        trackFileLoader.$url_input_container.show();

        $('#url_input_ok').hide();
        $('#url_input_cancel').hide();

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
