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

        this.config = config;
        this.datasource = config.datasource;
        this.browserHandler = config.browserHandler;

        this.doRetrieveData = true;
        this.doBuildTable = true;

        this.rebuildDOM(config);

    };

    igv.ModalTable.prototype.loadData = function (genomeId, willLoadDataHandler, didLoadDataHander, didFailToLoadDataHandler) {

        var self = this,
            $hic_track_dropdown,
            assembly;

        this.$spinner.show();

        // TODO: JuiceboxJS specific
        $hic_track_dropdown = $('#hic-track-dropdown');
        $hic_track_dropdown.prop('disabled', true);

        assembly = igv.genomeIdLUT( genomeId);
        this.datasource
            .retrieveData(assembly)
            .then(function (data) {
                console.log('igv.ModalTable. then(received data ' + _.size(data) + ')');
                self.datasource.data = data;
                self.doRetrieveData = false;

                self.buildTable(true);

                // TODO: JuiceboxJS specific
                $hic_track_dropdown.prop('disabled', false);
            })
            .catch(function (e) {

                // TODO: JuiceboxJS specific
                $hic_track_dropdown.prop('disabled', false);

                self.$spinner.hide();
                self.buildTable(false);
            });
    };

    igv.ModalTable.prototype.buildTable = function (success) {

        var self = this;

        if (true === success) {

            $('#hic-encode-modal-button').off('click');

            this.$modal.on('shown.bs.modal', function (e) {

                if (true === self.doBuildTable) {

                    console.log('building table ...');

                    self.tableWithDataAndColumns(self.datasource.tableData(self.datasource.data), self.datasource.tableColumns());

                    console.log('... done building table');

                    self.$spinner.hide();

                    self.doBuildTable = false;
                }

            });

            this.$modalGoButton.on('click', function () {
                var selected;

                selected = getSelectedTableRowsData.call(self, self.$dataTables.$('tr.selected'));

                if (selected) {
                    self.browserHandler(selected);
                }

            });

        } else {

            $('#hic-encode-modal-button').on('click', function (e) {
                igv.presentAlert('No ENCODE data available', undefined);
                return false;
            });
        }

        this.$modalTopCloseButton.on('click', function () {
            $('tr.selected').removeClass('selected');
        });

        this.$modalBottomCloseButton.on('click', function () {
            $('tr.selected').removeClass('selected');
        });

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

    igv.ModalTable.prototype.rebuildDOM = function (config) {

        teardownModalDOM(config);

        this.$table = $('<table cellpadding="0" cellspacing="0" border="0" class="display"></table>');
        config.$modalBody.append(this.$table);

        this.$spinner = $('<div>');
        this.$table.append(this.$spinner);
        this.$spinner.append($('<i class="fa fa-lg fa-spinner fa-spin"></i>'));

        this.$modal = config.$modal;
        this.$modalGoButton = config.$modalGoButton;

        this.$modalTopCloseButton = config.$modalTopCloseButton;
        this.$modalBottomCloseButton = config.$modalBottomCloseButton;

        function teardownModalDOM(config) {

            [
                config.$modal,
                config.$modalTopCloseButton,
                config.$modalBottomCloseButton,
                config.$modalGoButton
            ].forEach(function ($e) {
                $e.unbind();
            });

            config.$modalBody.empty();
        }

    };

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

    return igv;

})(igv || {});
