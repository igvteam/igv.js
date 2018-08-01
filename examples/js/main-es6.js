import igv from '../../dist/igv.es6.min.js'

(function () {

    var igvDiv,
        options;

    igvDiv = document.getElementById("igv-div");
    options =
    {
        showNavigation: true,
        showRuler: true,
        genome: "hg19",
        locus: 'chr7',
        tracks: [
            {
                url: 'https://data.broadinstitute.org/igvdata/test/igv-web/segmented_data_080520.seg.gz',
                indexed: false,
                isLog: true,
                name: 'Segmented CN'
            },
            {
                name: "Genes",
                type: "annotation",
                format: "bed",
                sourceType: "file",
                url: "https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg19/genes/refGene.hg19.bed.gz",
                indexURL: "https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg19/genes/refGene.hg19.bed.gz.tbi",
                order: Number.MAX_VALUE,
                visibilityWindow: 300000000,
                displayMode: "EXPANDED"
            }
        ]
    };


    igv.createBrowser(igvDiv, options);

})()