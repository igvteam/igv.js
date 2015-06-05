/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
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
 * Utilities for loading encode files
 *
 * Created by jrobinso on 3/19/14.
 */

var igv = (function (igv) {

    var antibodyColors =
    {
        H3K27AC: "rgb(200, 0, 0)",
        H3K27ME3: "rgb(130, 0, 4)",
        H3K36ME3: "rgb(0, 0, 150)",
        H3K4ME1: "rgb(0, 150, 0)",
        H3K4ME2: "rgb(0, 150, 0)",
        H3K4ME3: "rgb(0, 150, 0)",
        H3K9AC: "rgb(100, 0, 0)",
        H3K9ME1: "rgb(100, 0, 0)"
    };

    igv.EncodeTable = function (parentModalBodyObject, continuation) {

        var self = this,
            spinnerFA;

        this.encodeModalTableObject = $('<table id="encodeModalTable" cellpadding="0" cellspacing="0" border="0" class="display"></table>');
        parentModalBodyObject.append(this.encodeModalTableObject[ 0 ]);

        this.initialized = false;

        spinnerFA = $('<i class="fa fa-lg fa-spinner fa-spin"></i>');
        this.spinner = $('<div class="igv-encode-spinner-container"></div>');
        this.spinner.append(spinnerFA[ 0 ]);

        $('#encodeModalTable').append(this.spinner[ 0 ]);
        $('#igvEncodeModal').on('shown.bs.modal', function (e) {

            if (true === self.initialized) {
                return;
            }

            self.initialized = true;

            continuation();
        });

        $('#encodeModalTopCloseButton').on('click', function () {
            $('tr.selected').removeClass('selected');
        });

        $('#encodeModalBottomCloseButton').on('click', function () {
            $('tr.selected').removeClass('selected');
        });

        $('#encodeModalGoButton').on('click', function () {

            var tableRows,
                dataSourceJSONRow,
                configList = [],
                encodeModalTable = $('#encodeModalTable'),
                dataTableAPIInstance = encodeModalTable.DataTable();

            tableRows = self.dataTablesObject.$('tr.selected');
            if (tableRows) {

                tableRows.removeClass('selected');

                tableRows.each(function() {

                    var index,
                        data = dataTableAPIInstance.row( this ).data();

                    index = data[ 0 ];

                    dataSourceJSONRow = self.dataSource.jSON.rows[ index ];

                    configList.push({
                        type: dataSourceJSONRow[ "Format" ],
                        url: dataSourceJSONRow[ "url" ],
                        color: encodeAntibodyColor(dataSourceJSONRow[ "Target" ]),
                        format: dataSourceJSONRow["Format"],
                        name: dataSourceJSONRow["Name"]
                    });

                });

                if (undefined === igv.browser.designatedTrack) {
                    configList[ 0 ].designatedTrack = true;
                }

                igv.browser.loadTracksWithConfigList(configList);

            } // if (tableRows)

        });

    };

    igv.EncodeTable.prototype.loadWithDataSource = function (dataSource) {

        var self = this,
            dataSet = dataSource.dataTablesData(),
            columns = dataSource.columnHeadings();

        this.dataSource = dataSource;

        this.dataTablesObject = self.encodeModalTableObject.dataTable({

            "data": dataSet,
            "scrollX": true,
            "scrollY": "400px",
            "scrollCollapse": true,
            "paging": false,
            "columnDefs": [ { "targets": 0, "visible": false } ],
            "autoWidth": true,
            "columns": columns
        });

        self.encodeModalTableObject.find('tbody').on('click', 'tr', function () {

            if ($(this).hasClass('selected')) {
                $(this).removeClass('selected');
            } else {
                $(this).addClass('selected');
            }

        });

    };

    igv.EncodeTable.prototype.encodeTrackLabel = function (record) {

        return (record.antibody) ? record.antibody + " " + record.cell + " " + record.replicate : record.cell + record.dataType + " " + record.view + " " + record.replicate;

    };

    function encodeAntibodyColor (antibody) {

        var key;

        if (!antibody || "" === antibody) {
            return cursor.defaultColor();
        }

        key = antibody.toUpperCase();
        return (antibodyColors[ key ]) ? antibodyColors[ key ] : cursor.defaultColor();

    }

    igv.EncodeDataSource = function (config) {
        this.config = config;
    };

    igv.EncodeDataSource.prototype.loadJSON = function (continuation) {

        this.jSON = {};
        if (this.config.filePath) {
            this.ingestFile(this.config.filePath, continuation);
        } else if (this.config.jSON) {
            this.ingestJSON(this.config.jSON, continuation);
        }

    };

    igv.EncodeDataSource.prototype.ingestJSON = function (json, continuation) {

        var self = this;

        self.jSON = json;

        json.rows.forEach(function(row, i){

            Object.keys(row).forEach(function(key){
                var item = row[ key ];
                self.jSON.rows[ i ][ key ] = (undefined === item || "" === item) ? "-" : item;
            });

        });

        continuation();

    };

    igv.EncodeDataSource.prototype.ingestFile = function (file, continuation) {

        var self = this,
            dataLoader = new igv.DataLoader(file);

        dataLoader.loadBinaryString(function (data) {

            var lines = data.splitLines(),
                item;

            // Raw data items order:
            // path | cell | dataType | antibody | view | replicate | type | lab | hub
            //
            // Reorder to match desired order. Discard hub item.
            //
            self.jSON.columns = lines[0].split("\t");
            self.jSON.columns.pop();
            item = self.jSON.columns.shift();
            self.jSON.columns.push(item);

            self.jSON.rows = [];

            lines.slice(1, lines.length - 1).forEach(function (line) {

                var tokens,
                    row;

                tokens = line.split("\t");
                tokens.pop();
                item = tokens.shift();
                tokens.push(item);

                row = {};
                tokens.forEach(function (t, i, ts) {
                    var key = self.jSON.columns[ i ];
                    row[ key ] = (undefined === t || "" === t) ? "-" : t;
                });

                self.jSON.rows.push(row);

            });

            continuation();
        });

    };

    igv.EncodeDataSource.prototype.dataTablesData = function () {

        var self = this,
            result = [];

        this.jSON.rows.forEach(function(row, index){

            var rr = [];

            rr.push( index );
            self.jSON.columns.forEach(function(key){
                rr.push( row[ key ] );
            });

            result.push( rr );
        });

        return result;
    };

    igv.EncodeDataSource.prototype.columnHeadings = function () {

        var columnWidths = this.jSON.columnWidths,
            columnHeadings = [ ];

        columnHeadings.push({ "title": "index" });
        this.jSON.columns.forEach(function(heading, i){
            //columnHeadings.push({ "title": heading, width: (columnWidths[ i ].toString() + "%") });
            columnHeadings.push({ "title": heading });
        });

        return columnHeadings;

    };

    return igv;

})(igv || {});
