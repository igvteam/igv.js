import type { CreateOpt, TrackLoad, TrackType } from '../js/igv';


import igv from "../dist/igv.esm.js";

const tracks: TrackLoad<TrackType>[] = [
    {
        type: 'merged',
        name: 'Splice Junctions',
        height: 150,
        tracks: [
            {
                type: 'junction',
                name: 'Junctions',
                format: 'bed',
                url: `https://www.dropbox.com/s/nvmy55hhe24plpv/splice_junction_track_test_cases_sampleA.chr15-92835700-93031800.SJ.out.bed.gz?dl=0`,
                indexURL: `https://www.dropbox.com/s/iv5tcg3t8v3xu23/splice_junction_track_test_cases_sampleA.chr15-92835700-93031800.SJ.out.bed.gz.tbi?dl=0`,
                displayMode: 'COLLAPSED',
                minUniquelyMappedReads: 1,
                minTotalReads: 1,
                maxFractionMultiMappedReads: 1,
                minSplicedAlignmentOverhang: 0,
                thicknessBasedOn: 'numUniqueReads', //options: numUniqueReads (default), numReads, isAnnotatedJunction
                bounceHeightBasedOn: 'random', //options: random (default), distance, thickness
                colorBy: 'isAnnotatedJunction', //options: numUniqueReads (default), numReads, isAnnotatedJunction, strand, motif
                labelUniqueReadCount: true,
                labelMultiMappedReadCount: true,
                labelTotalReadCount: false,
                labelMotif: false,
                labelIsAnnotatedJunction: " [A]",
                hideAnnotatedJunctions: false,
                hideUnannotatedJunctions: false,
                hideMotifs: ['GT/AT', 'non-canonical'], //options: 'GT/AG', 'CT/AC', 'GC/AG', 'CT/GC', 'AT/AC', 'GT/AT', 'non-canonical'
            },
            {
                type: 'wig',
                name: 'Coverage',
                format: "bigwig",
                url: 'https://www.dropbox.com/s/8j2uf0hsqprusnc/splice_junction_track_test_cases_sampleA.chr15-92835700-93031800.bigWig?dl=0',
            }
        ]
    }
]

var options: CreateOpt = {
    locus: 'chr15:92835700-93031800',
    genome: 'hg38',
    tracks: tracks,
};

var igvDiv = (document.getElementById("igv-div") as HTMLElement);

igv.createBrowser(igvDiv, options)
    .then(function (browser) {
        console.log("Created IGV browser");
    })
