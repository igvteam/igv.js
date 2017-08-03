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

    encode.EncodeTable = function ($parent, browser, genomeID, loadFunction) {

        var self = this;

        this.initialized = false;
        this.genomeID = genomeID;

        this.$modalTable = $('<table id="encodeModalTable" cellpadding="0" cellspacing="0" border="0" class="display"></table>');
        $parent.append(this.$modalTable);

        this.$spinner = $('<div>');
        this.$modalTable.append(this.$spinner);

        this.$spinner.append($('<i class="fa fa-lg fa-spinner fa-spin"></i>'));

        $('#hicEncodeModal').on('shown.bs.modal', function (e) {

            if (true !== self.initialized) {

                self.initialized = true;

                encode.EncodeDataSource.retrieveJSon(genomeID, function (json) {
                    var ds;
                    ds = new encode.EncodeDataSource({ jSON: json });
                    ds.ingestData(function () {
                        self.createTableWithDataSource(ds);
                    });

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

            var tableRows,
                dataTableAPIInstance,
                index,
                data,
                raw,
                mapped;

            dataTableAPIInstance = self.$modalTable.DataTable();

            tableRows = self.$dataTables.$('tr.selected');


            if (tableRows) {

                tableRows.removeClass('selected');

                raw = [];
                tableRows.each(function() {

                    data = dataTableAPIInstance.row( this ).data();
                    index = data[ 0 ];

                    raw.push( self.tableRows[ index ] );

                });

                mapped = _.map(raw, function(r) {

                    var obj;

                    obj =
                        {
                            // type: r[ 'Format' ],
                            url: r[ 'url' ],
                            color: encodeAntibodyColor(r[ 'Target' ]),
                            // format: r['Format'],
                            name: r['Name']
                            //  max: 50              // Hardcoded for now
                        };

                    return obj;
                });

                // console.log('do something cool with ' + _.size(mapped) + ' tracks.');
                loadFunction.call(browser, mapped);

            }

        });

    };

    encode.EncodeTable.prototype.unbindAllMouseHandlers = function () {

        this.$modalTable.find('tbody').unbind();

        $('#hicEncodeModal').unbind();

        $('#encodeModalTopCloseButton').unbind();

        $('#encodeModalBottomCloseButton').unbind();

        $('#encodeModalGoButton').unbind();

    };

    encode.EncodeTable.prototype.createTableWithDataSource = function (dataSource) {

        this.tableRows = dataSource.jSON.rows;

        this.$spinner.hide();

        this.$dataTables = this.$modalTable.dataTable({

            data: dataSource.dataTablesData(),
            // deferRender: true,
            paging: true, /* must be true if scroller is enable */
            scrollX: false,
            scrollY: 400,
            scrollCollapse: false,
            scroller: true,
            fixedColumns: true,
            columns: dataSource.getColumns()
        });

        this.$modalTable.find('tbody').on('click', 'tr', function () {

            if ($(this).hasClass('selected')) {
                $(this).removeClass('selected');
            } else {
                $(this).addClass('selected');
            }

        });

    };

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

        if (undefined === antibody || "" === antibody) {
            key = 'DEFAULT';
        } else {
            key = antibody.toUpperCase();
        }

        return colors[ key ];

    }

    return encode;

})(encode || {});
