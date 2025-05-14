import type { CreateOpt, TrackLoad, TrackType } from '../js/igv';


import igv from "../dist/igv.esm.min.js"


// Start igv.js and create regions
var options: CreateOpt =
    {
        genome: "hg19",
        locus: "chr17:64,040,802-64,045,633",
        tracks: [
            {
                url: "https://s3.amazonaws.com/igv.org.demo/SKBR3/SKBR3_550bp_pcrFREE_S1_L001_AND_L002_R1_001.101bp.bwamem.ill.mapped.sort.bam.delly_noalt_filtered.vcf.gz",
                type: "variant",
                format: "vcf",
                name: "delly translocations",
                supportsWholeGenome: true,
                visibilityWindow: -1,
                showGenotypes: false,
                height: 40
            },
            {
                url: "https://s3.amazonaws.com/igv.org.demo/SKBR3/SKBR3_550bp_pcrFREE_S1_L001_AND_L002_R1_001.101bp.bwamem.ill.mapped.sort.bam",
                indexURL: "https://s3.amazonaws.com/igv.org.demo/SKBR3/SKBR3_550bp_pcrFREE_S1_L001_AND_L002_R1_001.101bp.bwamem.ill.mapped.sort.bam.bai",
                type: "alignment",
                format: "bam",
                name: "Alignments",
                showMismatches: false,
                height: 500,
                //maxFragmentLength: 1000000,  // 1 mb -- only interested in large deletions
                colorBy: "fragmentLength"
            }
        ]
    }

igv.createBrowser((document.getElementById("igvDiv") as HTMLElement), options)

    .then(async function (browser) {
        const circularViewContainer = (document.getElementById('jbrowse_circular_genome_view') as HTMLElement)
        browser.createCircularView(circularViewContainer, true)

    })

