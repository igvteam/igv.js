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

(function (igv) {

    igv.ga4gh = {

        providerCurrent: undefined,
        datasetCurrent: undefined,

        providerChangeHandler: undefined,
        datasetChangeHandler: undefined,

        providers: [
            {
                name: "Google",
                url: "https://genomics.googleapis.com/v1",
                supportsPartialResponse: true,
                datasets: [
                    {name: "Platinum Genomes", id: "3049512673186936334"},
                    {name: "1000 Genomes", id: "10473108253681171589"},
                    {name: "Simons Foundation", id: "461916304629"},
                    {name: "DREAM SMC Challenge", id: "337315832689"},
                    {name: "PGP", id: "383928317087"}
                ]
            }
        ],

        initialize: function () {

            var providerElement = $("#provider"),
                datasetElement = $("#dataset"),
                inputSearchElement = $("#setName"),
            /*containerModal = $("#setSearch"),*/
            containerModal = $("#setSearch").find(".modal-dialog");

            igv.ga4gh.providers.forEach(function (p, index, ps) {

                var optionElement = $('<option>');
                optionElement.val(index);
                optionElement.text(p.name);
                providerElement.append(optionElement);
            });

            // provider
            igv.ga4gh.providerChangeHandler = function () {

                var optionElement = $("#provider option:selected").first();

                igv.ga4gh.providerCurrent = igv.ga4gh.providers[parseInt(optionElement.val())];

                datasetElement.empty();
                igv.ga4gh.providerCurrent.datasets.forEach(function (d, index, ds) {

                    var optionElement = $('<option>');
                    optionElement.val(index);
                    optionElement.text(d.name);
                    datasetElement.append(optionElement);

                });

                igv.ga4gh.datasetChangeHandler()
            };

            providerElement.change(igv.ga4gh.providerChangeHandler);

            // dataset
            igv.ga4gh.datasetChangeHandler = function () {

                var optionElement = $("#dataset option:selected").first(),
                    searchResultsElement = $("#searchPaneREADSET").find("ul.list-group");

                igv.ga4gh.datasetCurrent = igv.ga4gh.providerCurrent.datasets[parseInt(optionElement.val())];

                igv.startSpinnerAtParentElement(containerModal[ 0 ]);

                igv.ga4ghSearchReadAndCallSets({
                    url: igv.ga4gh.providerCurrent.url,
                    datasetId: igv.ga4gh.datasetCurrent.id,
                    success: function (results) {

                        igv.stopSpinnerAtParentElement(containerModal[ 0 ]);

                        searchResultsElement.empty();

                        results.forEach(function (result) {

                            var rowElement = $('<li class="list-group-item" style="display: block;">');
                            rowElement.text(result.name);

                            searchResultsElement.append(rowElement);

                            rowElement.click(function () {

                                if (result.callSetId && result.variantSetIds) {
                                    result.variantSetIds.forEach(function (variantSetId) {
                                        igv.browser.loadTrack({
                                            sourceType: 'ga4gh',
                                            type: 'variant',
                                            url: 'https://genomics.googleapis.com/v1',
                                            variantSetId: variantSetId,
                                            callSetIds: [result.callSetId],
                                            name: result.name + " variants",
                                            datasetId: result.datasetId
                                        })
                                    })
                                }

                                if (result.readGroupSetId) {
                                    igv.browser.loadTrack({
                                        sourceType: 'ga4gh',
                                        type: 'alignment',
                                        url: igv.ga4gh.providerCurrent.url,
                                        readGroupSetIds: result.readGroupSetId,
                                        label: result.name + " alignments",
                                        datasetId: result.datasetId
                                    });
                                }

                                $("#setSearch").modal("hide");

                            });

                        });

                    }
                });

            };

            datasetElement.change(igv.ga4gh.datasetChangeHandler);

            inputSearchElement.keyup(function () {

                if ("" === $(this).val()) {

                    igv.ga4gh.filterTrackList("reset");
                } else {

                    igv.ga4gh.filterTrackList($(this).val());

                }

            });

            // containerModal[ 0 ].appendChild( igv.spinner("64px") );

            // trigger handlers to pre-populate selects
            igv.ga4gh.providerChangeHandler();

        },

        filterTrackList: function (searchTerm) {

            var st = searchTerm.toLowerCase(),
                rows = $("#searchPaneREADSET").find("ul.list-group li");

            rows.each(function () {

                var term = $(this).text().toLowerCase();

                if ("reset" === st) {

                    $(this).show();
                } else {

                    if (term.indexOf(st) > -1) {
                        $(this).show();
                    } else {
                        $(this).hide();
                    }

                }

            });

        }

    };

    return igv;

})(igv || {});