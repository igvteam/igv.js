/**
 * Created by turner on 3/13/14.
 */
function runAlignmentCoverageTests() {

    asyncTest("FastaSequence - test getSequence method", function () {

        var chr = "chr22",
            ss = 29565176,
            ee = 29565216,
            fastaSequence;

        fastaSequence = new igv.FastaSequence("http://dn7ywbm9isq8j.cloudfront.net/genomes/seq/hg19/hg19.fasta");
        ok(fastaSequence);

        fastaSequence.getSequence(chr, ss, ee, function(sequence){

            ok(sequence, "sequence");
            //equal(sequence.length, (ee - ss));

            start();

        }, undefined);

    });

    asyncTest("AlignmentController - test BAM feature source get features", function () {

        var bamSource;

        igv.sequenceSource = new igv.FastaSequence("//igvdata.broadinstitute.org/genomes/seq/hg19/hg19.fasta");

        bamSource = new igv.BamSource({
            type: 'bam',
            url: 'http://www.broadinstitute.org/igvdata/1KG/b37/data/NA06984/alignment/NA06984.mapped.ILLUMINA.bwa.CEU.low_coverage.20120522.bam',
            label: 'NA06984'});

        bamSource.getFeatures("chr22", 24379992, 24380390, function(genomicInterval) {

            ok(genomicInterval, "genomicInterval");
            ok(genomicInterval.chr, "genomicInterval.chr");
            ok(genomicInterval.sequence, "genomicInterval.sequence");
            ok(genomicInterval.coverageMap, "genomicInterval.coverageMap");

            igv.sequenceSource.readSequence(genomicInterval.chr, genomicInterval.start, genomicInterval.end, function(sequence){

                ok(sequence, "sequence");
                equal(sequence.length, (genomicInterval.end - genomicInterval.start));

                start();
            }, undefined);

        }, undefined)
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
