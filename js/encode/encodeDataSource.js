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

                var rows;

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

                getClusterizeData.call(self, rows, [ 'Assembly', 'Cell Type', 'Target', 'Assay Type', 'Output Type', 'Lab' ], function (fancyData) {
                    continuation(fancyData);
                });

            })
            .catch(function (e) {
                continuation(undefined);
            });

    };

    function getClusterizeData(rows, columns, continuation) {

        var self = this,
            picked;

        rows.sort(function (a, b) {
            var aa1,
                aa2,
                cc1,
                cc2,
                tt1,
                tt2;

            aa1 = a['Assembly' ]; aa2 = b['Assembly' ];
            cc1 = a['Cell Type']; cc2 = b['Cell Type'];
            tt1 = a['Target'   ]; tt2 = b['Target'   ];

            if (aa1 === aa2) {
                if (cc1 === cc2) {
                    if (tt1 === tt2) {
                        return 0;
                    } else if (tt1 < tt2) {
                        return -1;
                    } else {
                        return 1;
                    }
                } else if (cc1 < cc2) {
                    return -1;
                } else {
                    return 1;
                }
            } else {
                if (aa1 < aa2) {
                    return -1;
                } else {
                    return 1;
                }
            }
        });

        picked = _.map(rows, function (row, index) {
            var mapped;

            mapped = _.map(_.values(_.pick(row, columns)), function (value, index) {
                return '<div>' + value + '</div>';
            });

            // mapped.unshift('<div>' + index + '</div>');

            return '<div>' + mapped.join('') + '</div>';
        });

        continuation(picked);
    }

    function getFancyData(rows, columns, continuation) {

        var self = this,
            mapped_and_fancied;

        mapped_and_fancied = _.map(rows, function (row) {
            var picked,
                fancied;

            picked = _.pick(row, columns);

            fancied = {};
            _.each(_.keys(picked), function (key) {
                var kk;
                kk = self.tableFormat.indices[ key ];
                fancied[ kk ] = picked[ key ];
            });

            _.each(_.keys(fancied), function (key) {
                if (undefined === fancied[ key ] || '' === fancied[ key ]) {
                    fancied[ key ] = '-';
                }
            });

            return fancied;
        });

        continuation(mapped_and_fancied);
    }

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

    return igv;

})(igv || {});
