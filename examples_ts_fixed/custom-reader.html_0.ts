import type { CreateOpt, TrackLoad, TrackType } from '../js/igv';


import igv from "../dist/igv.esm.min.js"

document.addEventListener("DOMContentLoaded", function () {

    /**
     * A custom feature reader implementation
     * Required methods:
     *    constructor
     *    readFeatures
     */
    class CytobandReader {
        constructor(config) {
        }
        async readFeatures(chr, start, end) {

            const response = await fetch(`https://lk85l6ycte.execute-api.us-east-1.amazonaws.com/dev/testservice/bands?chr=${chr}&start=${start}&end=${end}`,
                {
                    headers: { 'Content-Type': 'application/json' }
                }
            );
            return response.json();
        }
    }


    const config: CreateOpt = {
        genome: "hg38",
        locus: "chr1",
        tracks: [
            {
                name: "Cytobands",
                type: "annotation",
                displayMode: "collapsed",
                reader: new CytobandReader({})
            }
        ]
    }

    const igvDiv = document.getElementById("igvDiv");

    igv.createBrowser(igvDiv, config)
        .then(function (b) {
            console.log("IGV browser created");
        })
})
