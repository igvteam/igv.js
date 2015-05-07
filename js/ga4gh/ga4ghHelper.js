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

                            tmp.forEach(function (a) {
                                var keep = true;           // TODO -- conditionally keep (downsample)
                                if (keep) {
                                    results.push(a);
                                }
                            });


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
                    return json.callSets;
                },
                success: function (results) {
                    options.success(results);
                }
            });
        }
    }


    igv.ga4gh = {
        providers: [
            {
                name: "Google",
                url: "https://www.googleapis.com/genomics/v1beta2",
                supportsPartialResponse: true,
                datasets: [
                    {name: "1000 Genomes", id: "10473108253681171589"},
                    {name: "Platinum Genomes", id: "3049512673186936334"},
                    {name: "DREAM SMC Challenge", id: "337315832689"},
                    {name: "PGP", id: "383928317087"},
                    {name: "Simons Foundation", id: "461916304629"}
                ]
            }
            ,
            {
                name: "Testing123",
                url: "https://www.googleapis.com/genomics/v1beta2",
                supportsPartialResponse: true,
                datasets: [
                    {name: "99 Genomes", id: "10473108253681171589"},
                    {name: "Silver Genomes", id: "3049512673186936334"},
                    {name: "Apocolypes", id: "337315832689"}
                ]
            },
            {
                name: "TotalBolix",
                url: "https://www.googleapis.com/genomics/v1beta2",
                supportsPartialResponse: true,
                datasets: [
                    {name: "2121 Magoo", id: "10473108253681171589"},
                    {name: "Monkey Shines", id: "3049512673186936334"},
                    {name: "Be The Woo", id: "337315832689"}
                ]
            }


        ]
    };

    igv.ga4ghBackEndSelectOptions = function () {

        var backend = $("#backend"),
            dataset = $("#dataset"),
            selected;

        igv.ga4gh.providers.forEach(function(p, index, ps){
            var option = $('<option>');

            option.val(index);
            option.text(p.name);
            backend.append(option);
        });

        // At this point, the first option should be pre-selected without user interaction
        selected = backend.val();

        backend.change(function() {

            $( "#backend option:selected" ).each(function() {

                var provider,
                    providerIndex,
                    selectedOption = $(this);

                providerIndex = parseInt( selectedOption.val() );
                provider = igv.ga4gh.providers[ providerIndex ];

                dataset.empty();
                provider.datasets.forEach(function(d, index, ds){

                    var option = $('<option>');
                    option.val(index);
                    option.text(d.name);
                    dataset.append(option);

                });



            });


        });

        dataset.change(function() {

            var providerIndex   = parseInt( $( "#backend option:selected").first().val() ),
                datasetIndex    = parseInt( $( "#dataset option:selected").first().val() ),
                provider,
                dataset;

            //provider = igv.ga4gh.providers[ providerIndex ];
            //dataset = provider.datasets[ datasetIndex ];

            provider = igv.ga4gh.providers[ 0 ];
            dataset = provider.datasets[ 1 ];

            igv.ga4ghSearchReadGroupSets({
                url: provider.url,
                datasetId: dataset.id,
                success: function (results) {

                    console.log("results " + results.length);
                }
            });

        });

    };

    return igv;

})(igv || {});