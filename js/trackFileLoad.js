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

    igv.TrackFileLoad = function ($buttonParent, $widgetParent) {

        var self = this;

        // present drag & drop widget
        this.$presentationButton = $("<div>", { id:"igv-drag-and-drop-presentation-button", class:'igv-nav-bar-button' });
        $buttonParent.append(this.$presentationButton);

        this.$presentationButton.text('Load Track');

        this.$presentationButton.on('click', function () {

            if (self.$container.is(':visible')) {
                doDismiss.call(self);
            } else {
                doPresent.call(self);
            }

        });

        // drag & drop widget
        this.$container = $('<div class="igv-drag-drop-container">');
        $widgetParent.append(this.$container);

        // drag & drop surface
        drag_drop_surface.call(this, this.$container);

        // warning
        this.$warning = createWarning();
        this.$container.append(this.$warning);

        // shim
        this.$container.append($('<div class="igv-drag-drop-shim">'));

        // dismiss drag & drop widget
        this.$container.append(dismissButton());

        this.$container.hide();

        function dismissButton() {

            var $container,
                $fa;

            $container = $('<div class="igv-drag-and-drop-close-container">');
            $container.append($fa);

            $container.on('click', function () {
                doDismiss.call(self);
            });


            return $container;

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
                if (false === igv.TrackFileLoad.keyToIndexExtension[dataFile.indexExtensionLookup].optional) {
                    keysMissing.push(key);
                }
            });

            // render files that don't require and index file
            keysPresent = _.difference(_.keys(dataFiles), keysMissing);
            dataF = (_.size(keysPresent) > 0) ? _.pick(dataFiles, keysPresent) : undefined;

            if (dataF) {
                configurations = _.map(_.pluck(dataF, 'file'), function (f) {
                    return {url: f, indexed: false}
                });
                igv.browser.loadTrackList(configurations);
            }

            // notify user about missing index files
            if (_.size(keysMissing) > 0) {

                filenames = _.map(keysMissing, function (key) {
                    return dataFiles[key].file.name;
                });

                str = filenames.join(' and ');
                this.warnWithMessage('ERROR: ' + str + ' require an associated index file.');
            } else {
                doDismiss.call(this);
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
            blurb_1 = ( ifMissingDf) ? ifMissingDf.blurb : undefined;
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

                    if (indexF && indexF[key]) {
                        return {url: dataF[key].file, indexURL: indexF[key]}
                    } else {
                        return {url: dataF[key].file, indexed: false}
                    }

                });

                igv.browser.loadTrackList(configurations);
            }

            if (str) {
                this.warnWithMessage('ERROR: ' + str);
            } else {
                doDismiss.call(this);
            }

        }

    };

    igv.TrackFileLoad.prototype.warnWithMessage = function (message) {
        this.$warning.find('#warning-message').text(message);
        this.$warning.show();
    };

    igv.TrackFileLoad.keyToIndexExtension =
        {
            bam: {extension: 'bai', optional: false},
            any: {extension: 'idx', optional: true},
            gz: {extension: 'tbi', optional: true}
        };

    igv.TrackFileLoad.indexExtensionToKey = _.invert(_.mapObject(igv.TrackFileLoad.keyToIndexExtension, function (val) {
        return val.extension;
    }));

    igv.TrackFileLoad.isIndexFile = function (fileOrURL) {
        var extension;

        extension = igv.getExtension({url: fileOrURL});
        return _.contains(_.keys(igv.TrackFileLoad.indexExtensionToKey), extension);
    };

    igv.TrackFileLoad.isIndexable = function (fileOrURL) {

        var extension;

        if (igv.TrackFileLoad.isIndexFile(fileOrURL)) {
            return false;
        } else {
            extension = igv.getExtension({url: fileOrURL});
            return (extension !== 'wig' && extension !== 'seg');
        }

    };

    function indexFilesMissingAssociatedDataFilesAndWarningBlurb(dataFiles, indexFiles) {
        var keysMissing,
            filenames,
            blurb;

        keysMissing = [];
        _.each(indexFiles, function (indexFile, key) {

            // if an associated data file is not found
            if (undefined === dataFiles[key]) {
                keysMissing.push(key);
            }
        });

        blurb = '';
        if (_.size(keysMissing) > 0) {
            filenames = _.map(keysMissing, function (key) {
                return indexFiles[key].name;
            });
            blurb = filenames.join(' and ');
            blurb += ' require an associated data file.';
            return {missing: keysMissing, blurb: blurb};
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
            if ((false === igv.TrackFileLoad.keyToIndexExtension[dataFile.indexExtensionLookup].optional) && indexFileIsPresent && (undefined === indexFiles[key])) {
                keysMissing.push(key);
            }

        });

        blurb = '';
        if (_.size(keysMissing) > 0) {
            filenames = _.map(keysMissing, function (key) {
                return dataFiles[key].file.name;
            });

            blurb = filenames.join(' and ');
            blurb += ' require an associated index file.';
            return {missing: keysMissing, blurb: blurb};
        } else {
            return undefined;
        }

    }

    function extractIndexFiles(files) {
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

                indexFiles[key] = f;
            });

            return indexFiles;
        } else {
            return undefined;
        }

    }

    function extractDataFiles(files) {

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
                if ('gz' === _.last(parts)) {
                    parts.pop();
                }
                parts.pop();
                key = parts.join('.');

                extension = igv.getExtension({url: f});
                lookupKey = (_.contains(_.keys(igv.TrackFileLoad.keyToIndexExtension), extension)) ? extension : 'any';

                dataFiles[key] =
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

    function drag_drop_surface($parent) {

        var self = this,
            $e,
            $ok,
            $cancel;

        this.$drag_drop_surface = $('<div class="igv-drag-drop-surface">');
        $parent.append(this.$drag_drop_surface);

        this.$drag_drop_surface
            .on('drag dragstart dragend dragover dragenter dragleave drop', function (e) {
                e.preventDefault();
                e.stopPropagation();
            })
            .on('dragover dragenter', function () {
                $('.igv-drag-drop-container').addClass('is-dragover');
            })
            .on('dragleave dragend drop', function () {
                $('.igv-drag-drop-container').removeClass('is-dragover');
            })
            .on('drop', function (e) {
                self.loadLocalFiles(e.originalEvent.dataTransfer.files);
            });

        // load local file container
        this.$file_input_container = $('<div class="igv-drag-drop-file-input">');
        this.$drag_drop_surface.append(this.$file_input_container);

        // load local file
        this.$file_input = $('<input id="igv-track-file-input" class="igv-track-file-input-css" type="file" name="files[]" data-multiple-caption="{count} files selected" multiple="">');
        this.$file_input_container.append(this.$file_input);

        this.$file_input.on('change', function (e) {
            self.loadLocalFiles(e.target.files)
        });

        blurb(this.$file_input_container, 'Choose file(s)', 'igv-track-file-input', 'load-file-blurb');
        this.$file_input_blurb = this.$file_input_container.find('#load-file-blurb');

        // ok
        $ok = $('<div id="file_input_ok" class="igv-drag-drop-ok">');
        this.$drag_drop_surface.append($ok);
        $ok.text('ok');
        $ok.hide();

        $ok.on('click', function (e) {

            var extension;

            extension = igv.getExtension({url: self.file});
            if (undefined === self.indexFile && false === igv.TrackFileLoad.keyToIndexExtension[extension].optional) {
                self.warnWithMessage('ERROR. ' + extension + ' files require an index file.');
            } else if (undefined === self.indexFile && true === igv.TrackFileLoad.keyToIndexExtension[extension].optional) {
                igv.browser.loadTrack({url: self.file, indexURL: undefined, indexed: false});
                doDismiss.call(self);
            } else {
                igv.browser.loadTrack({url: self.file, indexURL: self.indexFile});
                doDismiss.call(self);
            }
        });

        // cancel
        $cancel = $('<div id="file_input_cancel" class="igv-drag-drop-cancel">');
        this.$drag_drop_surface.append($cancel);
        $cancel.text('cancel');
        $cancel.hide();

        $cancel.on('click', function (e) {
            doDismiss.call(self);
        });

        // load URL
        url_input_container.call(this, this.$drag_drop_surface);

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
        $fa = $('<i>');
        $fa.append(igv.createIcon("times-circle"));
        $e.append($fa);

        $fa.on('click', function () {
            $warning.hide();
        });

        $warning.hide();

        return $warning;
    }

    function url_input_container($parent) {

        var self = this,
            $ok,
            $cancel;

        // url input container
        this.$url_input_container = $('<div class="igv-drag-and-drop-url-input-container">');
        $parent.append(this.$url_input_container);

        this.$or = $('<div>');
        this.$url_input_container.append(this.$or);
        this.$or.text('or');

        // url input
        this.$url_input = $('<input class="igv-drag-and-drop-url-input" placeholder="enter data file URL">');
        this.$url_input_container.append(this.$url_input);

        this.$url_input.on('change', function (e) {
            var _url;

            _url = $(this).val();
            if (igv.TrackFileLoad.isIndexFile(_url)) {
                self.warnWithMessage('Error. Must enter data URL.');
                $(this).val(undefined);
            } else if (false === igv.TrackFileLoad.isIndexable(_url)) {
                igv.browser.loadTrack({url: _url, indexed: false});
                $(this).val(undefined);
                doDismiss.call(self);
            } else {

                self.$file_input_container.hide();
                self.$or.hide();

                self.$url_input_feedback.text((_url.split("/").pop()));
                self.$url_input_feedback.show();
                $(this).hide();

                $ok.show();
                $cancel.show();
            }

        });

        // visual feedback that url was successfully input
        this.$url_input_feedback = $('<div class="igv-drag-and-drop-url-input-feedback" >');
        this.$url_input_container.append(this.$url_input_feedback);
        this.$url_input_feedback.hide();


        // index url input
        this.$index_url_input = $('<input class="igv-drag-and-drop-url-input" placeholder="enter associated index file URL">');
        this.$url_input_container.append(this.$index_url_input);

        this.$index_url_input.on('change', function (e) {
            var _url;

            _url = $(this).val();
            if (false === igv.TrackFileLoad.isIndexFile(_url)) {
                self.warnWithMessage('ERROR. Must enter index URL.');
                $(this).val(undefined);
            } else {
                self.$index_url_input_feedback.text((_url.split("/").pop()));
                self.$index_url_input_feedback.show();
                $(this).hide();
            }
        });

        // visual feedback that index url was successfully input
        this.$index_url_input_feedback = $('<div class="igv-drag-and-drop-url-input-feedback" >');
        this.$url_input_container.append(this.$index_url_input_feedback);
        this.$index_url_input_feedback.hide();

        // ok
        $ok = $('<div  id="url_input_ok" class="igv-drag-drop-ok">');
        this.$url_input_container.append($ok);
        $ok.text('ok');
        $ok.hide();

        $ok.on('click', function (e) {
            var _url,
                _indexURL,
                extension,
                key;

            _url = ("" === self.$url_input.val()      ) ? undefined : self.$url_input.val();
            _indexURL = ("" === self.$index_url_input.val()) ? undefined : self.$index_url_input.val();

            extension = igv.getExtension({url: _url});
            key = (igv.TrackFileLoad.keyToIndexExtension[extension]) ? extension : 'any';
            if (undefined === _indexURL && false === igv.TrackFileLoad.keyToIndexExtension[key].optional) {
                self.warnWithMessage('ERROR. A ' + extension + ' data URL requires an associated index URL.');
            } else if (undefined === _url) {
                self.warnWithMessage('ERROR. A data URL must be entered.');
            } else if (undefined === _indexURL && true === igv.TrackFileLoad.keyToIndexExtension[key].optional) {
                igv.browser.loadTrack({url: _url, indexURL: undefined, indexed: false});
                doDismiss.call(self);
            } else {
                igv.browser.loadTrack({url: _url, indexURL: _indexURL});
                doDismiss.call(self);
            }

        });

        // cancel
        $cancel = $('<div  id="url_input_cancel" class="igv-drag-drop-cancel">');
        this.$url_input_container.append($cancel);
        $cancel.text('cancel');
        $cancel.hide();

        $cancel.on('click', function (e) {
            doDismiss.call(self);
        });
    }

    function doDismiss() {

        $('#file_input_ok').hide();
        $('#file_input_cancel').hide();

        this.$file_input.show();
        this.$file_input_blurb.show();

        this.$file_input_container.show();

        this.file = undefined;
        this.indexFile = undefined;

        this.$or.show();

        // url show/hide
        this.$url_input_container.show();

        $('#url_input_ok').hide();
        $('#url_input_cancel').hide();

        this.$url_input.show();
        this.$url_input.val(undefined);
        this.$url_input_feedback.hide();

        this.$index_url_input.show();
        this.$index_url_input.val(undefined);
        this.$index_url_input_feedback.hide();

        this.$warning.hide();

        this.$container.hide();
    }

    function doPresent() {
        this.$container.show();
    }

    return igv;
})(igv || {});
