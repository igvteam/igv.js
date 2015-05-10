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

var igv = (function (igv) {

    igv.ga4ghGet = function (options) {

        var url = options.url + "/" + options.entity + "/" + options.entityId,
            options,
            headers,
            acToken = oauth.google.access_token,
            apiKey = oauth.google.apiKey,
            paramSeparator = "?";

        if (apiKey) {
            url = url + paramSeparator + "key=" + apiKey;
            paramSeparator = "&";
        }

        if (acToken) {
            url = url + paramSeparator + "access_token=" + encodeURIComponent(acToken);
        }

        options = {
            success: options.success,
            task: options.task,
            headers: ga4ghHeaders()
        };

        igvxhr.loadJson(url, options);
    }

    igv.ga4ghSearch = function (options) {

        var results = [],
            url = options.url,
            body = options.body,
            decode = options.decode,
            success = options.success,
            task = options.task,
            acToken = oauth.google.access_token,
            apiKey = oauth.google.apiKey,
            paramSeparator = "?";

        if (apiKey) {
            url = url + paramSeparator + "key=" + apiKey;
            paramSeparator = "&";
        }

        if (acToken) {
            url = url + paramSeparator + "access_token=" + encodeURIComponent(acToken);
        }


        // Start the recursive load cycle.  Data is fetched in chunks, if more data is available a "nextPageToken" is returned.
        loadChunk();

        function loadChunk(pageToken) {

            if (pageToken) {
                body.pageToken = pageToken;
            }
            else {
                if (body.pageToken != undefined) delete body.pageToken;    // Remove previous page token, if any
            }

            var sendData = JSON.stringify(body);

            igvxhr.loadJson(url,
                {
                    sendData: sendData,
                    task: task,
                    contentType: "application/json",
                    headers: ga4ghHeaders(),
                    success: function (json) {
                        var nextPageToken, tmp;

                        if (json) {

                            tmp = decode ? decode(json) : json;

                            if (tmp) {

                                tmp.forEach(function (a) {
                                    var keep = true;           // TODO -- conditionally keep (downsample)
                                    if (keep) {
                                        results.push(a);
                                    }
                                });
                            }


                            nextPageToken = json["nextPageToken"];

                            if (nextPageToken) {
                                loadChunk(nextPageToken);
                            }
                            else {
                                success(results);
                            }
                        }
                        else {
                            success(results);
                        }

                    }
                });
        }
    }

    function ga4ghHeaders() {

        var headers = {},
            acToken = oauth.google.access_token;

        headers["Cache-Control"] = "no-cache";
        if (acToken) {
            headers["Authorization"] = "Bearer " + acToken;
        }
        return headers;

    }

    igv.ga4ghSearchReadGroupSets = function (options) {

        igv.ga4ghSearch({
            url: options.url + "/readgroupsets/search",
            body: {
                "datasetIds": [options.datasetId],

                "pageSize": "10000"
            },
            decode: function (json) {
                return json.readGroupSets;
            },
            success: function (results) {
                options.success(results);
            }
        });
    }

    igv.ga4ghSearchVariantSets = function (options) {

        igv.ga4ghSearch({
            url: options.url + "/variantsets/search",
            body: {
                "datasetIds": [options.datasetId],
                "pageSize": "10000"
            },
            decode: function (json) {
                return json.variantSets;
            },
            success: function (results) {
                options.success(results);
            }
        });
    }

    igv.ga4ghSearchCallSets = function (options) {

        // When searching by dataset id, first must get variant sets.
        if (options.datasetId) {

            igv.ga4ghSearchVariantSets({

                url: options.url,
                datasetId: options.datasetId,
                success: function (results) {

                    var variantSetIds = [];
                    results.forEach(function (vs) {
                        variantSetIds.push(vs.id);
                    });

                    // Substitute variantSetIds for datasetId
                    options.datasetId = undefined;
                    options.variantSetIds = variantSetIds;

                    igv.ga4ghSearchCallSets(options);


                }
            });

        }

        else {

            igv.ga4ghSearch({
                url: options.url + "/callsets/search",
                body: {
                    "variantSetIds": options.variantSetIds,
                    "pageSize": "10000"
                },
                decode: function (json) {

                    if (json.callSets) json.callSets.forEach(function (cs) {
                        cs.variantSetIds = options.variantSetIds;
                    });

                    return json.callSets;
                },
                success: function (results) {
                    options.success(results);
                }
            });
        }
    }


    /**
     * Method to support ga4gh application
     *
     * @param options
     */
    igv.ga4ghSearchReadAndCallSets = function (options) {

        igv.ga4ghSearchReadGroupSets({
            url: options.url,
            datasetId: options.datasetId,
            success: function (readGroupSets) {
                igv.ga4ghSearchCallSets({
                    url: options.url,
                    datasetId: options.datasetId,
                    success: function (callSets) {

                        // Merge call sets and read group sets

                        var csHash = {};
                        callSets.forEach(function (cs) {
                            csHash[cs.name] = cs;
                        });

                        var mergedResults = [];
                        readGroupSets.forEach(function (rg) {
                            var m = {readGroupSetId: rg.id, name: rg.name, datasetId: options.datasetId},
                                cs = csHash[rg.name];
                            if (cs) {
                                m.callSetId = cs.id;
                                m.variantSetIds = cs.variantSetIds;
                            }
                            mergedResults.push(m);
                        });

                        options.success(mergedResults);

                    }
                });
            }
        });

    }


    return igv;

})(igv || {});