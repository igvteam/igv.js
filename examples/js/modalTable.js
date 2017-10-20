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
 * Created by dat on 4/18/17.
 */

var igv = (function (igv) {

    igv.ModalTable = function (config) {

        var self = this,
            $modal;

        this.initialized = false;

        this.config = config;

        $modal = config.$modal;

        this.dataSource = config.dataSource;

        this.$clusterizeContentArea = $('<div>', { id:'mte-clusterize-content-area', class:'clusterize-content' });
        this.config.$modalBody.append(this.$clusterizeContentArea);

        this.$spinner = $('<div>');
        this.$clusterizeContentArea.append(this.$spinner);

        this.$spinner.append($('<i class="fa fa-lg fa-spinner fa-spin"></i>'));
        this.$spinner.hide();

        $modal.on('show.bs.modal', function (e) {

            if (undefined === config.browserRetrievalFunction) {
                igv.presentAlert('ERROR: must provide browser retrieval function');
            } else if (true === self.initialized) {
                self.updateTableView();
            }

        });

        $modal.on('shown.bs.modal', function (e) {

            if (undefined === config.browserRetrievalFunction) {
                $modal.modal('hide');
            } else if (false === self.initialized) {
                self.initialized = true;
                // self.$spinner.show();
                self.dataSource.retrieveData(function (data) {

                    if (data) {
                        self.createTable(data);
                    } else {
                        igv.presentAlert('ERROR: unable to retrieve data from data source.');
                    }

                });
            }

        });

        config.$modalTopCloseButton.on('click', function () {
            self.unselectAllRows();
        });

        config.$modalBottomCloseButton.on('click', function () {
            self.unselectAllRows();
        });

        config.$modalGoButton.on('click', function () {
            var browser,
                selected;

            selected = self.retrieveSelectedRows();
            self.unselectAllRows();
            if (undefined === config.browserRetrievalFunction) {
                igv.presentAlert('ERROR: must provide browser retrieval function');
            } else if (selected) {
                browser = config.browserRetrievalFunction();
                browser[ config.browserLoadFunction ](_.values(selected));
            }

        });

    };

    igv.ModalTable.prototype.retrieveSelectedRows = function () {
        var s;

        s = _.filter(this.selectedRows, function (value, key) {
            return !(undefined === value);
        });

        return 0 === _.size(s) ? undefined : s;
    };

    igv.ModalTable.prototype.unselectAllRows = function () {
        this.selectedRows = undefined;
    };

    igv.ModalTable.prototype.genomeID = function () {
        return this.dataSource.config.genomeID;
    };

    igv.ModalTable.prototype.teardown = function () {

        var list;

        // list =
        //     [
        //         this.$modalTable.find('tbody'),
        //         this.config.$modal,
        //         this.config.$modalTopCloseButton,
        //         this.config.$modalBottomCloseButton,
        //         this.config.$modalGoButton
        //     ];
        //
        // _.each(list, function ($e) {
        //     $e.unbind();
        // });

        this.config.$modalBody.empty();
    };

    igv.ModalTable.prototype.createTable = function (data) {

        var self = this;

        // this.$spinner.hide();

        this.createHTML(data, ['Assembly', 'Cell Type', 'Target', 'Assay Type', 'Output Type', 'Lab'], function (markup) {

            var config;

            config =
                {
                    rows: markup,
                    rows_in_block: 64,
                    scrollId: self.config.$modalBody.attr('id'),
                    contentId: self.$clusterizeContentArea.attr('id'),
                    callbacks:
                        {
                            clusterChanged: function () {
                                console.log('cluster changed');
                                self.updateTableView();
                            }
                        }
                };

            self.clusterize = new Clusterize(config);

            self.$clusterizeContentArea.on('click', '.mte-clusterize-content-row', function () {
                var key;

                key = $(this).data('row-index');

                console.log('row ' + key + ' clicked');

                if ($(this).hasClass('mte-clusterize-selected-row')) {

                    unselectRowWithKey.call(self, key);
                    $(this).removeClass('mte-clusterize-selected-row');
                    $(this).addClass('mte-clusterize-unselected-row');
                } else {
                    selectRowWithKey.call(self, key);
                    $(this).removeClass('mte-clusterize-unselected-row');
                    $(this).addClass('mte-clusterize-selected-row');
                }

            });

            function selectRowWithKey(key) {
                var index;

                if (undefined === this.selectedRows) {
                    this.selectedRows = {};
                }
                index = this.dataSource.dataAtRowIndex( parseInt(key, 10) );
                this.selectedRows[ key ] = index;
            }

            function unselectRowWithKey(key) {
                if (this.selectedRows && this.selectedRows[ key ]) {
                    this.selectedRows[ key ] = undefined;
                }
            }

        });

        function clusterChangedCallback() {
            var self = this;

            console.log('cluster changed');

            this.$clusterizeContentArea.find('.mte-clusterize-content-row').each(function (index, value) {
                var key,
                    isSelected;

                key = $(this).data('row-index');
                isSelected = self.selectedRows && self.selectedRows[ key ];

                if (isSelected) {
                    $(this).removeClass('mte-clusterize-unselected-row');
                    $(this).addClass('mte-clusterize-selected-row');
                } else {
                    $(this).removeClass('mte-clusterize-selected-row');
                    $(this).addClass('mte-clusterize-unselected-row');
                }

            });
        }

    };

    igv.ModalTable.prototype.createHTML = function (data, columns, continuation) {

        var html;

        html = _.map(data, function (row, index) {
            var mapped;

            mapped = _.map(_.values(_.pick(row, columns)), function (value) {
                return '<div class="mte-clusterize-content-row-cell">' + value + '</div>';
            });

            return '<div class="mte-clusterize-content-row mte-clusterize-unselected-row" data-row-index=' + index.toString() + '>' + mapped.join('') + '</div>';
        });

        continuation(html);
    };

    igv.ModalTable.prototype.updateTableView = function () {

        var self = this;

        this.$clusterizeContentArea.find('.mte-clusterize-content-row').each(function (index, value) {
            var key,
                isSelected;

            key = $(this).data('row-index');
            isSelected = self.selectedRows && self.selectedRows[ key ];

            if (isSelected) {
                $(this).removeClass('mte-clusterize-unselected-row');
                $(this).addClass('mte-clusterize-selected-row');
            } else {
                $(this).removeClass('mte-clusterize-selected-row');
                $(this).addClass('mte-clusterize-unselected-row');
            }

        });

    };

    return igv;

})(igv || {});
