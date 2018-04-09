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


        // ok | cancel - container
        $div = $("<div>", { id:"igv-file-load-widget-ok-cancel" });
        this.$container.append($div);

        // ok
        this.$ok = $('<div>');
        $div.append(this.$ok);
        this.$ok.text('OK');

        // cancel
        this.$cancel = $('<div>');
        $div.append(this.$cancel);
        this.$cancel.text('Cancel');
        this.$cancel.on('click', function () {
            doDismiss.call(self);
        });

        this.$container.hide();

    };

    function createInputContainer($parent, config) {
        var self = this,
            $container,
            $input_row,
            $label,
            $input;

        // container
        $container = $("<div>", { class:"igv-flw-input-container" });
        $parent.append($container);

        // data
        $input_row = $("<div>", { class:"igv-flw-input-row" });
        $container.append($input_row);
        // label
        $label = $("<div>", { class:"igv-flw-input-label" });
        $input_row.append($label);
        $label.text(config.dataTitle);

        if (true === config.doURL) {
            $input = $('<input>', { type:'text', placeholder:'Enter data URL' });
            $input_row.append($input);
        } else {
            createFileChooserContainer.call(this, $input_row, 'igv-flw-local-data-file', false);
        }

        // index
        $input_row = $("<div>", { class:"igv-flw-input-row" });
        $container.append($input_row);
        $label = $("<div>", { class:"igv-flw-input-label" });
        $input_row.append($label);
        $label.text(config.indexTitle);

        if (true === config.doURL) {
            $input = $('<input>', { type:'text', placeholder:'Enter index URL' });
            $input_row.append($input);
        } else {
            createFileChooserContainer.call(this, $input_row, 'igv-flw-local-index-file', true);
        }

    }

    function createFileChooserContainer($parent, id, isIndexFile) {
        var self = this,
            $file_chooser_container,
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

        $file_name = $("<div>", { class:"igv-flw-local-file-name-container" });
        $parent.append($file_name);

        $file_name.hide();

        $input.on('change', function (e) {
            // loadLocalFiles.call(self, e.target.files[ 0 ], isIndexFile)
            $file_name.text(e.target.files[ 0 ].name);
            $file_name.show();
        });

    }

    function loadLocalFiles(file, isIndexFile) {

        console.log('load ' + file.name);
    }

    function doDismiss() {
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