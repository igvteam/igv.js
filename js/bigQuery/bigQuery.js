/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016 University of California San Diego
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

var igv = (function (igv) {


    igv.bigQuery = function (options) {

        if (!options.projectId) {
            //todo throw error
        }

        query(options);
    }

    function query(options) {

        var url = "https://clients6.google.com/bigquery/v2/projects/" + options.projectId + "/queries",
            body = {
                "kind": "bigquery#queryRequest",
                "query": options.queryString,
                "maxResults": 1000,
                "timeoutMs": 5000,
                "dryRun": false,
                "preserveNulls": true,
                "useQueryCache": true
            },
            decode = options.decode,
            success = options.success,
            task = options.task,
            apiKey = oauth.google.apiKey,
            jobId,
            paramSeparator = "&";

        url = url + "?alt=json"

        if (apiKey) {
            url = url + paramSeparator + "key=" + apiKey;
        }

        var sendData = JSON.stringify(body);

        igvxhr.loadJson(url,
            {
                sendData: sendData,
                task: task,
                contentType: "application/json",
                success: function (response) {

                    var results = [],
                        totalRows,
                        jobId = response.jobReference.jobId;


                    if (response.jobComplete === true) {

                        totalRows = response.totalRows;

                        response.rows.forEach(function (row) {
                            results.push(decode(row));
                        });

                        if (results.length < totalRows) {
                            getQueryResults(options);
                        }
                        else {
                            success(results);
                        }
                    }
                    else {
                        setTimeout(function () {
                            getQueryResults(options);
                        }, 1000);
                    }


                    function getQueryResults(options) {

                        var url = "https://clients6.google.com/bigquery/v2/projects/" + options.projectId + "/queries/" + jobId,
                            decode = options.decode,
                            success = options.success,
                            task = options.task,
                            apiKey = oauth.google.apiKey,
                            paramSeparator = "&";

                        url = url + "?alt=json"

                        if (apiKey) {
                            url = url + paramSeparator + "key=" + apiKey;
                        }

                        if (options.maxResults) {
                            url = url + "&maxResults=" + options.maxResults;
                        }

                        if (results.length > 0) {
                            url = url + ("&startIndex=" + results.length);
                        }
                        
                        igvxhr.loadJson(url,
                            {
                                task: task,
                                contentType: "application/json",
                                success: function (response) {

                                    if (response.jobComplete === true) {

                                        totalRows = response.totalRows;

                                        response.rows.forEach(function (row) {
                                            results.push(decode(row));
                                        });

                                        if (results.length < totalRows) {
                                            getQueryResults(options);
                                        }
                                        else {
                                            success(results);
                                        }

                                    }
                                    else {
                                        setTimeout(function () {
                                            getQueryResults(options);
                                        }, 1000);
                                    }


                                }
                            });

                    }

                }
            });
    }


    function decodeSeg(row) {

        var seg = {};
        seg["ParticipantBarcode"] = row.f[0].v;
        seg["Study"] = row.f[4].v;
        seg["Chromosome"] = row.f[6].v;
        seg["Start"] = row.f[7].v;
        seg["End"] = row.f[8].v;
        seg["Num_Probes"] = row.f[9].v;
        seg["Segment_mean"] = row.f[10].v;
        return seg;
    }


    return igv;

})(igv || {});