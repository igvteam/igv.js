import igv from "../dist/igv.esm.min.js";
const div = document.getElementById("myDiv");
igv
    .createBrowser(div, {
    genome: "hg19",
    queryParametersSupported: true
})
    .then(function (browser) {
    console.log("Browser ready");
});
