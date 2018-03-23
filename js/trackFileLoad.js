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

            $fa = $('<i class="fas">');

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
        var extension;

        extension = igv.getExtension({ url: fileOrURL });
        return _.contains(_.keys(igv.TrackFileLoad.indexExtensionToKey), extension);
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

        var dataFiles,
            indexFiles,
            missing,
            configurations,
            ifMissingDf,
            dfMissingIf,
            dataF,
            indexF,
            keysMissing,
            keysPresent,
            filenames,
            str,
            blurb_0,
            blurb_1;

        dataFiles = extractDataFiles(files);

        indexFiles = extractIndexFiles(files);

        if (undefined === dataFiles && undefined === indexFiles) {
            this.warnWithMessage('ERROR: ' + 'No data or index file(s) provided.');
        }
        // if there are no index files
        else if (undefined === indexFiles) {

            keysMissing = [];
            _.each(dataFiles, function (dataFile, key) {
                // if data file requires an associated index file
                if (false === igv.TrackFileLoad.keyToIndexExtension[ dataFile.indexExtensionLookup ].optional) {
                    keysMissing.push(key);
                }
            });

            // render files that don't require and index file
            keysPresent = _.difference(_.keys(dataFiles), keysMissing);
            dataF = (_.size(keysPresent) > 0) ? _.pick(dataFiles, keysPresent) : undefined;

            if (dataF) {
                configurations = _.map(_.pluck(dataF, 'file'), function (f) {
                    return { url: f, indexed: false }
                });
                igv.browser.loadTracksWithConfigList(configurations);
            }

            // notify user about missing index files
            if (_.size(keysMissing) > 0) {

                filenames = _.map(keysMissing, function (key) {
                    return dataFiles[ key ].file.name;
                });

                str = filenames.join(' and ');
                this.warnWithMessage('ERROR: ' + str + ' require an associated index file.');
            } else {
                doDismiss(this);
            }

        }
        // No data files present. All index files are missing their associated data files
        else if (undefined === dataFiles) {

            blurb_0 = _.map(indexFiles, function (m) {
                    return m.name;
                }).join(' and ');

            blurb_0 += ' require an associated data file.';

            this.warnWithMessage('ERROR: ' + blurb_0);
        }
        // We have a mix of data and index files.
        else {

            dfMissingIf = dataFilesMissingAssociatedIndexFilesAndWarningBlurb(dataFiles, indexFiles);
            ifMissingDf = indexFilesMissingAssociatedDataFilesAndWarningBlurb(dataFiles, indexFiles);

            str = undefined;
            blurb_0 = (dfMissingIf) ? dfMissingIf.blurb : undefined;
            blurb_1 = ( ifMissingDf) ?  ifMissingDf.blurb : undefined;
            if (blurb_0 && blurb_1) {
                str = blurb_0 + ' ' + blurb_1;
            } else if (blurb_0) {
                str = blurb_0;
            } else if (blurb_1) {
                str = blurb_1;
            }

            keysPresent = (dfMissingIf) ? _.difference(_.keys(dataFiles), dfMissingIf.missing) : _.keys(dataFiles);
            dataF = (_.size(keysPresent) > 0) ? _.pick(dataFiles, keysPresent) : undefined;

            keysPresent = (ifMissingDf) ? _.difference(_.keys(indexFiles), ifMissingDf.missing) : _.keys(indexFiles);
            indexF = (_.size(keysPresent) > 0) ? _.pick(indexFiles, keysPresent) : undefined;

            if (dataF) {
                configurations = _.map(_.keys(dataF), function (key) {

                    if (indexF && indexF[ key ]) {
                        return { url: dataF[ key ].file, indexURL: indexF[ key ] }
                    } else {
                        return { url: dataF[ key ].file, indexed: false }
                    }

                });

                igv.browser.loadTracksWithConfigList(configurations);
            }

            if (str) {
                this.warnWithMessage('ERROR: ' + str);
            } else {
                doDismiss(this);
            }

        }

    };

    function indexFilesMissingAssociatedDataFilesAndWarningBlurb(dataFiles, indexFiles) {
        var keysMissing,
            filenames,
            blurb;

        keysMissing = [];
        _.each(indexFiles, function (indexFile, key) {

            // if an associated data file is not found
            if (undefined === dataFiles[ key ]) {
                keysMissing.push(key);
            }
        });

        blurb = '';
        if (_.size(keysMissing) > 0) {
            filenames = _.map(keysMissing, function (key) {
                return indexFiles[ key ].name;
            });
            blurb = filenames.join(' and ');
            blurb += ' require an associated data file.';
            return { missing: keysMissing, blurb: blurb };
        } else {
            return undefined;
        }

    }

    function dataFilesMissingAssociatedIndexFilesAndWarningBlurb(dataFiles, indexFiles) {
        var keysMissing,
            filenames,
            missing,
            blurb;


        keysMissing = [];
        _.each(dataFiles, function (dataFile, key) {

            var indexFileIsPresent = (undefined !== indexFiles);

            // if this data file requires an associated index file and none is found
            if ((false === igv.TrackFileLoad.keyToIndexExtension[ dataFile.indexExtensionLookup ].optional) && indexFileIsPresent && (undefined === indexFiles[ key ])) {
                keysMissing.push(key);
            }

        });

        blurb = '';
        if (_.size(keysMissing) > 0) {
            filenames = _.map(keysMissing, function (key) {
                return dataFiles[ key ].file.name;
            });

            blurb = filenames.join(' and ');
            blurb += ' require an associated index file.';
            return { missing: keysMissing, blurb: blurb };
        } else {
            return undefined;
        }

    }

    function extractIndexFiles (files) {
        var result,
            indexFiles;

        result = _.filter(files, function (f) {
            return igv.TrackFileLoad.isIndexFile(f);
        });

        if (_.size(result) > 0) {
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

            return indexFiles;
        } else {
            return undefined;
        }

    }

    function extractDataFiles (files) {

        var result,
            dataFiles;

        result = _.filter(files, function (f) {
            return !igv.TrackFileLoad.isIndexFile(f);
        });

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

                dataFiles[ key ] =
                    {
                        file: f,
                        extension: extension,
                        indexExtensionLookup: lookupKey
                    };
            });

            return dataFiles;
        } else {
            return undefined;
        }

    }

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
                $('.igv-drag-drop-container').addClass( 'is-dragover' );
            })
            .on( 'dragleave dragend drop', function() {
                $('.igv-drag-drop-container').removeClass( 'is-dragover' );
            })
            .on( 'drop', function( e ) {
                trackFileLoader.loadLocalFiles(e.originalEvent.dataTransfer.files);
            });

        // load local file container
        trackFileLoader.$file_input_container = $('<div class="igv-drag-drop-file-input">');
        trackFileLoader.$drag_drop_surface.append(trackFileLoader.$file_input_container);

        // load local file
        trackFileLoader.$file_input = $('<input id="igv-track-file-input" class="igv-track-file-input-css" type="file" name="files[]" data-multiple-caption="{count} files selected" multiple="">');
        trackFileLoader.$file_input_container.append(trackFileLoader.$file_input);

        trackFileLoader.$file_input.on( 'change', function( e ) {
            trackFileLoader.loadLocalFiles(e.target.files)
        });

        blurb(trackFileLoader.$file_input_container, 'Choose file(s)', 'igv-track-file-input', 'load-file-blurb');
        trackFileLoader.$file_input_blurb = trackFileLoader.$file_input_container.find('#load-file-blurb');

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
            $e.text(' or drop file(s) here');
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
        $fa = $('<i class="fas fa-times-circle">');
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
            var _url,
                extension,
                str;

            _url = $(this).val();
            if (igv.TrackFileLoad.isIndexFile(_url)) {
                trackFileLoader.warnWithMessage('Error. Must enter data URL.');
                $(this).val(undefined);
            } else if (false === igv.TrackFileLoad.isIndexable(_url)) {
                igv.browser.loadTrack( { url: _url, indexed: false } );
                $(this).val(undefined);
                doDismiss(trackFileLoader);
            } else {

                trackFileLoader.$file_input_container.hide();
                trackFileLoader.$or.hide();

                trackFileLoader.$url_input_feedback.text( (_url.split("/").pop()) );
                trackFileLoader.$url_input_feedback.show();
                $(this).hide();

                $ok.show();
                $cancel.show();
            }

        });

        // visual feedback that url was successfully input
        trackFileLoader.$url_input_feedback = $('<div class="igv-drag-and-drop-url-input-feedback" >');
        trackFileLoader.$url_input_container.append(trackFileLoader.$url_input_feedback);
        trackFileLoader.$url_input_feedback.hide();


        // index url input
        trackFileLoader.$index_url_input = $('<input class="igv-drag-and-drop-url-input" placeholder="enter associated index file URL">');
        trackFileLoader.$url_input_container.append(trackFileLoader.$index_url_input);

        trackFileLoader.$index_url_input.on( 'change', function( e ) {
            var _url;

            _url = $(this).val();
            if (false === igv.TrackFileLoad.isIndexFile(_url)) {
                trackFileLoader.warnWithMessage('ERROR. Must enter index URL.');
                $(this).val(undefined);
            } else {
                trackFileLoader.$index_url_input_feedback.text( (_url.split("/").pop()) );
                trackFileLoader.$index_url_input_feedback.show();
                $(this).hide();
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
            var _url,
                _indexURL,
                extension,
                key;

                 _url = ("" === trackFileLoader.$url_input.val()      ) ? undefined : trackFileLoader.$url_input.val();
            _indexURL = ("" === trackFileLoader.$index_url_input.val()) ? undefined : trackFileLoader.$index_url_input.val();

            extension = igv.getExtension({ url: _url });
            key = (igv.TrackFileLoad.keyToIndexExtension[ extension ]) ? extension : 'any';
            if (undefined === _indexURL && false === igv.TrackFileLoad.keyToIndexExtension[ key ].optional) {
                trackFileLoader.warnWithMessage('ERROR. A ' + extension + ' data URL requires an associated index URL.');
            } else if (undefined === _url ) {
                trackFileLoader.warnWithMessage('ERROR. A data URL must be entered.');
            } else if (undefined === _indexURL && true === igv.TrackFileLoad.keyToIndexExtension[ key ].optional) {
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

        $('#file_input_ok').hide();
        $('#file_input_cancel').hide();

        trackFileLoader.$file_input.show();
        trackFileLoader.$file_input_blurb.show();

        trackFileLoader.$file_input_container.show();

        trackFileLoader.file = undefined;
        trackFileLoader.indexFile = undefined;

        trackFileLoader.$or.show();

        // url show/hide
        trackFileLoader.$url_input_container.show();

        $('#url_input_ok').hide();
        $('#url_input_cancel').hide();

        trackFileLoader.$url_input.show();
        trackFileLoader.$url_input.val(undefined);
        trackFileLoader.$url_input_feedback.hide();

        trackFileLoader.$index_url_input.show();
        trackFileLoader.$index_url_input.val(undefined);
        trackFileLoader.$index_url_input_feedback.hide();

        trackFileLoader.$warning.hide();

        trackFileLoader.$container.hide();
    }

    function doPresent(trackFileLoader) {
        trackFileLoader.$container.show();
    }

    return igv;
})(igv || {});
