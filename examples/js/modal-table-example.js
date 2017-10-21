/*
 *  The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 The Regents of the University of California
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the
 * following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,  FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */
var modal_table_example = (function (modal_table_example) {

    modal_table_example.init = function ($container) {

        $(document).ready(function () {
            var options,
                config,
                browser,
                columnFormat,
                encodeTableFormat,
                encodeDatasource;

            options = {
                minimumBases: 6,
                showIdeogram: true,
                showRuler: true,
                locus: '1',
                reference:
                    {
                        id: "hg19",
                        fastaURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/1kg_v37/human_g1k_v37_decoy.fasta",
                        cytobandURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/b37/b37_cytoband.txt"
                    },
                flanking: 1000,
                apiKey: 'AIzaSyDUUAUFpQEN4mumeMNIRWXSiTh5cPtUAD0',
                palette:
                    [
                        "#00A0B0",
                        "#6A4A3C",
                        "#CC333F",
                        "#EB6841"
                    ],
                tracks:
                    [
                        {
                            name: "Genes",
                            searchable: false,
                            type: "annotation",
                            format: "gtf",
                            sourceType: "file",
                            url: "https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg19/genes/gencode.v18.annotation.sorted.gtf.gz",
                            indexURL: "https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg19/genes/gencode.v18.annotation.sorted.gtf.gz.tbi",
                            visibilityWindow: 10000000,
                            order: Number.MAX_VALUE,
                            displayMode: "EXPANDED"
                        }
                    ]
            };

            browser = igv.createBrowser($container.get(0), options);

            columnFormat =
                {
                    'Assembly': 75,
                    'Cell Type': 75,
                    'Target': 75,
                    'Assay Type': 150,
                    'Output Type': 150,
                    'Lab': 150
                };

            columnFormat =
                [
                    {    'Assembly': 75 },
                    {   'Cell Type': 75 },
                    {      'Target': 75 },
                    {  'Assay Type': 150 },
                    { 'Output Type': 150 },
                    {         'Lab': 150 }

                ];

            encodeTableFormat = new igv.EncodeTableFormat(columnFormat);

            encodeDatasource = new igv.EncodeDataSource({genomeID: 'hg19'});

            config =
                {
                    $modal:$('#encodeModal'),
                    $modalBody:$('#mte-modal-body'),
                    $modalTopCloseButton: $('#encodeModalTopCloseButton'),
                    $modalBottomCloseButton: $('#encodeModalBottomCloseButton'),
                    $modalGoButton: $('#encodeModalGoButton'),
                    browserRetrievalFunction:function () { return browser; },
                    browserLoadFunction:'loadTracksWithConfigList'
                };
            browser.encodeTable = new igv.ModalTable(config, encodeDatasource, encodeTableFormat);

        })

    };

    return modal_table_example;

})(modal_table_example || {});