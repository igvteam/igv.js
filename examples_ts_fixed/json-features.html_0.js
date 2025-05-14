import igv from "../dist/igv.esm.min.js";
var igvDiv = document.getElementById("igvDiv");
var options = {
    genome: "hg19",
    locus: 'chr1:629,422-16,522,294',
    tracks: [
        {
            name: "Copy number",
            type: "seg",
            displayMode: "EXPANDED",
            features: [
                {
                    "chr": "1",
                    "start": 3218610,
                    "end": 4749076,
                    "value": -0.2239,
                    "sample": "TCGA-OR-A5J2-01"
                },
                {
                    "chr": "1",
                    "start": 4750119,
                    "end": 11347492,
                    "value": -0.8391,
                    "sample": "TCGA-OR-A5J2-01"
                }
            ]
        },
        {
            name: "Annotations",
            type: "annotation",
            displayMode: "EXPANDED",
            features: [
                {
                    "chr": "1",
                    "start": 3218610,
                    "end": 4749076,
                    "value": -0.2239,
                    "color": "blue",
                    "name": "Blue"
                },
                {
                    "chr": "1",
                    "start": 4750119,
                    "end": 11347492,
                    "value": -0.8391,
                    "color": "green",
                    "name": "Green"
                }
            ]
        },
        {
            name: "Wig",
            type: "wig",
            displayMode: "EXPANDED",
            features: [
                {
                    "chr": "1",
                    "start": 3218610,
                    "end": 4749076,
                    "value": -0.2239
                },
                {
                    "chr": "1",
                    "start": 4750119,
                    "end": 11347492,
                    "value": -0.8391
                }
            ]
        },
    ]
};
igv.createBrowser(igvDiv, options)
    .then(function (browser) {
    console.log("Created IGV browser");
});
