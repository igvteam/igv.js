var igv = (function (igv) {

    "use strict";

    igv.FileFormats = {

        gwascatalog: {
            fields: [
                'bin',
                'chr',
                'start',
                'end',
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
            fields:
                [
                    'bin',
                    'chr',
                    'start',
                    'end',
                    'name',
                    'score',
                    'strand',
                    'thickStart',
                    'thickEnd',
                    'type'
                ]
        },

        cpgislandext: {
            fields:

                [
                    'bin',
                    'chr',
                    'start',
                    'end',
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