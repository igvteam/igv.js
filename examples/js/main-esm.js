import igv from '../../dist/igv.esm.min.js'

(function () {

    const igvDiv = document.getElementById("igv-div");

    const options =
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
            }
        ]
    };


    igv.createBrowser(igvDiv, options)

        .then(function (browser) {
            console.log("Created IGV browser");
        })


})()