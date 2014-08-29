/**
 * Created by turner on 3/13/14.
 */
function runAlignmentCoverageTests() {

    asyncTest("AlignmentController - FastaSequence - Test getSequence method", 2, function () {

        var str,
            chr = "chr22",
            ss = 24379992,
            ee = 24380390,
            fastaSequence = igv.getFastaSequence("../assets/hg19/hg19.fa");

        fastaSequence.getSequence(chr, ss, ee, function(sequence){

            ok(sequence, "sequence");
            equal(sequence.length, (ee - ss));

            start();

        });

    });

    asyncTest("AlignmentController - Test Sequence Callback", 3, function () {

        var str,
            chr = "chr22",
            ss = 24379992,
            ee = 24380390,
            bamPath = "http://www.broadinstitute.org/igvdata/BodyMap/hg19/IlluminaHiSeq2000_BodySites/brain_merged/accepted_hits.bam",
            bamSource = new igv.BamSource(bamPath, null);

        bamSource.getFeatures(chr, ss, ee, function(alignmentManager) {

            ok(alignmentManager, "alignmentManager");
            ok(alignmentManager.genomicInterval, "alignmentManager.genomicInterval");
            ok(alignmentManager.sequenceSource, "alignmentManager.sequenceSource");

//            alignmentManager.sequenceSource.readSequence(alignmentManager.genomicInterval.chr, alignmentManager.genomicInterval.start, alignmentManager.genomicInterval.end, function(sequence){
//
//                var ssa = igv.numberFormatter(alignmentManager.sequenceSource.interval.start),
//                    ssb = igv.numberFormatter(alignmentManager.sequenceSource.interval.end),
//                    aca = igv.numberFormatter(alignmentManager.genomicInterval.start),
//                    acb = igv.numberFormatter(alignmentManager.genomicInterval.end);
//
//                ok(sequence, "sequence");
//                equal(sequence.length, (alignmentManager.genomicInterval.end - alignmentManager.genomicInterval.start));
//
//                start();
//            });

            start();

        })
    });

//    asyncTest("AlignmentController - Test Block Sequence Creation", 1, function () {
//
//        var str,
//            chr = "chr22",
//            beg = igv.numberUnFormatter("24,375,948"),
//            end = igv.numberUnFormatter("24,384,434"),
//            bamPath = "http://www.broadinstitute.org/igvdata/BodyMap/hg19/IlluminaHiSeq2000_BodySites/brain_merged/accepted_hits.bam",
//        /*bamPath = "../test/data/gstt1_sample.bam",*/
//            bamSource = new igv.BamSource(bamPath, null);
//
//        igv.sequenceSource = igv.getFastaSequence("assets/hg19/hg19.fa");
//
//        bamSource.getFeatures(chr, beg, end, function(alignmentManager) {
//
//            ok(alignmentManager, "alignmentManager");
//
//            alignmentManager.genomicInterval.features.forEach(function(alignment) {
//
//                var lengths, seqs;
//
//                if (alignment.blocks.length == 1) return;
//
//                lengths = "";
//                seqs = "";
//                alignment.blocks.forEach(function(block, index, blocks) {
//
//                    lengths += block.len;
//
//                    seqs += block.seq;
//                    seqs += "(" + block.seq.length + ")";
//
//                    if (blocks.length - 1 === index) {
//                        // do nothing
//                    } else {
//                        seqs += " ";
//                        lengths += " ";
//                    }
//
//                });
//
//                console.log("blocks[" + lengths + "] = " + seqs);
//            });
//
//            start();
//        })
//    });

}
