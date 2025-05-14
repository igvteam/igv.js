import igv from "../dist/igv.esm.min.js";
const igvDiv = document.getElementById("igv-div");
const options = {
    search: {
        url: 'https://rest.ensembl.org/lookup/symbol/macaca_fascicularis/$FEATURE$?content-type=application/json',
        chromosomeField: 'seq_region_name',
        displayName: 'display_name'
    },
    reference: {
        id: "Macaca_fascicularis_5.0",
        fastaURL: "https://s3.amazonaws.com/igv.org.genomes/Macaca_fascicularis_5.0/Macaca_fascicularis.Macaca_fascicularis_5.0.dna.toplevel.fa",
        indexURL: "https://s3.amazonaws.com/igv.org.genomes/Macaca_fascicularis_5.0/Macaca_fascicularis.Macaca_fascicularis_5.0.dna.toplevel.fa.fai"
    },
    tracks: [
        {
            name: "Annotations",
            type: "annotation",
            format: "gtf",
            url: 'https://s3.amazonaws.com/igv.org.genomes/Macaca_fascicularis_5.0/Macaca_fascicularis.Macaca_fascicularis_5.0.100.gtf.gz',
            indexURL: 'https://s3.amazonaws.com/igv.org.genomes/Macaca_fascicularis_5.0/Macaca_fascicularis.Macaca_fascicularis_5.0.100.gtf.gz.tbi',
        }
    ]
};
igv.createBrowser(igvDiv, options)
    .then(function (browser) {
    console.log("Created IGV browser");
});
