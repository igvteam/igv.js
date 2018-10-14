var igv = (function (igv) {

    "use strict";

    igv.FileFormats = {

        gwascatalog: {
            chr: 1,
            start: 2,
            end: 3,
            fields: [
                'bin',
                'chrom',
                'chromStart',
                'chromEnd',
                'name',
                'pubMedID',
                'author',
                'pubDate',
                'journal',
                'title',
                'trait',
                'initSample',
                'replSample',
                'region',
                'genes',
                'riskAllele',
                'riskAlFreq',
                'pValue',
                'pValueDesc',
                'orOrBeta',
                'ci95',
                'platform',
                'cnv'
            ]
        },

        wgrna: {
            chr: 1,
            start: 2,
            end: 3,
            fields: [
                'bin',
                'chrom',
                'chromStart',
                'chromEnd',
                'name',
                'score',
                'strand',
                'thickStart',
                'thickEnd',
                'type'
            ]
        },

        cpgislandext: {

            chr: 1,
            start: 2,
            end: 3,
            fields: [
                'bin',
                'chrom',
                'chromStart',
                'chromEnd',
                'name',
                'length',
                'cpgNum',
                'gcNum',
                'perCpg',
                'perGc',
                'obsExp'
            ]

        }

    }


    return igv;
})(igv || {});