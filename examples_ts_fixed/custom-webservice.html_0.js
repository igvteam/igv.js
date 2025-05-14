import igv from "../dist/igv.esm.min.js";
// Simple wervice requiring no query parameter or result mappings.
const cytobands = {
    name: "Cytobands",
    type: "annotation",
    sourceType: "custom",
    displayMode: "COLLAPSED",
    source: {
        url: "https://lk85l6ycte.execute-api.us-east-1.amazonaws.com/dev/testservice/bands?chr=$CHR&start=$START&end=$END",
        contentType: "application/json"
    }
};
const options1 = {
    genome: "hg38",
    locus: "chr1",
    tracks: [
        cytobands
    ]
};
igv.createBrowser(document.getElementById("igvDiv1"), options1)
    .then(function (browser) {
});
// Example using cBio web service - https://www.cbioportal.org/api/swagger-ui.html
// * "function" option used for url -- transforms chr name if neccessary
// * "POST" used to send input parameters
// * cBio json objects transformed to igv requirements for seg track using simple mappings.
const cbio1 = {
    name: "P101MF copy number",
    type: "seg",
    sourceType: "custom",
    displayMode: "FILL",
    source: {
        url: function (options) {
            const chr = options.chr.startsWith("chr") ? options.chr.substring(3) : options.chr;
            return `https://www.cbioportal.org/api/copy-number-segments/fetch?chromosome=${chr}&projection=SUMMARY`;
        },
        method: "POST",
        contentType: "application/json",
        body: JSON.stringify([{
                sampleId: "PT101MF",
                studyId: "sarc_mskcc"
            }]),
        mappings: {
            chr: "chromosome",
            value: "segmentMean",
            sampleKey: "uniqueSampleKey",
            sample: "sampleId"
        }
    }
};
const options2 = {
    genome: "hg38",
    locus: "chr1",
    tracks: [
        cbio1
    ]
};
igv.createBrowser(document.getElementById("igvDiv2"), options2)
    .then(function (browser) {
});
