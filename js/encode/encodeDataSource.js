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

    /**
     * @param config      dataSource configuration
     * @param tableFormat table formatting object (see for example EncodeTableFormat)
     */
    igv.EncodeDataSource = function (config, tableFormat) {
        this.config = config;
        this.tableFormat = tableFormat;
    };

    igv.EncodeDataSource.prototype.retrieveData = function (continuation) {

        var self = this,
            fileFormat,
            assembly,
            query;

        assembly = this.config.genomeID;
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

        // TODO - Test Error Handling with this URL.
        // query = "https://www.encodeproject.org/search/?type=experiment&assembly=/work/ea14/juicer/references/genome_collection/Hs2-HiC.chrom.sizes&files.file_format=bigWig&format=json&field=lab.title&field=biosample_term_name&field=assay_term_name&field=target.label&field=files.file_format&field=files.output_type&field=files.href&field=files.replicate.technical_replicate_number&field=files.replicate.biological_replicate_number&field=files.assembly&limit=all";

        igv.xhr
            .loadJson(query, {})
            .then(function (json) {

                var rows,
                    obj;

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

                obj = {
                    columns: [ 'Assembly', 'Cell Type', 'Target', 'Assay Type', 'Output Type', 'Lab' ],
                    rows: rows
                };

                ingestData(obj, function (json) {
                    continuation(json);
                });


            })
            .catch(function (e) {
                continuation(undefined);
            });

    };

    igv.EncodeDataSource.prototype.dataAtRowIndex = function (index) {
        var row,
            obj;

        row =  this.jSON.rows[ index ];

        obj =
            {
                url: row[ 'url' ],
                color: encodeAntibodyColor(row[ 'Target' ]),
                name: row['Name']
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

            if (undefined === antibody || '' === antibody || '-' === antibody) {
                key = 'DEFAULT';
            } else {
                key = antibody.toUpperCase();
            }

            return colors[ key ];

        }

        return obj;
    };

    igv.EncodeDataSource.prototype.tableData = function () {
        return this.tableFormat.tableData(this.jSON);
    };

    igv.EncodeDataSource.prototype.tableColumns = function () {
        return this.tableFormat.tableColumns(this.jSON);
    };

    function ingestData(data, continuation) {

        if (data instanceof File) {
            getFile.call(this, data, continuation);
        } else if (data instanceof Object) {
            getJSON.call(this, data, continuation);
        }

        function getJSON(json, continuation) {

            json.rows.forEach(function(row, i){

                Object.keys(row).forEach(function(key){
                    var item = row[ key ];
                    json.rows[ i ][ key ] = (undefined === item || "" === item) ? "-" : item;
                });

            });

            continuation(json);
        }

        function getFile(file, continuation) {

            var json;

            json = {};
            igv.xhr.loadString(file).then(function (data) {

                var lines = data.splitLines(),
                    item;

                // Raw data items order:
                // path | cell | dataType | antibody | view | replicate | type | lab | hub
                //
                // Reorder to match desired order. Discard hub item.
                //
                json.columns = lines[0].split("\t");
                json.columns.pop();
                item = json.columns.shift();
                json.columns.push(item);

                json.rows = [];

                lines.slice(1, lines.length - 1).forEach(function (line) {

                    var tokens,
                        row;

                    tokens = line.split("\t");
                    tokens.pop();
                    item = tokens.shift();
                    tokens.push(item);

                    row = {};
                    tokens.forEach(function (t, i, ts) {
                        var key = json.columns[ i ];
                        row[ key ] = (undefined === t || "" === t) ? "-" : t;
                    });

                    json.rows.push(row);

                });

                continuation(json);
            });

        }

    }

    return igv;

})(igv || {});
