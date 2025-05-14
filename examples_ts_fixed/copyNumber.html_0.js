import igv from "../dist/igv.esm.min.js";
const version = igv.version();
console.log("Using IGV version: " + version);
const igvDiv = document.getElementById("igv-div");
const options = {
    genome: "hg19",
    showSampleNames: true,
    tracks: [
        {
            name: "Explicit Samples",
            type: "seg",
            format: "seg",
            samples: [
                "TCGA-06-0168-01A-02D-0236-01",
                "TCGA-02-0115-01A-01D-0193-01",
                "TCGA-02-2485-01A-01D-0784-01",
                "TCGA-06-0151-01A-01D-0236-01"
            ],
            url: "https://s3.amazonaws.com/igv.org.demo/GBM-TP.seg.gz",
            height: 100
        },
        {
            name: "Segmented Copy Number",
            type: "seg",
            format: "seg",
            url: "https://s3.amazonaws.com/igv.org.demo/GBM-TP.seg.gz",
        },
        {
            name: "Indexed",
            type: "seg",
            format: "seg",
            url: "https://s3.amazonaws.com/igv.org.demo/GBM-TP.seg.gz",
            indexURL: "https://s3.amazonaws.com/igv.org.demo/GBM-TP.seg.gz.tbi"
        },
        {
            name: "Indexed with visibility window",
            type: "seg",
            format: "seg",
            url: "https://s3.amazonaws.com/igv.org.demo/GBM-TP.seg.gz",
            indexURL: "https://s3.amazonaws.com/igv.org.demo/GBM-TP.seg.gz.tbi",
            visibilityWindow: "100000000"
        },
    ]
};
igv.createBrowser(igvDiv, options)
    .then(function (browser) {
    console.log("Created IGV browser");
});
