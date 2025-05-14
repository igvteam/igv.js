import igv from "../js/igv";
const options = {
    genome: "hg19",
    locus: "chr16",
    tracks: [
        {
            type: "cnvpytor",
            name: "HepG2 Pytor",
            url: "https://storage.googleapis.com/cnvpytor_data/HepG2_WGS.pytor",
        }
    ]
};
igv.createBrowser(document.getElementById('igvDiv'), options);
