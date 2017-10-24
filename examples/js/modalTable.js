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

    igv.ModalTable = function (config, datasource) {

        var self = this;

        this.initialized = false;
        this.config = config;
        this.datasource = datasource;

        this.$table = $('<table cellpadding="0" cellspacing="0" border="0" class="display"></table>');

        config.$modalBody.append(this.$table);

        this.$spinner = $('<div>');
        this.$table.append(this.$spinner);

        this.$spinner.append($('<i class="fa fa-lg fa-spinner fa-spin"></i>'));
        this.$spinner.hide();

        config.$modal.on('show.bs.modal', function (e) {

            if (undefined === config.browserRetrievalFunction) {
                igv.presentAlert('ERROR: must provide browser retrieval function');
            }

        });

        config.$modal.on('shown.bs.modal', function (e) {

            if (undefined === config.browserRetrievalFunction) {
                config.$modal.modal('hide');
            } else if (true !== self.initialized) {
                self.initialized = true;
                self.$spinner.show();
                self.datasource.retrieveData(function (status) {

                    if (true === status) {
                        self.tableWithDataAndColumns(self.datasource.tableData(), self.datasource.tableColumns());
                    } else {
                        igv.presentAlert('ERROR: cannot retrieve data from datasource');
                        config.$modal.modal('hide');
                    }
                    self.$spinner.hide();
                });
            }

        });

        config.$modalTopCloseButton.on('click', function () {
            $('tr.selected').removeClass('selected');
        });

        config.$modalBottomCloseButton.on('click', function () {
            $('tr.selected').removeClass('selected');
        });

        config.$modalGoButton.on('click', function () {

            var dt,
                $selectedTableRows,
                result,
                browser;

            $selectedTableRows = self.$dataTables.$('tr.selected');

            if (undefined === config.browserRetrievalFunction) {
                igv.presentAlert('ERROR: must provide browser retrieval function');
            } else if ($selectedTableRows.length > 0) {

                $selectedTableRows.removeClass('selected');

                dt = self.$table.DataTable();
                result = [];
                $selectedTableRows.each(function() {
                    result.push( self.datasource.dataAtRowIndex( dt.row(this).index() ) );
                });

                browser = config.browserRetrievalFunction();
                browser[ config.browserLoadFunction ](result);
            }

        });

    };

    // igv.ModalTable.prototype.genomeID = function () {
    //     return this.datasource.config.genomeID;
    // };

    igv.ModalTable.prototype.teardown = function () {

        var list;

        list =
            [
                this.config.$modal,
                this.config.$modalTopCloseButton,
                this.config.$modalBottomCloseButton,
                this.config.$modalGoButton
            ];

        _.each(list, function ($e) {
            $e.unbind();
        });

        this.config.$modalBody.empty();
    };

    igv.ModalTable.prototype.tableWithDataAndColumns = function (tableData, tableColumns) {

        var config;

        this.$spinner.hide();

        config =
            {
                data: tableData,
                columns: tableColumns,
                paging: true,
                scrollX: false,
                scrollY: '400px',
                scrollCollapse: false,
                scroller: true,
                fixedColumns: true
            };

        this.$dataTables = this.$table.dataTable(config);

        this.$table.find('tbody').on('click', 'tr', function () {

            if ($(this).hasClass('selected')) {
                $(this).removeClass('selected');
            } else {
                $(this).addClass('selected');
            }

        });

    };

    return igv;

})(igv || {});
