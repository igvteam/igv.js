/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 The Regents of the University of California
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
 * Created by dat on 4/8/18.
 */
var igv = (function (igv) {
    igv.FileLoadWidget = function (config) {
        var self = this,
            obj,
            $header,
            $div,
            classes;

        this.config = config;
        this.$parent = config.$widgetParent;

        this.fileLoadManager = new igv.FileLoadManager(this);

        // file load navbar button
        if (false === config.embed) {
            this.$presentationButton = $("<div>", { id:"igv-drag-and-drop-presentation-button", class:'igv-nav-bar-button' });
            config.$buttonParent.append(this.$presentationButton);

            this.$presentationButton.text('Load Track');

            this.$presentationButton.on('click', function () {

                if (self.$container.is(':visible')) {
                    self.dismiss();
                } else {
                    self.present();
                }

            });
        }

        // file load widget
        classes = 'igv-file-load-widget-container' + ' ' + (config.embed ? 'igv-file-load-widget-container-embed-position' : 'igv-file-load-widget-container-igvjs-position');
        this.$container = $('<div>', { class: classes });
        this.$parent.append(this.$container);

        if (false === config.embed) {

            // header
            $header = $("<div>", { id:"igv-file-load-widget-header" });
            this.$container.append($header);
            // header - dismiss button
            igv.attachDialogCloseHandlerWithParent($header, function () {
                self.dismiss();
            });

        }

        // local data/index
        obj =
            {
                dataTitle: 'Local data file',
                indexTitle: 'Local index file'
            };
        createInputContainer.call(this, this.$container, obj);

        // url data/index
        obj =
            {
                doURL: true,
                dataTitle: 'Data URL',
                indexTitle: 'Index URL'
            };
        createInputContainer.call(this, this.$container, obj);

        // error message container
        this.$error_message = $("<div>", { id:"igv-flw-error-message-container" });
        this.$container.append(this.$error_message);
        // error message
        this.$error_message.append($("<div>", { id:"igv-flw-error-message" }));
        // error dismiss button
        igv.attachDialogCloseHandlerWithParent(this.$error_message, function () {
            self.dismissErrorMessage();
        });
        this.dismissErrorMessage();

        if (false === config.embed) {

            // ok | cancel - container
            $div = $("<div>", { id:"igv-file-load-widget-ok-cancel" });
            this.$container.append($div);

            // ok
            this.$ok = $('<div>');
            $div.append(this.$ok);
            this.$ok.text('OK');
            this.$ok.on('click', function () {
                self.okHandler();
            });

            // cancel
            this.$cancel = $('<div>');
            $div.append(this.$cancel);
            this.$cancel.text('Cancel');
            this.$cancel.on('click', function () {
                self.dismiss();
            });

            this.$container.draggable({ handle: $header.get(0) });

            this.$container.hide();

        }

    };

    igv.FileLoadWidget.prototype.okHandler = function () {

        var obj;
        obj = this.fileLoadManager.trackLoadConfiguration();
        if (obj) {
            igv.browser.loadTrackList( [ obj ] );
            this.dismiss();
        }

    };

    igv.FileLoadWidget.prototype.presentErrorMessage = function(message) {
        this.$error_message.find('#igv-flw-error-message').text(message);
        this.$error_message.show();
    };

    igv.FileLoadWidget.prototype.dismissErrorMessage = function() {
        this.$error_message.hide();
        this.$error_message.find('#igv-flw-error-message').text('');
    };

    function createInputContainer($parent, config) {
        var $container,
            $input_data_row,
            $input_index_row,
            $label;

        // container
        $container = $("<div>", { class:"igv-flw-input-container" });
        $parent.append($container);


        // data
        $input_data_row = $("<div>", { class:"igv-flw-input-row" });
        $container.append($input_data_row);
        // label
        $label = $("<div>", { class:"igv-flw-input-label" });
        $input_data_row.append($label);
        $label.text(config.dataTitle);

        if (true === config.doURL) {
            createURLContainer.call(this, $input_data_row, 'igv-flw-data-url', false);
        } else {
            createLocalFileContainer.call(this, $input_data_row, 'igv-flw-local-data-file', false);
        }

        // index
        $input_index_row = $("<div>", { class:"igv-flw-input-row" });
        $container.append($input_index_row);
        // label
        $label = $("<div>", { class:"igv-flw-input-label" });
        $input_index_row.append($label);
        $label.text(config.indexTitle);

        if (true === config.doURL) {
            createURLContainer.call(this, $input_index_row, 'igv-flw-index-url', true);
        } else {
            createLocalFileContainer.call(this, $input_index_row, 'igv-flw-local-index-file', true);
        }

    }

    function createURLContainer($parent, id, isIndexFile) {
        var self = this,
            $data_drop_target,
            $input;

        $input = $('<input>', { type:'text', placeholder:(true === isIndexFile ? 'Enter index URL' : 'Enter data URL') });
        $parent.append($input);

        $input.on('focus', function () {
            self.dismissErrorMessage();
        });

        $input.on('change', function (e) {
            self.fileLoadManager.dictionary[ true === isIndexFile ? 'index' : 'data' ] = $(this).val();
        });

        $data_drop_target = $("<div>", { class:"igv-flw-drag-drop-target" });
        $parent.append($data_drop_target);
        $data_drop_target.text('or drop URL');

        $parent
            .on('drag dragstart dragend dragover dragenter dragleave drop', function (e) {
                var data;
                e.preventDefault();
                e.stopPropagation();
                self.dismissErrorMessage();
            })
            .on('dragover dragenter', function (e) {
                $(this).addClass('igv-flw-input-row-hover-state');
            })
            .on('dragleave dragend drop', function (e) {
                $(this).removeClass('igv-flw-input-row-hover-state');
            })
            .on('drop', function (e) {
                if (false === self.fileLoadManager.didDragFile(e.originalEvent.dataTransfer)) {
                    self.fileLoadManager.ingestDataTransfer(e.originalEvent.dataTransfer, isIndexFile);
                    $input.val(isIndexFile ? self.fileLoadManager.indexName() : self.fileLoadManager.dataName());
                }
            });

    }

    function createLocalFileContainer($parent, id, isIndexFile) {
        var self = this,
            $file_chooser_container,
            $data_drop_target,
            $label,
            $input,
            $file_name;

        $file_chooser_container = $("<div>", { class:"igv-flw-file-chooser-container" });
        $parent.append($file_chooser_container);

        $label = $('<label>', { for:id });
        $file_chooser_container.append($label);
        $label.text('Choose file...');

        $input = $('<input>', { class:"igv-flw-file-chooser-input", id:id, name:id, type:'file' });
        $file_chooser_container.append($input);

        $data_drop_target = $("<div>", { class:"igv-flw-drag-drop-target" });
        $parent.append($data_drop_target);
        $data_drop_target.text('or drop file');

        $file_name = $("<div>", { class:"igv-flw-local-file-name-container" });
        $parent.append($file_name);

        $file_name.hide();

        $input.on('change', function (e) {

            self.dismissErrorMessage();

            self.fileLoadManager.dictionary[ true === isIndexFile ? 'index' : 'data' ] = e.target.files[ 0 ];
            $file_name.text(e.target.files[ 0 ].name);
            $file_name.attr('title', e.target.files[ 0 ].name);
            $file_name.show();
        });

        $parent
            .on('drag dragstart dragend dragover dragenter dragleave drop', function (e) {
                e.preventDefault();
                e.stopPropagation();
                self.dismissErrorMessage();
            })
            .on('dragover dragenter', function (e) {
                $(this).addClass('igv-flw-input-row-hover-state');
            })
            .on('dragleave dragend drop', function (e) {
                $(this).removeClass('igv-flw-input-row-hover-state');
            })
            .on('drop', function (e) {
                var str;
                if (true === self.fileLoadManager.didDragFile(e.originalEvent.dataTransfer)) {
                    self.fileLoadManager.ingestDataTransfer(e.originalEvent.dataTransfer, isIndexFile);
                    str = isIndexFile ? self.fileLoadManager.indexName() : self.fileLoadManager.dataName();
                    $file_name.text(str);
                    $file_name.attr('title', str);
                    $file_name.show();

                }
            });

    }

    function echoDraggedItem (dataTransfer) {

        var url,
            files;

        url = dataTransfer.getData('text/uri-list');
        files = dataTransfer.files;

        if (files && files.length > 0) {
            console.log('file dragged');
        } else if (url && '' !== url) {
            console.log('url dragged');
        }

    }

    igv.FileLoadWidget.prototype.present = function () {
        this.$container.show();
    };

    igv.FileLoadWidget.prototype.dismiss = function () {

        this.dismissErrorMessage();

        this.$container.find('input').val(undefined);
        this.$container.find('.igv-flw-local-file-name-container').hide();

        if (false === this.config.embed) {
            this.$container.hide();
        }

        this.fileLoadManager.reset();

        if (false === this.config.embed) {
            this.$container.css({ top:'64px', left:0 });
        }

    };

    igv.FileLoadManager = function (fileLoadWidget) {

        this.fileLoadWidget = fileLoadWidget;

        this.dictionary = {};

        this.keyToIndexExtension =
            {
                bam: { extension: 'bai', optional: false },
                any: { extension: 'idx', optional: true  },
                gz: { extension: 'tbi', optional: true  }
            };

        this.indexExtensionToKey = _.invert(_.mapObject(this.keyToIndexExtension, function (val) {
            return val.extension;
        }));

    };

    igv.FileLoadManager.prototype.didDragFile = function (dataTransfer) {
        var files;

        files = dataTransfer.files;

        return (files && files.length > 0);
    };

    igv.FileLoadManager.prototype.ingestDataTransfer = function (dataTransfer, isIndexFile) {
        var url,
            files;

        url = dataTransfer.getData('text/uri-list');
        files = dataTransfer.files;

        if (files && files.length > 0) {
            this.dictionary[ true === isIndexFile ? 'index' : 'data' ] = files[ 0 ];
        } else if (url && '' !== url) {
            this.dictionary[ true === isIndexFile ? 'index' : 'data' ] = url;
        }

    };

    igv.FileLoadManager.prototype.indexName = function () {
        return itemName(this.dictionary.index);
    };

    igv.FileLoadManager.prototype.dataName = function () {
        return itemName(this.dictionary.data);
    };

    function itemName (item) {
        return igv.isFilePath(item) ? item.name : item;
    }

    igv.FileLoadManager.prototype.reset = function () {
        this.dictionary = {};
    };

    igv.FileLoadManager.prototype.trackLoadConfiguration = function () {
        var extension,
            key,
            config,
            _isIndexFile,
            _isIndexable,
            indexFileStatus;


        if (undefined === this.dictionary.data) {
            this.fileLoadWidget.presentErrorMessage('Error: No data file');
            return undefined;
        } else {

            _isIndexFile = isAnIndexFile.call(this, this.dictionary.data);
            if (true === _isIndexFile) {
                this.fileLoadWidget.presentErrorMessage('Error: index file submitted as data file.');
                return undefined;
            } else {

                if (this.dictionary.index) {
                    _isIndexFile = isAnIndexFile.call(this, this.dictionary.index);
                    if (false === _isIndexFile) {
                        this.fileLoadWidget.presentErrorMessage('Error: index file is not valid.');
                        return undefined;
                    }
                }

                _isIndexable = isIndexable.call(this, this.dictionary.data);

                extension = igv.getExtension({ url: this.dictionary.data });

                key = (this.keyToIndexExtension[ extension ]) ? extension : 'any';

                indexFileStatus = this.keyToIndexExtension[ key ];

                if (true === _isIndexable && false === indexFileStatus.optional) {

                    if (undefined === this.dictionary.index) {
                        this.fileLoadWidget.presentErrorMessage('Error: index file must be provided.');
                        return undefined;

                    } else {
                        return { url: this.dictionary.data, indexURL: this.dictionary.index }
                    }

                } else {

                    config =
                        {
                            url: this.dictionary.data,
                            indexURL: this.dictionary.index || undefined
                        };

                    if (undefined === this.dictionary.index) {
                        config.indexed = false;
                    }

                    return config;
                }

            }

        }

    };

    function isAnIndexFile(fileOrURL) {
        var extension;

        extension = igv.getExtension({ url: fileOrURL });
        return _.contains(_.keys(this.indexExtensionToKey), extension);
    }

    function isIndexable(fileOrURL) {

        var extension;

        if (true === isAnIndexFile(fileOrURL)) {
            return false;
        } else {
            extension = igv.getExtension({ url: fileOrURL });
            return (extension !== 'wig' && extension !== 'seg');
        }

    }

    return igv;
})(igv || {});