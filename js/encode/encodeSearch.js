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
 * Created by jrobinso on 5/27/15.
 */

/**
 * Support functions for the Encode rest api  https://www.encodeproject.org/help/rest-api/
 */

var encode = (function (encode) {

    // var query1 = "https://www.encodeproject.org/search/?" +
    //     "type=experiment&" +
    //     "files.file_format=bed&" +
    //     "format=json&" +
    //     "limit=all&" +
    //     "field=replicates.library.biosample.donor.organism.name&" +
    //     "field=lab.title&field=biosample_term_name&" +
    //     "field=assay_term_name&" +
    //     "field=target.label&" +
    //     "field=files.file_format&" +
    //     "field=files.output_type&" +
    //     "field=files.href&" +
    //     "field=files.replicate.technical_replicate_number&" +
    //     "field=files.replicate.biological_replicate_number";

    var query2 = "https://www.encodeproject.org/search/?" +
        "type=experiment&" +
        "assembly=hg19&" +
        "files.output_type=peaks&" +
        "files.file_format=bed&" +
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

    encode.encodeSearch = function (continuation) {

        console.log('encode search - load json ...');
        igvxhr
            .loadJson(query2, {})
            .then(function (json) {

                var columnFormat,
                    rows;

                console.log('' +
                    '... done');

                console.log('parse/sort json ...');

                rows = [];
                _.each(json["@graph"], function (record) {

                    var cellType,
                        target,
                        filtered,
                        mapped;

                    cellType = record["biosample_term_name"] || '';

                    target = record.target ? record.target.label : '';

                    filtered = _.filter(record.files, function(file) {
                        return 'bed' === file.file_format;
                    });

                    mapped = _.map(filtered, function(file) {

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
                            "ExperimentID": record[ '@id' ],
                            "Cell Type": cellType,
                            "Assay Type": record.assay_term_name,
                            "Target": target,
                            "Lab": record.lab ? record.lab.title : "",
                            "Format": file.file_format,
                            "Type": file.output_type,
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

                console.log('... done');

                columnFormat =
                    {
                        'Assembly':8,
                        'Cell Type':8,
                        'Target':10,
                        'Assay Type':10,
                        'Bio Rep':8,
                        'Tech Rep':8,
                        'Lab':16
                    };

                continuation({
                    columns: _.keys(columnFormat),
                    columnWidths: _.values(columnFormat),
                    rows: rows
                });

            });

    };


    return encode;
})
(encode || {});