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
        providerIndex: undefined,
        datasetIndex: undefined,
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


        ],

        initialize: function () {

            var backend = $("#provider"),
                dataset = $("#dataset"),
                providerSelected,
                datasetSelected;

            // init markup
            igv.ga4gh.providers.forEach(function (p, index, ps) {

                var option = $('<option>');
                option.val(index);
                option.text(p.name);
                backend.append(option);
            });

            backend.change(function () {

                var backEndOption = $("#provider option:selected").first(),
                    provider;

                igv.ga4gh.providerIndex = parseInt(backEndOption.val());

                provider = igv.ga4gh.providers[igv.ga4gh.providerIndex];

                dataset.empty();
                provider.datasets.forEach(function (d, index, ds) {

                    var option = $('<option>');
                    option.val(index);
                    option.text(d.name);
                    dataset.append(option);

                });

            });

            dataset.change(function () {

                var datasetOption = $("#dataset option:selected").first(),
                    provider,
                    dataset,
                    searchResults = $("#searchResults");

                igv.ga4gh.datasetIndex = parseInt(datasetOption.val());

                provider = igv.ga4gh.providers[igv.ga4gh.providerIndex];
                dataset = provider.datasets[igv.ga4gh.datasetIndex];

                igv.ga4ghSearchReadGroupSets({
                    url: provider.url,
                    datasetId: dataset.id,
                    success: function (rows) {

                        searchResults.empty();
                        rows.forEach(function (r) {

                            var row = $('<a href="#" class="list-group-item" style="display: block;">');
                            row.text(r.name);

                            searchResults.append(row);

                            row.click(function () {

                                igv.browser.loadTrack(
                                    {
                                        sourceType: 'ga4gh',
                                        type: 'bam',
                                        url: provider.url,
                                        readGroupSetIds: r.id,
                                        label: r.name
                                    }
                                );

                                $("#setSearch").modal("hide");

                            });

                        });
                    }
                });

            });
        },


    };


    return igv;

})(igv || {});