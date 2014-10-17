// Tests in this file require a server which supports range-byte requests, e.g. Apache.

function runFastaTests() {

    module("Fasta");



//    asyncTest("Fasta index", 5, function () {                         ©
//
//        var sequence = igv.FastaSequence.ance();
//
//        sequence.loadIndex(function (index) {
//
//            ok(index, "Expected non-nil index.  Got: " + index);
//
//            var indexEntry = index["chr22"];
//
//            equal(indexEntry.size, 51304566, "indexEntry size");
//            equal(indexEntry.position, 7, "indexEntry position");
//            equal(indexEntry.basesPerLine, 50, "indexEntry basesPerLine");
//            equal(indexEntry.bytesPerLine, 51, "indexEntry bytesPerLine");
//            start();
//        });
//
//    });

    asyncTest("FastaSequence - Test getSequence", 2, function () {

        var sequence = new igv.FastaSequence("../assets/hg19/hg19.fa");

        // Note -- coordinates are UCSC style
        // chr22:29565177-29565216
        sequence.getSequence("chr22", 29565176, 29565216, function (sequence) {

            ok(sequence, "sequence");

            var expectedSeqString = "CTTGTAAATCAACTTGCAATAAAAGCTTTTCTTTTCTCAA", seqString = sequence.toUpperCase();

            equal(seqString, expectedSeqString);

            start();
        });
    });

    asyncTest("FastaSequence - Test readSequence", 2, function () {

        var sequence = new igv.FastaSequence("../assets/hg19/hg19.fa");

        // Note -- coordinates are UCSC style
        // chr22:29565177-29565216
        sequence.readSequence("chr22", 29565176, 29565216, function (sequence) {

            ok(sequence, "sequence");

            var expectedSeqString = "CTTGTAAATCAACTTGCAATAAAAGCTTTTCTTTTCTCAA", seqString = sequence.toUpperCase();

            equal(seqString, expectedSeqString);

            start();
        });
    });

    asyncTest("FastaSequence - Test readSequence - with unknown sequence", 1, function () {

        var sequence = new igv.FastaSequence("../assets/hg19/hg19.fa");

        // Note -- coordinates are UCSC style
        // chr22:29565177-29565216
        sequence.readSequence("noSuchChromosome", 29565176, 29565216, function (nullSeq) {

            ok(!nullSeq);
            start();
        });
    });

}


