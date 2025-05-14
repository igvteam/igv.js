import type { CreateOpt, TrackLoad, TrackType } from '../js/igv';


import igv from "../dist/igv.esm.min.js"

const options: CreateOpt =
    {
        locus: "chr1:155,160,475-155,184,282",
        genome: "hg19"
    }

const igvDiv = (document.getElementById('igvDiv') as HTMLElement)

const browser = await igv.createBrowser(igvDiv, options)


// Add the menu items
const tracks: TrackLoad<TrackType>[] = [
    {
        url: 'https://s3.amazonaws.com/igv.org.demo/GBM-TP.seg.gz',
        name: 'GBM Copy # (TCGA Broad GDAC)'
    },
    {
        type: 'annotation',
        format: 'bed',
        url: 'https://data.broadinstitute.org/igvdata/annotations/hg19/dbSnp/snp137.hg19.bed.gz',
        indexURL: 'https://data.broadinstitute.org/igvdata/annotations/hg19/dbSnp/snp137.hg19.bed.gz.tbi',
        visibilityWindow: 200000,
        name: 'dbSNP 137'
    },
    {
        type: 'wig',
        format: 'bigwig',
        url: 'https://s3.amazonaws.com/igv.broadinstitute.org/data/hg19/encode/wgEncodeBroadHistoneGm12878H3k4me3StdSig.bigWig',
        name: 'Gm12878H3k4me3'
    },
    {
        type: 'alignment',
        format: 'bam',
        url: 'https://1000genomes.s3.amazonaws.com/phase3/data/HG02450/alignment/HG02450.mapped.ILLUMINA.bwa.ACB.low_coverage.20120522.bam',
        indexURL: 'https://1000genomes.s3.amazonaws.com/phase3/data/HG02450/alignment/HG02450.mapped.ILLUMINA.bwa.ACB.low_coverage.20120522.bam.bai',
        name: 'HG02450'
    }
]

const menu = (document.getElementById("track-menu") as HTMLElement)
for (let config of tracks) {
    const a = document.createElement("a")
    a.setAttribute("href", "#")
    a.addEventListener('click', () => browser.loadTrack(config))
    a.innerText = config.name
    const li = document.createElement("li")
    li.appendChild(a)
    menu.appendChild(li)
}

