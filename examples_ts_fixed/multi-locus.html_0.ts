import type { CreateOpt, TrackLoad, TrackType } from '../js/igv';


import igv from '../js/index.js'

(async () => {

    const options: CreateOpt =
        {
            genome: "hg19",
            locus: ['myc', 'chr1:155,157,300-155,163,706', 'myc'],
            tracks: [
                {
                    type: 'alignment',
                    format: 'bam',
                    url: 'https://1000genomes.s3.amazonaws.com/phase3/data/HG01879/exome_alignment/HG01879.mapped.ILLUMINA.bwa.ACB.exome.20120522.bam',
                    indexURL: 'https://1000genomes.s3.amazonaws.com/phase3/data/HG01879/exome_alignment/HG01879.mapped.ILLUMINA.bwa.ACB.exome.20120522.bam.bai',
                    name: 'HG01879'
                }

            ]
        }

    const browser = await igv.createBrowser((document.getElementById('igv-div') as HTMLElement), options)
    console.log(`${browser.guid} is good to go`)

})()
