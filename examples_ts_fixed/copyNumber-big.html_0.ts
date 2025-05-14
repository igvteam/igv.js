import type { CreateOpt, TrackLoad, TrackType } from '../js/igv';


import igv from "../dist/igv.esm.min.js"

var options: CreateOpt =
    {
        "reference": {
            "id": "hg19",
            "name": "Human (CRCh37/hg19)",
            "fastaURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg19/hg19.fasta",
            "indexURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg19/hg19.fasta.fai",
            "cytobandURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg19/cytoBand.txt"
        },
        tracks: [
            {
                "name": "broad.mit.edu_PANCAN_Genome_Wide_SNP_6_whitelisted.seg",
                "filename": "broad.mit.edu_PANCAN_Genome_Wide_SNP_6_whitelisted.seg",
                "format": "seg",
                "url": "https://igv.genepattern.org/test/seg/broad.mit.edu_PANCAN_Genome_Wide_SNP_6_whitelisted.seg.gz",
                "indexed": false,
                "sourceType": "file",
                "type": "seg",
                "height": 800,
                "displayMode": "FILL",
                "order": 3
            }
        ]
    }

var igvDiv = (document.getElementById("igvDiv") as HTMLElement);

igv.createBrowser(igvDiv, options)
    .then(function (browser) {
        console.log("Created IGV browser");
        (window as any).igvBrowser = browser;
    })

