import type { CreateOpt, TrackLoad, TrackType } from '../js/igv';


//import igv from "https://cdn.jsdelivr.net/npm/igv@2.8.0/dist/igv.esm.min.js";
import igv from "../dist/igv.esm.js"

(async function () {

    const options: CreateOpt =
        {
            showSampleNames: true,
            sampleNameViewportWidth: 200,
            genome: 'hg38',
            tracks: [
                {
                    format: 'maf',
                    type: 'mut',
                    url: 'https://s3.amazonaws.com/igv.org.demo/TCGA.BRCA.mutect.995c0111-d90b-4140-bee7-3845436c3b42.DR-10.0.somatic.maf.gz',
                    height: 700,
                    displayMode: "EXPANDED",
                }
            ]
        }

    const igvDiv = (document.getElementById("igvDiv") as HTMLElement)

    igv.createBrowser(igvDiv, options)
        .then(function (browser) {
            console.log("Created IGV browser")
        })
})()
