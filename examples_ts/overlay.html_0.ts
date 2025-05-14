import type { CreateOpt, TrackLoad, TrackType } from '../js/igv';


import igv from "../dist/igv.esm.js"

const config  =
    {
        genome: "hg19",
        locus: "chr4:40,174,668-40,221,204",
        tracks: [
            {
                name: "Merged - autoscaled",
                type: "merged",
                autoscale: true,
                tracks: [
                    {
                        "type": "wig",
                        "format": "bigwig",
                        "url": "https://www.encodeproject.org/files/ENCFF000ASJ/@@download/ENCFF000ASJ.bigWig",
                        "color": "red"
                    },
                    {
                        "type": "wig",
                        "format": "bigwig",
                        "url": "https://www.encodeproject.org/files/ENCFF351WPV/@@download/ENCFF351WPV.bigWig",
                        "color": "green"
                    }
                ]
            },
            {
                name: "Merged - fixed scale",
                type: "merged",
                min: 0,
                max: 100,
                tracks: [
                    {
                        "type": "wig",
                        "format": "bigwig",
                        "url": "https://www.encodeproject.org/files/ENCFF000ASJ/@@download/ENCFF000ASJ.bigWig",
                        "color": "red"
                    },
                    {
                        "type": "wig",
                        "format": "bigwig",
                        "url": "https://www.encodeproject.org/files/ENCFF351WPV/@@download/ENCFF351WPV.bigWig",
                        "color": "green"
                    }
                ]
            }
        ]
    }

var igvDiv = (document.getElementById("igvDiv") as HTMLElement)

igv.createBrowser(igvDiv, config)
    .then(function (browser) {
        console.log("Created IGV browser")
    })

