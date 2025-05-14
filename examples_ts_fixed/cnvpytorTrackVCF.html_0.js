import igv from "../js/igv";
const options = {
    genome: "hg19",
    locus: "chr16",
    tracks: [
        {
            type: "cnvpytor",
            name: "HepG2 VCF",
            url: "https://storage.googleapis.com/cnvpytor_data/HepG2.vcf.gz",
        }
    ]
};
igv.createBrowser(document.getElementById('igvDiv'), options);
