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

    function handleError(error) {
        console.log(error);
        fail();
    }

    asyncTest("FastaSequence - Test fasata with no index", 1, function () {

        var sequence = new igv.FastaSequence(
            {
                fastaURL: "data/fasta/test.fasta",
                indexed: false
            }
        );

        sequence.init().then(function () {

            // Note -- coordinates are UCSC style
            // chr22:29565177-29565216
            var expectedSequence = "GCTGC";
            sequence.getSequence("CACNG6--RPLP2", 60, 65).then(function (seq) {

                equal(seq, expectedSequence);
                start();
            }).catch(function (error) {
                console.log(error);
            })
        }).catch(handleError)
    })

    asyncTest("FastaSequence - Test getSequence", 2, function () {

        var sequence = new igv.FastaSequence({fastaURL: "http://data.broadinstitute.org/igvdata/test/data/fasta/chr22.fa"});

        sequence.init().then(function () {

            // Note -- coordinates are UCSC style
            // chr22:29565177-29565216
            sequence.getSequence("chr22", 29565176, 29565216).then(function (sequence) {

                ok(sequence, "sequence");

                var expectedSeqString = "CTTGTAAATCAACTTGCAATAAAAGCTTTTCTTTTCTCAA", seqString = sequence.toUpperCase();

                equal(seqString, expectedSeqString);

                start();
            })
        }).catch(handleError)
    })

    asyncTest("FastaSequence - Test readSequence", 2, function () {

        var sequence = new igv.FastaSequence({fastaURL: "http://data.broadinstitute.org/igvdata/test/data/fasta/chr22.fa"});

        sequence.init().then(function () {

            // Note -- coordinates are UCSC style
            // chr22:29565177-29565216
            sequence.readSequence("chr22", 29565176, 29565216).then(function (sequence) {

                ok(sequence, "sequence");

                var expectedSeqString = "CTTGTAAATCAACTTGCAATAAAAGCTTTTCTTTTCTCAA", seqString = sequence.toUpperCase();

                equal(seqString, expectedSeqString);

                start();
            }).catch(handleError)
        })
    })

    asyncTest("FastaSequence - Test readSequence - with unknown sequence", 1, function () {

        var sequence = new igv.FastaSequence({fastaURL: "http://data.broadinstitute.org/igvdata/test/data/fasta/chr22.fa"});

        sequence.init().then(function () {

            // Note -- coordinates are UCSC style
            // chr22:29565177-29565216
            sequence.readSequence("noSuchChromosome", 29565176, 29565216).then(function (nullSeq) {

                ok(!nullSeq);
                start();
            }).catch(function (error) {
                console.log(error);
            })
        }).catch(handleError)
    })

}


