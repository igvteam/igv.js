import type { CreateOpt, TrackLoad, TrackType } from '../js/igv';


import igv from "../dist/igv.esm.min.js"

const div = (document.getElementById("myDiv") as HTMLElement)

igv
    .createBrowser(div, {
        genome: "hg19",
        queryParametersSupported: true
    })
    .then(function (browser) {
        console.log("Browser ready")
    })

