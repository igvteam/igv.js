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

        this.config = config;
        this.datasource = datasource;

        teardownModalDOM(config);
        this.$table = $('<table cellpadding="0" cellspacing="0" border="0" class="display"></table>');
        config.$modalBody.append(this.$table);

        this.$spinner = $('<div>');
        this.$table.append(this.$spinner);

        this.$spinner.append($('<i class="fa fa-lg fa-spinner fa-spin"></i>'));

        this.datasource
            .retrieveData()
            .then(function (data) {
                var promiseToBuildTable;

                self.$spinner.hide();

                promiseToBuildTable = new Promise(function(resolve){
                    console.log('modaltable. then. received data ' + _.size(data) + '. begin building table ...');

                    self.datasource.data = data;
                    self.tableWithDataAndColumns(self.datasource.tableData(data), self.datasource.tableColumns());

                    resolve('... done building table');
                });

                return promiseToBuildTable
            })
            .then(function (string) {
                console.log(string);

                config.$modal.on('show.bs.modal', function (e) {

                    if (undefined === config.browserRetrievalFunction) {
                        igv.presentAlert('ERROR: must provide browser retrieval function');
                    }

                });

                config.$modal.on('shown.bs.modal', function (e) {

                    if (undefined === config.browserRetrievalFunction) {
                        config.$modal.modal('hide');
                    }

                });

                config.$modalTopCloseButton.on('click', function () {
                    $('tr.selected').removeClass('selected');
                });

                config.$modalBottomCloseButton.on('click', function () {
                    $('tr.selected').removeClass('selected');
                });

                config.$modalGoButton.on('click', function () {
                    var browser,
                        selected;

                    selected = getSelectedTableRowsData.call(self, self.$dataTables.$('tr.selected'));

                    if (selected) {
                        browser = config.browserRetrievalFunction();
                        browser[ config.browserLoadFunction ](selected);
                    }

                });

            });
    };

    function teardownModalDOM(configuration) {

        var list;

        list =
            [
                configuration.$modal,
                configuration.$modalTopCloseButton,
                configuration.$modalBottomCloseButton,
                configuration.$modalGoButton
            ];

        _.each(list, function ($e) {
            $e.unbind();
        });

        configuration.$modalBody.empty();
    }

    function getSelectedTableRowsData($rows) {

        var self = this,
            dt,
            result;

        result = [];
        if ($rows.length > 0) {

            $rows.removeClass('selected');

            dt = self.$table.DataTable();
            $rows.each(function() {
                result.push( self.datasource.dataAtRowIndex(self.datasource.data, dt.row(this).index()) );
            });
        }

        return result.length > 0 ? result : undefined;
    }

    igv.ModalTable.prototype.genomeID = function () {
        return this.datasource.config.genomeID;
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
