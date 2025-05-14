import type { CreateOpt, TrackLoad, TrackType } from '../js/igv';


import igv from "../dist/igv.esm.min.js"

const options: CreateOpt =
    {
        // Example of fully specifying a reference .  We could alternatively use  "genome: 'hg19'"
        reference:
            {
                id: "hg19",
                fastaURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/1kg_v37/human_g1k_v37_decoy.fasta",
                cytobandURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/b37/b37_cytoband.txt"
            },
        locus: "8:128,750,948-128,751,025",
        tracks:
            [
                {
                    name: "Phase 3 WGS variants",
                    type: "variant",
                    format: "vcf",
                    url: "https://s3.amazonaws.com/1000genomes/release/20130502/ALL.wgs.phase3_shapeit2_mvncall_integrated_v5b.20130502.sites.vcf.gz",
                    indexURL: "https://s3.amazonaws.com/1000genomes/release/20130502/ALL.wgs.phase3_shapeit2_mvncall_integrated_v5b.20130502.sites.vcf.gz.tbi"
                },
                {
                    type: 'alignment',
                    format: 'cram',
                    url: 'https://s3.amazonaws.com/1000genomes/phase3/data/HG00096/exome_alignment/HG00096.mapped.ILLUMINA.bwa.GBR.exome.20120522.bam.cram',
                    indexURL: 'https://s3.amazonaws.com/1000genomes/phase3/data/HG00096/exome_alignment/HG00096.mapped.ILLUMINA.bwa.GBR.exome.20120522.bam.cram.crai',
                    name: 'HG00096',
                    sort: {
                        chr: "chr8",
                        position: 128750986,
                        option: "BASE",
                        direction: "ASC"
                    },
                    height: 600
                },

                {
                    name: "Genes",
                    type: "annotation",
                    format: "bed",
                    url: "https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg19/genes/refGene.hg19.bed.gz",
                    indexURL: "https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg19/genes/refGene.hg19.bed.gz.tbi",
                    order: Number.MAX_VALUE,
                    visibilityWindow: 300000000,
                    displayMode: "EXPANDED"
                }
            ]

    }

var igvDiv = (document.getElementById("igvDiv") as HTMLElement)

igv.createBrowser(igvDiv, options)
    .then(function (browser) {
        console.log("Created IGV browser")
    })
