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

    encode.EncodeDataSource = function () {
    };

    encode.EncodeDataSource.prototype.retrieveJSon = function (assembly, continuation) {

        var self = this,
            fileFormat,
            query;

        fileFormat = "bigWig";

        query = "https://www.encodeproject.org/search/?" +
            "type=experiment&" +
            "assembly=" + assembly + "&" +
            "files.file_format=" + fileFormat + "&" +
            "format=json&" +
            "field=lab.title&" +
            "field=biosample_term_name&" +
            "field=assay_term_name&" +
            "field=target.label&" +
            "field=files.file_format&" +
            "field=files.output_type&" +
            "field=files.href&" +
            "field=files.replicate.technical_replicate_number&" +
            "field=files.replicate.biological_replicate_number&" +
            "field=files.assembly&" +
            "limit=all";


        igvxhr
            .loadJson(query, {})
            .then(function (json) {

                var rows,
                    obj;

                console.log('then - done');

                console.log('then - parse/sort json ...');

                rows = [];
                _.each(json["@graph"], function (record) {

                    var cellType,
                        target,
                        filtered,
                        mapped;


                    cellType = record["biosample_term_name"] || '';

                    target = record.target ? record.target.label : '';

                    filtered = _.filter(record.files, function (file) {
                        return fileFormat === file.file_format && assembly === file.assembly;
                    });

                    mapped = _.map(filtered, function (file) {

                        var bioRep = file.replicate ? file.replicate.bioligcal_replicate_number : undefined,
                            techRep = file.replicate ? file.replicate.technical_replicate_number : undefined,
                            name = cellType + " " + target;

                        if (bioRep) {
                            name += " " + bioRep;
                        }

                        if (techRep) {
                            name += (bioRep ? ":" : "0:") + techRep;
                        }

                        return {
                            "Assembly": file.assembly,
                            "ExperimentID": record['@id'],
                            "Cell Type": cellType,
                            "Assay Type": record.assay_term_name,
                            "Target": target,
                            "Lab": record.lab ? record.lab.title : "",
                            "Format": file.file_format,
                            "Output Type": file.output_type,
                            "url": "https://www.encodeproject.org" + file.href,
                            "Bio Rep": bioRep,
                            "Tech Rep": techRep,
                            "Name": name
                        };

                    });

                    Array.prototype.push.apply(rows, mapped);

                });

                rows.sort(function (a, b) {
                    var a1 = a["Assembly"],
                        a2 = b["Assembly"],
                        ct1 = a["Cell Type"],
                        ct2 = b["Cell Type"],
                        t1 = a["Target"],
                        t2 = b["Target"];

                    if (a1 === a2) {
                        if (ct1 === ct2) {
                            if (t1 === t2) {
                                return 0;
                            }
                            else if (t1 < t2) {
                                return -1;
                            }
                            else {
                                return 1;
                            }
                        }
                        else if (ct1 < ct2) {
                            return -1;
                        }
                        else {
                            return 1;
                        }
                    }
                    else {
                        if (a1 < a2) {
                            return -1;
                        }
                        else {
                            return 1;
                        }
                    }
                });

                console.log('then - done');

                obj = {
                    columns: [ 'Assembly', 'Cell Type', 'Target', 'Assay Type', 'Output Type', 'Lab' ],
                    rows: rows
                };

                console.log('then - ingestData() ...');
                self.ingestData(obj, function () {
                    continuation();
                });


            });

    };

    encode.EncodeDataSource.prototype.ingestData = function (data, continuation) {

        if (data instanceof File) {
            this.ingestFile(data, continuation);
        } else if (data instanceof Object) {
            this.ingestJSON(data, continuation);
        }

    };

    encode.EncodeDataSource.prototype.ingestJSON = function (json, continuation) {

        var self = this;

        this.jSON = json;

        json.rows.forEach(function(row, i){

            Object.keys(row).forEach(function(key){
                var item = row[ key ];
                self.jSON.rows[ i ][ key ] = (undefined === item || "" === item) ? "-" : item;
            });

        });

        console.log('ingestJSON - done');

        continuation();

    };

    encode.EncodeDataSource.prototype.ingestFile = function (file, continuation) {

        var self = this;

        this.jSON = {};
        igvxhr.loadString(file).then(function (data) {

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

    encode.EncodeDataSource.prototype.dataTablesData = function () {

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

    encode.EncodeDataSource.prototype.getColumns = function () {

        var widths,
            columns;

        widths =
            {
                'Assembly': '10%',
                'Cell Type': '10%',
                'Target': '10%',
                'Assay Type': '20%',
                'Output Type': '20%',
                'Lab': '20%'
            };

        columns = _.map(this.jSON.columns, function (heading, i) {
            return { title:heading, width:widths[ heading ] }
        });

        columns.unshift({ title:'index', width:'10%' });

        return columns;

    };

    return encode;

})(encode || {});
