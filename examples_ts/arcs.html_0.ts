import type { CreateOpt, TrackLoad, TrackType } from '../js/igv';


import igv from '../js/igv'

// BEDPE examples
const options: CreateOpt =
    {
        reference: {
            "id": "hg19",
            "name": "Human (CRCh37/hg19)",
            "fastaURL": "https://s3.dualstack.us-east-1.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg19/hg19.fasta",
            "indexURL": "https://s3.dualstack.us-east-1.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg19/hg19.fasta.fai",
            "cytobandURL": "https://s3.dualstack.us-east-1.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg19/cytoBand.txt"
        },
        locus: "chr2:65,222,853-65,826,902",
        tracks: [
            {
                url: "https://s3.amazonaws.com/igv.org.demo/GSM1872886_GM12878_CTCF_PET.bedpe.txt",
                type: "interaction",
                format: "bedpe",
                name: "bedpe - proportional",
                arcType: "proportional",
                color: "rgb(0,200,0)",
                alpha: "0.05",
                logScale: true,
                showBlocks: true,
                max: 80,
                visibilityWindow: 10000000,
                height: 100
            },
            {
                "name": "GM12878 CTCF ",
                "url": "https://www.encodeproject.org/files/ENCFF000ARJ/@@download/ENCFF000ARJ.bigWig",
                "format": "bigwig",
                "type": "wig",
                "color": "black",
                "height": 50,
            },
            {
                url: "https://s3.amazonaws.com/igv.org.demo/GSM1872886_GM12878_CTCF_PET.bedpe.txt",
                type: "interaction",
                format: "bedpe",
                name: "bedpe - nested",
                arcType: "nested",
                arcOrientation: false,
                color: "blue",
                showBlocks: true,
                visibilityWindow: 10000000,
                height: 100
            }
        ]
    };

igv.createBrowser((document.getElementById("igvDiv") as HTMLElement), options);

// UCSC interact format examples
const options2: CreateOpt =
    {
        genome: "hg19",
        locus: "chr3:63,712,533-64,693,448",
        tracks: [
            {
                url: "https://s3.amazonaws.com/igv.org.demo/interactExample2.txt",
                type: "interaction",
                format: "interact",
                name: "UCSC Example 2 - nested arcs, useScore",
                arcType: "nested",
                useScore: true,
                showBlocks: true,
                height: 75
            },
            {
                url: "https://s3.amazonaws.com/igv.org.demo/interactExample2.txt",
                type: "interaction",
                format: "interact",
                name: "UCSC Example 2 - proportional arcs",
                arcType: "proportional",
                showBlocks: true,
                height: 75
            },
            {
                url: "https://s3.amazonaws.com/igv.org.demo/interactExample3.inter.bb",
                type: "interaction",
                format: "bb",
                name: "UCSC Example 3 - bigInteract",
                arcType: "nested",
                useScore: true,
                showBlocks: true,
                height: 100
            }
        ]
    };

igv.createBrowser((document.getElementById("igvDiv2") as HTMLElement), options2);

