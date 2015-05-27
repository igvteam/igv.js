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

    igv.EncodeTable = function (parentModalBodyObject) {

        this.encodeModalTableObject = $('<table id="encodeModalTable" cellpadding="0" cellspacing="0" border="0" class="display"></table>');
        parentModalBodyObject.append(this.encodeModalTableObject[ 0 ]);

    };

    igv.EncodeTable.prototype.loadWithDataSource = function (dataSource) {

        this.dataSource = dataSource;

        var self = this;

        var dataTablesObject = self.encodeModalTableObject.dataTable({

            "data": dataSource.dataTablesData(),
            "scrollX": true,
            "scrollY": "400px",
            "scrollCollapse": true,
            "paging": false,
            "columns": self.columnHeadings()
        });

        self.encodeModalTableObject.DataTable().columns.adjust();

        self.encodeModalTableObject.find('tbody').on('click', 'tr', function () {

            if ($(this).hasClass('selected')) {
                $(this).removeClass('selected');
            } else {
                $(this).addClass('selected');
            }

        });

        $('#igvEncodeModal').on('shown.bs.modal', function (e) {
            self.encodeModalTableObject.DataTable().columns.adjust();
        });

        $('#encodeModalTopCloseButton').on('click', function () {
            dataTablesObject.$('tr.selected').removeClass('selected');
        });

        $('#encodeModalBottomCloseButton').on('click', function () {
            dataTablesObject.$('tr.selected').removeClass('selected');
        });

        $('#encodeModalGoButton').on('click', function () {

            var tableRow,
                tableRows,
                tableCell,
                tableCells,
                record = {},
                configurations = [];

            tableRows = dataTablesObject.$('tr.selected');

            if (0 < tableRows.length) {

                tableRows.removeClass('selected');

                for (var i = 0; i < tableRows.length; i++) {

                    tableRow = tableRows[i];
                    tableCells = $('td', tableRow);

                    tableCells.each(function () {

                        var key,
                            val,
                            index;

                        tableCell = $(this)[0];

                        index = tableCell.cellIndex;
                        key = dataSource.dataSet.headings[ index ];
                        val = tableCell.innerHTML;

                        record[ key ] = val;

                    });

                    configurations.push({
                        type: "bed",
                        url: record.path,
                        name: self.encodeTrackLabel(record),
                        color: self.encodeAntibodyColor(record.antibody)
                    });

                } // for (tableRows)

                configurations[0].designatedTrack = (0 === igv.browser.trackViews.length) ? true : undefined;
                igv.browser.loadTrackWithConfigurations(configurations);


            }

        });

    };

    igv.EncodeTable.prototype.columnHeadings = function () {

        var widths = [ 5, 5, 10, 10, 5, 10, 10, 45],
            columnHeadings = [];

        this.dataSource.dataSet.headings.forEach(function(heading, i, headings){
            columnHeadings.push({ title: heading, width: (widths[ i ].toString() + "%") });
        });

        return columnHeadings;

    };

    igv.EncodeTable.prototype.encodeTrackLabel = function (record) {

        return (record.antibody) ? record.antibody + " " + record.cell + " " + record.replicate : record.cell + record.dataType + " " + record.view + " " + record.replicate;

    };

    igv.EncodeTable.prototype.encodeAntibodyColor = function (antibody) {

        var key;

        if (!antibody || "" === antibody) {
            return cursor.defaultColor();
        }

        key = antibody.toUpperCase();
        return (antibodyColors[ key ]) ? antibodyColors[ key ] : cursor.defaultColor();

    };

    igv.EncodeDataSource = function (config) {

        this.config = config;

    };

    igv.EncodeDataSource.prototype.loadDataSet = function (continuation) {

        this.dataSet = {};
        if (this.config.filePath) {
            this.loadFile(this.config.filePath, continuation);
        }

    };

    igv.EncodeDataSource.prototype.loadFile = function (file, continuation) {

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
            self.dataSet.headings = lines[0].split("\t");
            self.dataSet.headings.pop();
            item = self.dataSet.headings.shift();
            self.dataSet.headings.push(item);

            self.dataSet.rows = [];

            lines.slice(1, lines.length - 1).forEach(function (line) {

                var tokens,
                    row;

                tokens = line.split("\t");
                tokens.pop();
                item = tokens.shift();
                tokens.push(item);

                row = {};
                tokens.forEach(function (t, i, ts) {
                    var key = self.dataSet.headings[ i ];
                    row[ key ] = (undefined === t || "" === t) ? "-" : t;
                });

                self.dataSet.rows.push(row);

            });

            continuation();
        });

    };

    igv.EncodeDataSource.prototype.dataTablesData = function () {

        var self = this,
            result = [];

        self.dataSet.rows.forEach(function(row){

            var rr = [];
            self.dataSet.headings.forEach(function(heading){
                rr.push( row[ heading ] );
            });

            result.push( rr );
        });

        return result;
    };

    return igv;

})(igv || {});
