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

    igv.ga4gh = {

        providerCurrent: undefined,
        datasetCurrent: undefined,

        providerChangeHandler: undefined,
        datasetChangeHandler: undefined,

        providers: [
            {
                name: "Google",
                url: "https://www.googleapis.com/genomics/v1beta2",
                supportsPartialResponse: true,
                datasets: [
                    {name: "Simons Foundation", id: "461916304629"},
                    {name: "1000 Genomes", id: "10473108253681171589"},
                    {name: "Platinum Genomes", id: "3049512673186936334"},
                    {name: "DREAM SMC Challenge", id: "337315832689"},
                    {name: "PGP", id: "383928317087"}
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


        ],

        initialize: function () {

            var providerElement = $("#provider"),
                datasetElement = $("#dataset"),
                inputSearchElement = $("#setName");

            igv.ga4gh.providers.forEach(function (p, index, ps) {

                var optionElement = $('<option>');
                optionElement.val(index);
                optionElement.text(p.name);
                providerElement.append(optionElement);
            });

            // provider
            igv.ga4gh.providerChangeHandler = function () {

                var optionElement = $("#provider option:selected").first();

                igv.ga4gh.providerCurrent = igv.ga4gh.providers[ parseInt(optionElement.val()) ];

                datasetElement.empty();
                igv.ga4gh.providerCurrent.datasets.forEach(function (d, index, ds) {

                    var optionElement = $('<option>');
                    optionElement.val(index);
                    optionElement.text(d.name);
                    datasetElement.append(optionElement);

                });

            };

            providerElement.change(igv.ga4gh.providerChangeHandler);

            // dataset
            igv.ga4gh.datasetChangeHandler = function () {

                var optionElement = $("#dataset option:selected").first(),
                    searchResultsElement = $("#searchResults");

                igv.ga4gh.datasetCurrent = igv.ga4gh.providerCurrent.datasets[ parseInt(optionElement.val()) ];

                igv.ga4ghSearchReadGroupSets({
                    url: igv.ga4gh.providerCurrent.url,
                    datasetId: igv.ga4gh.datasetCurrent.id,
                    success: function (results) {

                        searchResultsElement.empty();

                        results.forEach(function (result) {

                            var rowElement = $('<a href="#" class="list-group-item" style="display: block;">');
                            rowElement.text(result.name);

                            searchResultsElement.append(rowElement);

                            rowElement.click(function () {

                                igv.browser.loadTrack(
                                    {
                                        sourceType: 'ga4gh',
                                        type: 'bam',
                                        url: igv.ga4gh.providerCurrent.url,
                                        readGroupSetIds: result.id,
                                        label: result.name
                                    }
                                );

                                $("#setSearch").modal("hide");

                            });

                        });

                    }
                });

            };

            datasetElement.change(igv.ga4gh.datasetChangeHandler);

            inputSearchElement.keyup(function() {

                if ("" === $(this).val()) {

                    igv.ga4gh.traverseDataset( "reset" );
                } else {

                    igv.ga4gh.traverseDataset( $(this).val() );

                }

            });

            // trigger handlers to pre-populate selects
            igv.ga4gh.providerChangeHandler();
            igv.ga4gh.datasetChangeHandler();
        },

        traverseDataset:function (searchTerm) {

            console.log("traverseDataset.begin " + searchTerm);
            $("#searchResults").find("a").each(function(){

                // do stuff

            });
            console.log("traverseDataset.end  " + searchTerm);

        }

    };

    return igv;

})(igv || {});