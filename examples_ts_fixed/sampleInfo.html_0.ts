import type { CreateOpt, TrackLoad, TrackType } from '../js/igv';


import igv from "../dist/igv.esm.min.js"

const config1 =
    {
        "genome": "hg19",
        "locus": "chr7:52,338,217-57,756,711",
        "sampleinfo": [
            {
                "url": "https://igv-genepattern-org.s3.amazonaws.com/demo/GBM-sampletable-samplemapping-colors.txt"
            }
        ],
        "tracks": [
            {
                "url": "https://igv-genepattern-org.s3.amazonaws.com/demo/GBMCopyNumber.seg.gz",
                "name": "GBM Copy Number",
                "order": 1,
                "format": "seg",
                "type": "seg",
                "height": 250,
                "displayMode": "SQUISHED",
                "sort": {
                    "option": "ATTRIBUTE",
                    "attribute": "Subtype",
                    "direction": "ASC"
                }
            }
        ]
    }

const config2 =
    {
        "genome": "hg38",
        "locus": "chr22:36,655,100-36,656,060",
        "sampleinfo": [
            {
                "type": "sampleinfo",
                "url": "https://www.dropbox.com/scl/fi/daqluy7vom9avohigi0b5/integrated_call_samples_v3.20130502.ALL.panel?rlkey=v8pn4egvgku0pcvkpg5bwgm3t&st=thwap65c&dl=0"
            }
        ],
        "tracks": [
            {
                "url": "https://www.dropbox.com/scl/fi/i6u9o4a92iyceb77wyqma/ALL.apol1.sample.phase3_shapeit2_mvncall_integrated_v5a.20130502.genotypes.vcf?rlkey=ndjjoliqkax9vqsjvw8waj8uz&dl=0",
                "filename": "ALL.apol1.sample.phase3_shapeit2_mvncall_integrated_v5a.20130502.genotypes.vcf",
                "name": "ALL.apol1.sample.phase3_shapeit2_mvncall_integrated_v5a.20130502.genotypes.vcf",
                "order": 0,
                "format": "vcf",
                "type": "variant",
                "height": 250,
                "color": "rgb(0,0,150)"
            }
        ]
    }

const igvDiv1 = (document.getElementById("igv-div1") as HTMLElement)
igv.createBrowser(igvDiv1, config1)

const igvDiv2 = (document.getElementById("igv-div2") as HTMLElement)
igv.createBrowser(igvDiv2, config2)

