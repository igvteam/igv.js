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

var igv = (function (igv) {

    var query1 = "https://www.encodeproject.org/search/?" +
        "type=experiment&" +
        "files.file_format=bed&" +
        "format=json&" +
        "limit=all&" +
        "field=replicates.library.biosample.donor.organism.name&" +
        "field=lab.title&field=biosample_term_name&" +
        "field=assay_term_name&" +
        "field=target.label&" +
        "field=files.file_format&" +
        "field=files.output_type&" +
        "field=files.href&" +
        "field=files.replicate.technical_replicate_number&" +
        "field=files.replicate.biological_replicate_number";

    var query2 = "https://www.encodeproject.org/search/?" +
        "type=experiment&" +
            // "assembly=hg19&" +
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

    igv.encodeSearch = function (continuation) {

        igvxhr.loadJson(query2, {

            success: function (json) {

                var columns = ["Assembly", "Cell Type", "Target", "Assay Type", "Bio Rep", "Tech Rep", "Lab"],
                    columnWidths = [8,      20,          10,       10,           8,        8,        40],
                    rows = [];

                json["@graph"].forEach(function (record) {

                    var assayType = record.assay_term_name,
                        experimentId = record["@id"],
                        cellType = record["biosample_term_name"] || "",
                        target = record.target ? record.target.label : "",
                        lab = record.lab ? record.lab.title : "";


                    record.files.forEach(function (file) {

                        if (file.file_format === "bed") {

                            var format = file.file_format,
                                type = file.output_type,
                                bioRep = file.replicate ? file.replicate.bioligcal_replicate_number : undefined,
                                techRep = file.replicate ? file.replicate.technical_replicate_number : undefined,
                                name = cellType + " " + target,
                                assembly = file.assembly;
                            if (bioRep) name += " " + bioRep;
                            if (techRep) name += (bioRep ? ":" : "0:") + techRep;

                            rows.push({
                                "Assembly": assembly,
                                "ExperimentID": experimentId,
                                "Cell Type": cellType,
                                "Assay Type": assayType,
                                "Target": target,
                                "Lab": lab,
                                "Format": format,
                                "Type": type,
                                "url": "https://www.encodeproject.org" + file.href,
                                "Bio Rep": bioRep,
                                "Tech Rep": techRep,
                                "Name": name
                            });
                        }
                    });

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

                continuation({
                    columns: columns,
                    columnWidths: columnWidths,
                    rows: rows
                });

            }

        });

    }


    return igv;
})
(igv || {});