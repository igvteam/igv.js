import type { CreateOpt, TrackLoad, TrackType } from '../js/igv';


import igv from "../dist/igv.esm.min.js"

var options: CreateOpt =
{
    showNavigation: true,
    locus: "chr1:155,160,475-155,184,282",
    genome: "hg19",

}


igv.createBrowser(document.getElementById("igvDiv"), options)

    .then(function (browser) {

        var genesInList: { [key: string]: boolean } = {}

        browser.on('trackclick', function (track, popoverData) {
            var symbol = null
            popoverData.forEach(function (nameValue) {
                if (nameValue.name && nameValue.name.toLowerCase() === 'name') {
                    symbol = nameValue.value
                }
            })

            if (symbol && !genesInList[symbol]) {
                genesInList[symbol] = true
            }

            // Prevent default pop-over behavior
            return false
        })
    })

