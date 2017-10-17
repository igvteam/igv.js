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

    igv.IGVModalTable = function (config) {

        var self = this,
            $modal;

        this.initialized = false;

        this.config = config;

        $modal = config.$modal;

        this.dataSource = config.dataSource;

        // this.$modalTable = $('<table cellpadding="0" cellspacing="0" border="0" class="display"></table>');
        // config.$modalBody.append(this.$modalTable);

        // this.$spinner = $('<div>');
        // this.$modalTable.append(this.$spinner);

        // this.$spinner.append($('<i class="fa fa-lg fa-spinner fa-spin"></i>'));
        // this.$spinner.hide();

        $modal.on('show.bs.modal', function (e) {

            if (undefined === config.browserRetrievalFunction) {
                igv.presentAlert('ERROR: must provide browser retrieval function');
            }

        });

        $modal.on('shown.bs.modal', function (e) {

            if (undefined === config.browserRetrievalFunction) {
                $modal.modal('hide');
            } else if (true !== self.initialized) {
                self.initialized = true;
                // self.$spinner.show();
                self.dataSource.retrieveData(function (fancyColumns, fancyData) {

                    self.createTable(fancyColumns, fancyData);

                    // if (fancyColumns && fancyData) {
                    //     self.createTable(fancyColumns, fancyData);
                    // } else {
                    //     igv.presentAlert('ERROR: cannot retrieve data from datasource');
                    //     $modal.modal('hide');
                    // }
                    // self.$spinner.hide();
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

                dt = self.$modalTable.DataTable();
                result = [];
                $selectedTableRows.each(function() {
                    result.push( self.dataSource.dataAtRowIndex( dt.row(this).index() ) );
                });

                browser = config.browserRetrievalFunction();
                browser[ config.browserLoadFunction ](result);
            }

        });

    };

    igv.IGVModalTable.prototype.genomeID = function () {
        return this.dataSource.config.genomeID;
    };

    igv.IGVModalTable.prototype.teardown = function () {

        var list;

        list =
            [
                this.$modalTable.find('tbody'),
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

    igv.IGVModalTable.prototype.createTable = function (fancyColumns, fancyData) {

        var fancyConfiguration;
        // this.$spinner.hide();

        fancyConfiguration =
            {
                paging: true,
                width:'fit',
                height:'fit',
                // data:_.first(fancyData, 100),
                data:fancyData,
                columns:fancyColumns
            };
        this.config.$modalBody.FancyGrid(fancyConfiguration);

    };

    return igv;

})(igv || {});
