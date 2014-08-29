/**
 * Created by turner on 2/24/14.
 */
function runBAMTrackTests() {

    module("BAM");

    // Setup "mock" objects
    if(!igv) igv = {};
    igv.sequenceSource = igv.getFastaSequence("../assets/hg19/hg19.fa");

    var bamPath = "../test/data/gstt1_sample.bam";

    /*
     First alignment details -- from IGV
     ----------------------
     Read name = HWI-BRUNOP16X_0001:7:27:7557:21734#0
     Location = chr22:24,376,205
     AlignmentManager start = 24,376,181 (+)
     Cigar = 75M
     Mapped = yes
     Mapping quality = 255
     ----------------------
     Base = A
     Base phred quality = 70
     ----------------------
     NH = 1
     NM = 0
     -------------------
     AlignmentManager start position = chr22:24376181
     AATCAAAATGAAATGCAGTGATTAAAGGACACAAGGCCTCAGTGTGCATCATTCTCATTGTGGCTTTCAGGCGGC
     */

    asyncTest("bam source", 2, function () {

        var echoAlignment = function (alignment, index, alignments) {

            if (index > 500) return;
            console.log("start " + igv.numberFormatter(alignment.start) + " seq.length " + alignment.seq.length  + " lengthOnRef " + alignment.lengthOnRef + " strand " + alignment.strand);
        };




        // this returns 1160 alignments
        var chr = "chr22",
            beg = /*igv.numberUnFormatter("24,375,000")*/igv.numberUnFormatter("24,371,000"),
            end = /*igv.numberUnFormatter("24,379,000")*/igv.numberUnFormatter("24,383,000"),
            alignment,
            bamTrack = new igv.BAMTrack(bamPath);

        bamTrack.featureSource.getFeatures(chr, beg, end, function(alignments) {

            ok(alignments, "alignments");
            equal(alignments.length, 1660, "alignments.length");

            alignments.forEach(echoAlignment);

            alignment = alignments[0];
            equal(alignment.cigar,"75M",  "Cigar");
            equal(alignment.chr, "chr22", "Chromosome");

            equal(alignment.start, igv.numberUnFormatter("24,376,180"), "Position");  // leftmost position ("0" based)

            equal(alignment.strand, true, "Strand");  // true == positive
            equal(alignment.seq.length, 75, "Sequence length");
            equal("AATCAAAATGAAATGCAGTGATTAAAGGACACAAGGCCTCAGTGTGCATCATTCTCATTGTGGCTTTCAGGCGGC", alignment.seq, "alignment.seq");

            start();
        });

    });

}
