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

var encode = (function (encode) {

    encode.EncodeTable = function ($parent, browser, browserLoadFunction, columnWidths, dataSource) {

        var self = this;

        this.initialized = false;

        this.columnWidths = columnWidths;

        this.$modalTable = $('<table id="encodeModalTable" cellpadding="0" cellspacing="0" border="0" class="display"></table>');
        $parent.append(this.$modalTable);

        this.$spinner = $('<div>');
        this.$modalTable.append(this.$spinner);

        this.$spinner.append($('<i class="fa fa-lg fa-spinner fa-spin"></i>'));

        $('#hicEncodeModal').on('shown.bs.modal', function (e) {

            if (true !== self.initialized) {

                self.initialized = true;
                dataSource.retrieveData(function () {
                    self.createTableWithDataSource(dataSource);
                });

            }

        });

        $('#encodeModalTopCloseButton').on('click', function () {
            $('tr.selected').removeClass('selected');
        });

        $('#encodeModalBottomCloseButton').on('click', function () {
            $('tr.selected').removeClass('selected');
        });

        $('#encodeModalGoButton').on('click', function () {

            var dt,
                $selectedTableRows,
                result;

            $selectedTableRows = self.$dataTables.$('tr.selected');

            if ($selectedTableRows.length > 0) {

                $selectedTableRows.removeClass('selected');

                dt = self.$modalTable.DataTable();
                result = [];
                $selectedTableRows.each(function() {

                    var index,
                        datum,
                        obj;

                    index = _.first(dt.row( this ).data());

                    datum = dataSource.rowData()[ index ];

                    obj =
                        {
                            // type: datum[ 'Format' ],
                            url: datum[ 'url' ],
                            color: encodeAntibodyColor(datum[ 'Target' ]),
                            // format: datum['Format'],
                            name: datum['Name']
                            //  max: 50
                        };

                    result.push(obj);

                    function encodeAntibodyColor (antibody) {

                        var colors,
                            key;

                        colors =
                            {
                                DEFAULT: "rgb(3, 116, 178)",
                                H3K27AC: "rgb(200, 0, 0)",
                                H3K27ME3: "rgb(130, 0, 4)",
                                H3K36ME3: "rgb(0, 0, 150)",
                                H3K4ME1: "rgb(0, 150, 0)",
                                H3K4ME2: "rgb(0, 150, 0)",
                                H3K4ME3: "rgb(0, 150, 0)",
                                H3K9AC: "rgb(100, 0, 0)",
                                H3K9ME1: "rgb(100, 0, 0)"
                            };

                        if (undefined === antibody || '' === antibody || '-' === antibody) {
                            key = 'DEFAULT';
                        } else {
                            key = antibody.toUpperCase();
                        }

                        return colors[ key ];

                    }

                });

                browserLoadFunction.call(browser, result);

            }

        });

    };

    // encode.EncodeTable.prototype.unbindAllMouseHandlers = function () {
    //
    //     this.$modalTable.find('tbody').unbind();
    //
    //     $('#hicEncodeModal').unbind();
    //
    //     $('#encodeModalTopCloseButton').unbind();
    //
    //     $('#encodeModalBottomCloseButton').unbind();
    //
    //     $('#encodeModalGoButton').unbind();
    //
    // };

    encode.EncodeTable.prototype.createTableWithDataSource = function (dataSource) {

        var self = this;

        this.$spinner.hide();

        this.$dataTables = this.$modalTable.dataTable({

            data: dataSource.tableData(),
            // deferRender: true,
            paging: true, /* must be true if scroller is enable */
            scrollX: false,
            scrollY: 400,
            scrollCollapse: false,
            scroller: true,
            fixedColumns: true,
            columns: dataSource.tableColumns(self.columnWidths)
        });

        this.$modalTable.find('tbody').on('click', 'tr', function () {

            if ($(this).hasClass('selected')) {
                $(this).removeClass('selected');
            } else {
                $(this).addClass('selected');
            }

        });

    };

    return encode;

})(encode || {});
