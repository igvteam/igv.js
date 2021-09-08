// Configure loading modules from the dist directory,
// except for 'app' ones, which are in a sibling
// directory.
requirejs.config({
    baseUrl: '../dist'
});

// Start loading the main app file. Put all of
// your application logic in there.
requirejs(['igv'], function (igv) {


    var igvDiv = document.getElementById("igv-div");
    
    var options =
    {
        showNavigation: true,
        showRuler: true,
        genome: "hg19",
        locus: 'chr7',
        tracks: [
            {
                url: 'https://s3.amazonaws.com/igv.org.demo/GBM-TP.seg.gz',
                indexed: false,
                isLog: true,
                name: 'Segmented CN'
            }
        ]
    };


    igv.createBrowser(igvDiv, options);

});