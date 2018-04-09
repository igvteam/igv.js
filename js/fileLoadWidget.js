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
    igv.FileLoadWidget = function ($buttonParent, $widgetParent) {
        var self = this,
            config,
            $header,
            $div;

        this.$parent = $widgetParent;

        this.fileLoadManager = new igv.FileLoadManager();

        // file load navbar button
        this.$presentationButton = $("<div>", { id:"igv-drag-and-drop-presentation-button", class:'igv-nav-bar-button' });
        $buttonParent.append(this.$presentationButton);

        this.$presentationButton.text('Load File');

        this.$presentationButton.on('click', function () {

            if (self.$container.is(':visible')) {
                doDismiss.call(self);
            } else {
                doPresent.call(self);
            }

        });

        // file load widget
        this.$container = $("<div>", { id:"igv-file-load-widget-container" });
        $widgetParent.append(this.$container);

        // header
        $header = $("<div>", { id:"igv-file-load-widget-header" });
        this.$container.append($header);

        // header - dismiss button
        igv.attachDialogCloseHandlerWithParent($header, function () {
            doDismiss.call(self);
        });

        // local data/index
        config =
            {
                dataTitle: 'Local data file',
                indexTitle: 'Local index file'
            };
        createInputContainer.call(this, this.$container, config);

        // url data/index
        config =
            {
                doURL: true,
                dataTitle: 'Data URL',
                indexTitle: 'Index URL'
            };
        createInputContainer.call(this, this.$container, config);

        // error message
        this.$error_message = $("<div>", { id:"igv-flw-error-message-container" });
        this.$container.append(this.$error_message);
        this.$error_message.text('Hi. I am an error message.');
        // error message - dismiss button
        igv.attachDialogCloseHandlerWithParent(this.$error_message, function () {
            self.$error_message.text('');
        });



        // ok | cancel - container
        $div = $("<div>", { id:"igv-file-load-widget-ok-cancel" });
        this.$container.append($div);

        // ok
        this.$ok = $('<div>');
        $div.append(this.$ok);
        this.$ok.text('OK');
        this.$ok.on('click', function () {
            var config;
            config = self.fileLoadManager.trackLoadConfiguration();
            igv.browser.loadTrackList( [ config ] );
            doDismiss.call(self);
        });

        // cancel
        this.$cancel = $('<div>');
        $div.append(this.$cancel);
        this.$cancel.text('Cancel');
        this.$cancel.on('click', function () {
            doDismiss.call(self);
        });

        this.$container.hide();

    };

    igv.FileLoadManager = function () {

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

    igv.FileLoadManager.prototype.trackLoadConfiguration = function () {
        var extension,
            key,
            config;


        config =
            {
                url: this.dictionary.data,
                indexURL: this.dictionary.index || undefined
            };

        if (undefined === this.dictionary.index) {
            config.indexed = false;
        }

        return config;

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

        $input.on('change', function (e) {
            self.fileLoadManager.dictionary[ true === isIndexFile ? 'index' : 'data' ] = $(this).val();
        });

        $data_drop_target = $("<div>", { class:"igv-flw-drag-drop-target" });
        $parent.append($data_drop_target);
        $data_drop_target.text('or drop URL');

        $parent
            .on('drag dragstart dragend dragover dragenter dragleave drop', function (e) {
                e.preventDefault();
                e.stopPropagation();
            })
            .on('dragover dragenter', function () {
                $(this).addClass('igv-flw-input-row-hover-state');
            })
            .on('dragleave dragend drop', function () {
                $(this).removeClass('igv-flw-input-row-hover-state');
            })
            .on('drop', function (e) {
                var url;
                url = e.originalEvent.dataTransfer.getData('text/uri-list');
                self.fileLoadManager.dictionary[ true === isIndexFile ? 'index' : 'data' ] = url;
                $(this).val(url);
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
            self.fileLoadManager.dictionary[ true === isIndexFile ? 'index' : 'data' ] = e.target.files[ 0 ];
            $file_name.text(e.target.files[ 0 ].name);
            $file_name.show();
        });

        $parent
            .on('drag dragstart dragend dragover dragenter dragleave drop', function (e) {
                e.preventDefault();
                e.stopPropagation();
            })
            .on('dragover dragenter', function () {
                $(this).addClass('igv-flw-input-row-hover-state');
            })
            .on('dragleave dragend drop', function () {
                $(this).removeClass('igv-flw-input-row-hover-state');
            })
            .on('drop', function (e) {
                var f;
                f = e.originalEvent.dataTransfer.files[ 0 ];
                self.fileLoadManager.dictionary[ true === isIndexFile ? 'index' : 'data' ] = f;
                $file_name.text(f.name);
                $file_name.show();
            });

    }

    function ingestDragDropData (dataTransfer) {
        var url,
            file;

        url = dataTransfer.getData('text/uri-list');
        file = dataTransfer.files[ 0 ];

        if (file.length > 0) {
            loadLocalFiles.call(this, file);
        } else if ('' !== url) {
            processURL.call(this, url, this.$index_url_input.val());
        } else {
            console.log('whah?');
        }

    }

    function doDismiss() {
        this.$container.find('input').val(undefined);
        this.$container.find('.igv-flw-local-file-name-container').hide();
        this.$container.hide();
    }

    function doPresent() {

        var obj;

        obj =
            {
                left: (this.$parent.width() - this.$container.width())/2,
                top: (this.$parent.height() - this.$container.height())/2

            };
        this.$container.css(obj);

        this.$container.show();
    }

    return igv;
})(igv || {});