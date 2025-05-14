import igv from "../dist/igv.esm.min.js";
var options = {
    showNavigation: true,
    locus: "chr1:155,160,475-155,184,282",
    genome: "hg19",
};
var igv_custom_track_click = $('#igv-custom-track-click');
igv.createBrowser(igv_custom_track_click.get(0), options)
    .then(function (browser) {
    var genesInList = {};
    browser.on('trackclick', function (track, popoverData) {
        var symbol = null;
        popoverData.forEach(function (nameValue) {
            if (nameValue.name && nameValue.name.toLowerCase() === 'name') {
                symbol = nameValue.value;
            }
        });
        if (symbol && !genesInList[symbol]) {
            genesInList[symbol] = true;
            $("#geneList").append('<li><a href="https://uswest.ensembl.org/Multi/Search/Results?q=' + symbol + '">' + symbol + '</a></li>');
        }
        // Prevent default pop-over behavior
        return false;
    });
});
