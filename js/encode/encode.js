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

        var self = this,
            dataTablesObject = self.encodeModalTableObject.dataTable({

            "data": dataSource.dataTablesData(),
            "scrollX": true,
            "scrollY": "400px",
            "scrollCollapse": true,
            "paging": false,
            "columns": dataSource.columnHeadings()
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
                tableRowsSelected,
                tableCell,
                tableCells,
                dataSourceJSONRow,
                record = {},
                configurations = [];

            tableRowsSelected = dataTablesObject.$('tr.selected');

            if (0 < tableRowsSelected.length) {

                tableRowsSelected.removeClass('selected');

                for (var i = 0; i < tableRowsSelected.length; i++) {

                    dataSourceJSONRow = dataSource.jSON.rows[ i ];

                    configurations.push({
                        type: dataSourceJSONRow[ "Format" ],
                        url: dataSourceJSONRow[ "url" ],
                        name: dataSourceJSONRow[ "ExperimentID" ],
                        color: /*self.encodeAntibodyColor(record.antibody)*/ "grey"
                    });

                } // for (tableRows)

                configurations[0].designatedTrack = (0 === igv.browser.trackViews.length) ? true : undefined;
                igv.browser.loadTrackWithConfigurations(configurations);


            }

        });

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

        var columnKeysHash,
            resultKeys = this.jSON.columns.slice(),
            result = [];

        // Match result array order to column order.

        // Add column names
        columnKeysHash = {};
        this.jSON.columns.forEach(function(column){
            columnKeysHash[ column ] = true;
        });

        // Add row keys not present in column names
        Object.keys( this.jSON.rows[ 0 ] ).forEach(function(key){

            if (true === columnKeysHash[ key ]) {
               // do nothing
            } else {
                resultKeys.push(key);
            }
        });

        // result keys now match order of column names
        this.jSON.rows.forEach(function(row){

            var rr = [];
            resultKeys.forEach(function(key){
                rr.push( row[ key ] );
            });

            result.push( rr );
        });

        return result;
    };

    igv.EncodeDataSource.prototype.columnHeadings = function () {

        var columnWidths = [ 20, 16, 16, 16, 16, 16],
            columnHeadings = [];

        this.jSON.columns.forEach(function(heading, i){
            columnHeadings.push({ title: heading, width: (columnWidths[ i ].toString() + "%") });
        });

        return columnHeadings;

    };

    return igv;

})(igv || {});
